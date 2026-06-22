import { describe, it, expect } from 'vitest';
import { calculateContextTokens, compactIfNeeded } from './conversation-compaction.js';

const OVERHEAD_TOKENS = 6500;
const IMAGE_TOKEN_ESTIMATE = 800;
const noopLog = async () => {};

describe('calculateContextTokens', () => {
  it('returns just the overhead for an empty conversation', () => {
    expect(calculateContextTokens([])).toBe(OVERHEAD_TOKENS);
    expect(calculateContextTokens([], false)).toBe(0);
  });

  it('estimates string content at ~3.2 chars/token', () => {
    const tokens = calculateContextTokens([{ role: 'user', content: 'x'.repeat(32) }], false);
    expect(tokens).toBe(Math.ceil(32 / 3.2)); // 10
  });

  it('counts image blocks with a flat estimate', () => {
    const tokens = calculateContextTokens(
      [{ role: 'user', content: [{ type: 'image', source: {} }] }],
      false,
    );
    expect(tokens).toBe(IMAGE_TOKEN_ESTIMATE);
  });
});

describe('compactIfNeeded', () => {
  it('returns the conversation unchanged when below the threshold', async () => {
    const messages = [{ role: 'user', content: 'short task' }];
    const result = await compactIfNeeded(messages, async () => 'summary', noopLog);
    expect(result).toBe(messages); // same reference, no work done
  });

  it('produces a valid user-first conversation even when summarization fails (DEF-004)', async () => {
    // Build a conversation large enough to exceed COMPACTION_THRESHOLD (170k tokens).
    const big = 'a'.repeat(40000); // ~12.5k tokens each
    const messages = Array.from({ length: 16 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `${big} ${i}`,
    }));
    expect(calculateContextTokens(messages)).toBeGreaterThan(170000);

    // Force the summarization LLM call to fail so the emergency path runs.
    const failingLLM = async () => {
      throw new Error('summarizer unavailable');
    };
    const result = await compactIfNeeded(messages, failingLLM, noopLog);

    // The Anthropic API requires the first message to have role "user".
    expect(result[0].role).toBe('user');
    expect(result.length).toBeLessThan(messages.length);
  });
});
