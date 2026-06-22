import { describe, it, expect, vi, afterEach } from 'vitest';

// Stub the captcha solver so importing the module never runs heavy/real code.
vi.mock('../modules/captcha-solvers.js', () => ({ solveCaptcha: vi.fn() }));

import {
  handleUpdatePlan,
  handleTurnAnswerStart,
  handleEscalate,
  handleGetInfo,
  handleResizeWindow,
  handleSolveCaptcha,
} from './agent-tool.js';

describe('handleUpdatePlan', () => {
  it('auto-approves with numbered steps when askBeforeActing is false', async () => {
    const out = await handleUpdatePlan(
      { domains: ['x.com'], approach: ['Open site', 'Fill form'] },
      { askBeforeActing: false },
    );
    expect(out).toBe('Plan auto-approved. Proceeding with:\n1. Open site\n2. Fill form');
  });

  it('returns an approval message when the user approves', async () => {
    globalThis.chrome = { runtime: { sendMessage: () => Promise.resolve() } };
    const out = await handleUpdatePlan(
      { domains: ['x.com'], approach: ['Step A'] },
      { askBeforeActing: true, setPendingPlanResolve: (resolve) => resolve({ approved: true }) },
    );
    expect(out).toBe('Plan approved by user. Proceeding with:\n1. Step A');
    delete globalThis.chrome;
  });

  it('returns a cancellation object when the user rejects', async () => {
    globalThis.chrome = { runtime: { sendMessage: () => Promise.resolve() } };
    const out = await handleUpdatePlan(
      { domains: ['x.com'], approach: ['Step A'] },
      { askBeforeActing: true, setPendingPlanResolve: (resolve) => resolve({ approved: false }) },
    );
    expect(out).toEqual({ cancelled: true, message: 'User cancelled the plan' });
    delete globalThis.chrome;
  });
});

describe('handleTurnAnswerStart', () => {
  it('returns a static ready message', async () => {
    expect(await handleTurnAnswerStart()).toBe('Ready to respond to user.');
  });
});

describe('handleEscalate', () => {
  it('falls back gracefully without an MCP session', async () => {
    expect(await handleEscalate({ problem: 'stuck' }, {})).toBe(
      'Escalation not available. Try a different approach on your own.',
    );
  });

  it('forwards to sendEscalation and returns string guidance', async () => {
    const sendEscalation = vi.fn(async () => 'try plan B');
    const out = await handleEscalate(
      { problem: 'p', what_i_tried: 't', what_i_need: 'n' },
      { sessionId: 's1', sendEscalation },
    );
    expect(out).toBe('try plan B');
    expect(sendEscalation).toHaveBeenCalledWith('s1', 'p', 't', 'n');
  });

  it('stringifies a non-string escalation response', async () => {
    const out = await handleEscalate(
      { problem: 'p' },
      { sessionId: 's1', sendEscalation: async () => ({ guidance: 'x' }) },
    );
    expect(out).toBe('{"guidance":"x"}');
  });
});

describe('handleGetInfo', () => {
  it('rejects an empty query', async () => {
    expect(await handleGetInfo({ query: '  ' }, {})).toMatch(/query cannot be empty/);
  });

  it('explains when no MCP session is present', async () => {
    expect(await handleGetInfo({ query: 'email' }, {})).toMatch(/not started via MCP/);
  });

  it('falls back to raw context when queryMemory is unavailable', async () => {
    const out = await handleGetInfo(
      { query: 'email' },
      { mcpSession: { sessionId: 's', context: 'user is Jane' } },
    );
    expect(out).toBe('Memory system not available. Here is the raw context:\nuser is Jane');
  });

  it('returns the memory response on success', async () => {
    const out = await handleGetInfo(
      { query: 'email' },
      { mcpSession: { sessionId: 's' }, queryMemory: async () => 'jane@x.com' },
    );
    expect(out).toBe('jane@x.com');
  });

  it('returns an error message when queryMemory throws', async () => {
    const out = await handleGetInfo(
      { query: 'email' },
      { mcpSession: { sessionId: 's' }, queryMemory: async () => { throw new Error('boom'); } },
    );
    expect(out).toMatch(/^Error retrieving information: boom/);
  });
});

describe('handleResizeWindow', () => {
  afterEach(() => { delete globalThis.chrome; });

  it('resizes the containing window', async () => {
    const update = vi.fn(async () => {});
    globalThis.chrome = { tabs: { get: async () => ({ windowId: 9 }) }, windows: { update } };
    expect(await handleResizeWindow({ tabId: 1, width: 800, height: 600 })).toBe('Resized window to 800x600');
    expect(update).toHaveBeenCalledWith(9, { width: 800, height: 600 });
  });

  it('returns an error string when the tab/window is missing', async () => {
    globalThis.chrome = { tabs: { get: async () => { throw new Error('No tab with id'); } }, windows: {} };
    expect(await handleResizeWindow({ tabId: 1, width: 1, height: 1 })).toBe('Error: No tab with id');
  });
});

describe('handleSolveCaptcha', () => {
  it('reports when no CAPTCHA data was captured', async () => {
    const out = await handleSolveCaptcha({ tabId: 1 }, { capturedCaptchaData: new Map() });
    expect(out).toMatch(/No CAPTCHA data captured/);
  });
});
