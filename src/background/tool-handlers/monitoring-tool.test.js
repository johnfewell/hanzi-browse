import { describe, it, expect, vi } from 'vitest';
import { handleReadConsoleMessages, handleReadNetworkRequests } from './monitoring-tool.js';

const baseConsoleDeps = (messages, overrides = {}) => ({
  ensureDebugger: vi.fn(async () => {}),
  getConsoleMessages: () => messages,
  clearConsoleMessages: vi.fn(),
  ...overrides,
});

const baseNetworkDeps = (requests, overrides = {}) => ({
  ensureDebugger: vi.fn(async () => {}),
  isNetworkTrackingEnabled: () => true,
  enableNetworkTracking: vi.fn(async () => {}),
  getNetworkRequests: () => requests,
  clearNetworkRequests: vi.fn(),
  ...overrides,
});

describe('handleReadConsoleMessages', () => {
  it('formats messages with their level', async () => {
    const out = await handleReadConsoleMessages(
      { tabId: 1 },
      baseConsoleDeps([{ type: 'log', text: 'hi' }, { type: 'error', text: 'boom' }]),
    );
    expect(out).toBe('Found 2 messages:\n[LOG] hi\n[ERROR] boom');
  });

  it('filters to errors with onlyErrors', async () => {
    const out = await handleReadConsoleMessages(
      { tabId: 1, onlyErrors: true },
      baseConsoleDeps([{ type: 'log', text: 'hi' }, { type: 'error', text: 'boom' }]),
    );
    expect(out).toBe('Found 1 messages:\n[ERROR] boom');
  });

  it('filters by regex pattern (case-insensitive)', async () => {
    const out = await handleReadConsoleMessages(
      { tabId: 1, pattern: 'BOOM' },
      baseConsoleDeps([{ type: 'log', text: 'hi' }, { type: 'error', text: 'boom' }]),
    );
    expect(out).toBe('Found 1 messages:\n[ERROR] boom');
  });

  it('reports an invalid regex instead of throwing', async () => {
    const out = await handleReadConsoleMessages({ tabId: 1, pattern: '[' }, baseConsoleDeps([]));
    expect(out).toBe('Invalid regex: [');
  });

  it('clears messages when clear is set', async () => {
    const deps = baseConsoleDeps([{ type: 'log', text: 'hi' }]);
    await handleReadConsoleMessages({ tabId: 1, clear: true }, deps);
    expect(deps.clearConsoleMessages).toHaveBeenCalled();
  });

  it('reports when no messages match', async () => {
    expect(await handleReadConsoleMessages({ tabId: 1, pattern: 'zzz' }, baseConsoleDeps([])))
      .toBe('No console messages found matching "zzz"');
  });
});

describe('handleReadNetworkRequests', () => {
  it('formats requests with method, url and status', async () => {
    const out = await handleReadNetworkRequests(
      { tabId: 1 },
      baseNetworkDeps([{ method: 'GET', url: '/api/a', status: 200 }]),
    );
    expect(out).toBe('Found 1 requests:\n[GET] /api/a (200)');
  });

  it('filters by url substring', async () => {
    const out = await handleReadNetworkRequests(
      { tabId: 1, urlPattern: '/api/b' },
      baseNetworkDeps([
        { method: 'GET', url: '/api/a', status: 200 },
        { method: 'POST', url: '/api/b', status: 201 },
      ]),
    );
    expect(out).toBe('Found 1 requests:\n[POST] /api/b (201)');
  });

  it('enables network tracking when disabled', async () => {
    const enable = vi.fn(async () => {});
    await handleReadNetworkRequests(
      { tabId: 1 },
      baseNetworkDeps([], { isNetworkTrackingEnabled: () => false, enableNetworkTracking: enable }),
    );
    expect(enable).toHaveBeenCalledWith(1);
  });

  it('returns an error string when enabling tracking fails', async () => {
    const out = await handleReadNetworkRequests(
      { tabId: 1 },
      baseNetworkDeps([], {
        isNetworkTrackingEnabled: () => false,
        enableNetworkTracking: async () => { throw new Error('CDP down'); },
      }),
    );
    expect(out).toBe('Error enabling network tracking: CDP down');
  });

  it('reports when no requests match', async () => {
    expect(await handleReadNetworkRequests({ tabId: 1 }, baseNetworkDeps([])))
      .toBe('No network requests found');
  });
});
