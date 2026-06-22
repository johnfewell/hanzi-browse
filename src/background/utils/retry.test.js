import {
  isDebuggerDetachedError,
  isTabDraggingError,
  retryWithBackoff,
} from './retry';

describe('retry utilities', () => {
  it('retries until the function succeeds', async () => {
    vi.useFakeTimers();

    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockRejectedValueOnce(new Error('still temporary'))
      .mockResolvedValue('ok');

    const pending = retryWithBackoff(fn, { delay: 100, onRetry });

    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][0]).toBe(1);
  });

  it('waits with exponential backoff between attempts (delay * 2^(n-1))', async () => {
    vi.useFakeTimers();
    const delays = [];
    const realSetTimeout = setTimeout;
    const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation((cb, ms) => {
      delays.push(ms);
      return realSetTimeout(cb, 0);
    });

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockResolvedValue('ok');

    const pending = retryWithBackoff(fn, { delay: 100, maxRetries: 5 });
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe('ok');

    // Two backoff waits before the third (successful) attempt: 100, 200 (not 100, 100).
    expect(delays).toEqual([100, 200]);
    spy.mockRestore();
  });

  it('stops immediately when shouldRetry rejects the error', async () => {
    const error = new Error('fatal');
    const fn = vi.fn().mockRejectedValue(error);
    const shouldRetry = vi.fn(() => false);

    await expect(retryWithBackoff(fn, { shouldRetry })).rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });

  it('detects known chrome-specific transient errors', () => {
    expect(isTabDraggingError(new Error('Tab is being dragged'))).toBe(true);
    expect(isDebuggerDetachedError(new Error('Debugger detached from target'))).toBe(true);
    expect(isTabDraggingError(new Error('Other'))).toBe(false);
  });
});
