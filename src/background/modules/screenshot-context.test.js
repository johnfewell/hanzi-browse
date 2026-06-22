import { describe, it, expect } from 'vitest';
import { ScreenshotContextManager, scaleCoordinates } from './screenshot-context.js';

describe('scaleCoordinates', () => {
  it('scales screenshot-space coords into viewport space (DPR 2)', () => {
    const ctx = { viewportWidth: 800, viewportHeight: 600, screenshotWidth: 1600, screenshotHeight: 1200 };
    expect(scaleCoordinates(100, 100, ctx)).toEqual([50, 50]);
    expect(scaleCoordinates(1600, 1200, ctx)).toEqual([800, 600]);
  });

  it('is an identity transform when screenshot matches viewport (DPR 1)', () => {
    const ctx = { viewportWidth: 1024, viewportHeight: 768, screenshotWidth: 1024, screenshotHeight: 768 };
    expect(scaleCoordinates(300, 200, ctx)).toEqual([300, 200]);
  });
});

describe('ScreenshotContextManager', () => {
  it('stores and retrieves context per tab', () => {
    const mgr = new ScreenshotContextManager();
    mgr.setContext(1, { viewportWidth: 800, viewportHeight: 600, width: 1600, height: 1200 });
    expect(mgr.getContext(1)).toEqual({
      viewportWidth: 800,
      viewportHeight: 600,
      screenshotWidth: 1600,
      screenshotHeight: 1200,
    });
  });

  it('ignores results that lack viewport dimensions', () => {
    const mgr = new ScreenshotContextManager();
    mgr.setContext(2, { width: 100, height: 100 });
    expect(mgr.getContext(2)).toBeUndefined();
  });

  it('clears a single tab and all tabs', () => {
    const mgr = new ScreenshotContextManager();
    mgr.setContext(1, { viewportWidth: 1, viewportHeight: 1, width: 1, height: 1 });
    mgr.setContext(2, { viewportWidth: 1, viewportHeight: 1, width: 1, height: 1 });
    mgr.clearContext(1);
    expect(mgr.getContext(1)).toBeUndefined();
    expect(mgr.getContext(2)).toBeDefined();
    mgr.clearAllContexts();
    expect(mgr.getContext(2)).toBeUndefined();
  });
});
