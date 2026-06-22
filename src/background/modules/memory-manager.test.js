import { describe, it, expect, vi } from 'vitest';

// Replace the api module so importing memory-manager does not pull in Chrome-only
// code, and so summarization can be controlled in tests.
vi.mock('./api.js', () => ({ callLLMSimple: vi.fn(async () => 'SUMMARY') }));

import { manageMemory, getMemoryStats, clearMemory } from './memory-manager.js';

const msg = (role, content) => ({ role, content });

describe('manageMemory thresholds', () => {
  it('returns the conversation unchanged when at/under maxMessages', async () => {
    const messages = [msg('user', 'a'), msg('assistant', 'b')];
    const result = await manageMemory(messages, { maxMessages: 40 });
    expect(result).toBe(messages);
  });

  it('does not summarize when the middle section is too small', async () => {
    // 12 messages, recentCount 15 -> middle is empty -> below MIN_MESSAGES_TO_SUMMARIZE
    const messages = Array.from({ length: 12 }, (_, i) => msg(i % 2 ? 'assistant' : 'user', `m${i}`));
    const result = await manageMemory(messages, { maxMessages: 5, recentCount: 15 });
    expect(result).toBe(messages);
  });

  it('compresses into first + summary + recent when the middle is large enough', async () => {
    const messages = Array.from({ length: 50 }, (_, i) => msg(i % 2 ? 'assistant' : 'user', `m${i}`));
    const result = await manageMemory(messages, { maxMessages: 40, recentCount: 15 });

    expect(result.length).toBe(1 + 1 + 15); // first + summary + recent
    expect(result[0]).toBe(messages[0]);
    expect(result[1].content[0].text).toContain('SUMMARY');
    expect(result[result.length - 1]).toBe(messages[messages.length - 1]);
  });
});

describe('getMemoryStats', () => {
  it('counts roles, tool uses and flags compression need', () => {
    const messages = [
      msg('user', 'task'),
      msg('assistant', [{ type: 'tool_use', name: 'navigate' }, { type: 'tool_use', name: 'read_page' }]),
      msg('user', [{ type: 'tool_result', content: 'ok' }]),
    ];
    const stats = getMemoryStats(messages);
    expect(stats.totalMessages).toBe(3);
    expect(stats.userMessages).toBe(2);
    expect(stats.assistantMessages).toBe(1);
    expect(stats.toolUseCount).toBe(2);
    expect(stats.compressionNeeded).toBe(false);
    expect(stats.estimatedTokensK).toBeGreaterThanOrEqual(0);
  });

  it('flags compression when over the default max', () => {
    const messages = Array.from({ length: 41 }, () => msg('user', 'x'));
    expect(getMemoryStats(messages).compressionNeeded).toBe(true);
  });
});

describe('clearMemory', () => {
  it('returns an empty array', () => {
    expect(clearMemory()).toEqual([]);
  });
});
