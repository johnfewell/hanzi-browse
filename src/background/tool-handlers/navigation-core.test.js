import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleNavigate } from './navigation-core.js';

beforeEach(() => {
  globalThis.chrome = {
    tabs: {
      get: vi.fn(async (id) => ({ id, url: 'https://current.example' })),
      goBack: vi.fn(async () => {}),
      goForward: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
    },
  };
});
afterEach(() => { delete globalThis.chrome; });

describe('handleNavigate', () => {
  it('errors when url is missing', async () => {
    const r = await handleNavigate({ tabId: 1 });
    expect(r.error).toMatch(/URL parameter is required/);
  });

  it('errors when tabId is missing', async () => {
    const r = await handleNavigate({ url: 'https://x.com' });
    expect(r.error).toMatch(/No active tab found/);
  });

  it('prefixes a bare domain with https://', async () => {
    const r = await handleNavigate({ url: 'example.com', tabId: 1 });
    expect(chrome.tabs.update).toHaveBeenCalledWith(1, { url: 'https://example.com' });
    expect(r.output).toBe('Navigated to https://example.com');
  });

  it('keeps an explicit https url unchanged', async () => {
    const r = await handleNavigate({ url: 'https://x.com/path', tabId: 1 });
    expect(chrome.tabs.update).toHaveBeenCalledWith(1, { url: 'https://x.com/path' });
    expect(r.output).toBe('Navigated to https://x.com/path');
  });

  it('navigates back', async () => {
    const r = await handleNavigate({ url: 'back', tabId: 1 });
    expect(chrome.tabs.goBack).toHaveBeenCalledWith(1);
    expect(r.output).toMatch(/^Navigated back to /);
  });

  it('navigates forward', async () => {
    const r = await handleNavigate({ url: 'forward', tabId: 1 });
    expect(chrome.tabs.goForward).toHaveBeenCalledWith(1);
    expect(r.output).toMatch(/^Navigated forward to /);
  });

  it('reports an invalid url', async () => {
    const r = await handleNavigate({ url: 'http://', tabId: 1 });
    expect(r.error).toMatch(/Invalid URL: http:\/\//);
  });
});
