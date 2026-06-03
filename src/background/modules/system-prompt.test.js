import { describe, expect, it } from 'vitest';

import { buildSystemPrompt } from './system-prompt.js';

// Flatten every text block the builder emits into one string for assertions.
const promptText = (options) =>
  buildSystemPrompt(options)
    .map((block) => block.text || '')
    .join('\n');

describe('buildSystemPrompt — vision de-biasing (REQ-008)', () => {
  // These directives exist to stop the model from defaulting to screenshots,
  // which dominated LLM turn cost. Each assertion guards a specific regression:
  // if someone re-introduces a screenshot-first instruction, a test must fail.

  it('describes read_page as a text/DOM tool, never as returning a screenshot', () => {
    const text = promptText();

    expect(text).toContain('read_page');
    expect(text).toContain('read_page returns text only — no screenshot');
    // The old prompt falsely claimed read_page returns "a screenshot"; the tool
    // (read-page-core.js) returns only { output }. That false claim biased the
    // model toward vision. It must not come back.
    expect(text).not.toMatch(/read_page[^.]*\band a screenshot\b/i);
  });

  it('reserves screenshots for explicit visual inspection', () => {
    const text = promptText();

    expect(text).toContain('Reserve screenshots for explicit visual inspection');
  });

  it('prefers bulk reads over scroll-peeking long pages', () => {
    const text = promptText();

    expect(text).toMatch(/does NOT scroll repeatedly/i);
    expect(text).toContain('get_page_text');
    expect(text).toContain('read_page');
  });

  it('routes long/virtualized lists to collect_page_text (REQ-007 / PAT-001)', () => {
    // The whole point of the collector is to replace manual scroll+read loops on
    // long lists; the prompt must actively steer the agent to it.
    const text = promptText();

    expect(text).toContain('collect_page_text');
    expect(text).toMatch(/newest N items of a chat.*direction "up"/s);
  });

  it('emits the directives for non-Claude models too', () => {
    // The behavior block is model-agnostic; only the identity marker is gated.
    const text = promptText({ isClaudeModel: false });

    expect(text).toContain('read_page returns text only — no screenshot');
    expect(text).toContain('Reserve screenshots for explicit visual inspection');
  });
});

describe('buildSystemPrompt — turn density (REQ-003 / REQ-006)', () => {
  // Phase 2 cuts the number and cost of turns. These directives are what make
  // the agent stop narrating every step and start batching known work; if they
  // regress, turn count climbs back up and a test must catch it.

  it('limits per-turn narration to keep tool turns cheap (REQ-003)', () => {
    const text = promptText();

    // The 120-char ceiling on action-turn narration is the concrete, testable
    // form of AC-008. Loosening it (or dropping the directive) is a regression.
    expect(text).toContain('Do NOT narrate every step');
    expect(text).toContain('under 120 characters');
  });

  it('instructs batching independent actions into one turn (REQ-006)', () => {
    const text = promptText();

    expect(text).toContain('Batch independent actions into one turn');
    // AC-009: a known multi-field form should batch form_input calls, then
    // verify once — not read after every field.
    expect(text).toMatch(/several "form_input" calls.*SINGLE response|form_input.*at once/s);
    expect(text).toMatch(/do not read after each field/i);
  });

  it('forbids batching content composition with its submission (safety)', () => {
    const text = promptText();

    // Compose and Send must stay separate turns so we never fire off
    // half-written content. This guard must not be weakened.
    expect(text).toContain('NEVER batch content composition with its submission');
    expect(text).toMatch(/compose, verify the text landed, then send/i);
  });
});
