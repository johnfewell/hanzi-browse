import { beforeEach, describe, expect, it, vi } from 'vitest';

// The scroll handler reaches into CDP, the debugger, and screenshot capture.
// We mock those seams so the test exercises only the decision under test:
// whether a scroll attaches a screenshot, and what drives that decision.
vi.mock('../modules/cdp-helper.js', () => ({
  cdpHelper: {
    scrollWheel: vi.fn(async () => {}),
    screenshot: vi.fn(async () => ({
      base64: 'BASE64DATA',
      format: 'png',
      width: 1280,
      height: 800,
    })),
  },
}));
vi.mock('../modules/screenshot-context.js', () => ({
  screenshotContextManager: { getContext: vi.fn(() => null) },
  scaleCoordinates: vi.fn((x, y) => [x, y]),
}));
vi.mock('../managers/debugger-manager.js', () => ({
  ensureDebugger: vi.fn(async () => {}),
  sendDebuggerCommand: vi.fn(async () => ({})),
}));
vi.mock('../modules/domain-skills.js', () => ({
  isAntiBotEnabled: vi.fn(() => false),
}));
vi.mock('../dom-service/element-resolver.js', () => ({
  createElementResolver: vi.fn(() => ({
    parseRef: vi.fn(() => null),
    getCoordinates: vi.fn(),
  })),
}));

import { handleComputer } from './computer-core.js';

const scrollInput = () => ({ action: 'scroll', tabId: 123, coordinate: [500, 400] });

describe('handleComputer scroll — auto-screenshot gating (REQ-001)', () => {
  beforeEach(() => {
    // setup.js rebuilds globalThis.chrome each test; augment with the surfaces
    // the scroll path touches.
    chrome.tabs.get = vi.fn(async (id) => ({ id, url: 'https://example.com', active: true }));
    chrome.scripting = {
      executeScript: vi.fn(async () => [{ result: { x: 0, y: 0 } }]),
    };
  });

  it('returns status text with no screenshot by default (AC-001)', async () => {
    const result = await handleComputer(scrollInput(), {});

    expect(result.output).toContain('Scrolled down');
    expect(result.base64Image).toBeUndefined();
  });

  it('treats a missing deps argument as text-only', async () => {
    const result = await handleComputer(scrollInput());

    expect(result.base64Image).toBeUndefined();
  });

  it('re-attaches a screenshot when trusted visualMode is set (AC-004)', async () => {
    const result = await handleComputer(scrollInput(), {
      sessionOptions: { visualMode: true },
    });

    expect(result.base64Image).toBe('BASE64DATA');
    expect(result.imageFormat).toBe('png');
  });

  it('ignores visualMode supplied via LLM tool input (CON-005)', async () => {
    // visualMode on the tool input must NOT enable the screenshot — only trusted
    // session state in deps can. This is the whole point of the gate.
    const result = await handleComputer(
      { ...scrollInput(), visualMode: true },
      {},
    );

    expect(result.base64Image).toBeUndefined();
  });
});
