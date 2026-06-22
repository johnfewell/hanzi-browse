import { describe, it, expect, beforeEach } from 'vitest';
import {
  startSession,
  recordApiCall,
  recordTaskCompletion,
  getTaskUsage,
  getSessionStats,
} from './usage-tracker.js';

describe('usage-tracker', () => {
  beforeEach(() => startSession());

  it('accumulates token usage across API calls', () => {
    recordApiCall({ input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 20 });
    recordApiCall({ input_tokens: 100, output_tokens: 50 });
    const stats = getSessionStats();
    expect(stats.totalInputTokens).toBe(200);
    expect(stats.totalOutputTokens).toBe(100);
    expect(stats.totalCacheReadTokens).toBe(20);
    expect(stats.apiCalls).toBe(2);
  });

  it('computes cost from per-model pricing', () => {
    recordApiCall({ input_tokens: 1_000_000, output_tokens: 1_000_000 });
    const opus = getSessionStats('claude-opus-4-8'); // $15 in / $75 out per 1M
    expect(opus.estimatedCost.input).toBe('$15.0000');
    expect(opus.estimatedCost.output).toBe('$75.0000');
    expect(opus.estimatedCost.total).toBe('$90.0000');
  });

  it('falls back to default pricing for unknown models', () => {
    recordApiCall({ input_tokens: 1_000_000, output_tokens: 1_000_000 });
    const unknown = getSessionStats('some-random-model'); // default $3/$15
    expect(unknown.estimatedCost.total).toBe('$18.0000');
  });

  it('tracks completion counts and success rate', () => {
    recordTaskCompletion(true);
    recordTaskCompletion(true);
    recordTaskCompletion(false);
    const stats = getSessionStats();
    expect(stats.tasksCompleted).toBe(2);
    expect(stats.tasksFailed).toBe(1);
    expect(stats.totalTasks).toBe(3);
    expect(stats.successRate).toBe('66.7%');
  });

  it('isolates per-task usage by session scope', () => {
    recordApiCall({ input_tokens: 10, output_tokens: 5 }, 'session-A');
    recordApiCall({ input_tokens: 99, output_tokens: 99 }, 'session-B');
    expect(getTaskUsage('session-A').inputTokens).toBe(10);
    expect(getTaskUsage('session-B').inputTokens).toBe(99);
  });

  it('reports N/A success rate before any tasks complete', () => {
    expect(getSessionStats().successRate).toBe('N/A');
  });
});
