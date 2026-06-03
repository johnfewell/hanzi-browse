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

  it('emits the directives for non-Claude models too', () => {
    // The behavior block is model-agnostic; only the identity marker is gated.
    const text = promptText({ isClaudeModel: false });

    expect(text).toContain('read_page returns text only — no screenshot');
    expect(text).toContain('Reserve screenshots for explicit visual inspection');
  });
});
