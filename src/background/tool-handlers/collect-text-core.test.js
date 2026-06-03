import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleCollectPageText, runCollect } from './collect-text-core.js';

// Build a `step` that replays a scripted sequence of viewport frames. The last
// frame repeats if the loop asks for more.
const stepper = (frames) => {
  let i = 0;
  return async () => frames[Math.min(i++, frames.length - 1)];
};

describe('runCollect — collection loop (REQ-007)', () => {
  it('dedupes the same item across virtualized re-renders (by text, not position)', async () => {
    // Each scroll overlaps the previous viewport — a recycled row reappears at a
    // new index. Dedupe must key on text so we neither drop nor double-count.
    const frames = [
      { items: ['a', 'b', 'c'], scrollPos: 0 },
      { items: ['b', 'c', 'd', 'e'], scrollPos: 100 },
      { items: ['e', 'f', 'g'], scrollPos: 200 },
      { items: ['g', 'h'], scrollPos: 300 },
      { items: ['h'], scrollPos: 300 }, // no movement + nothing new → boundary
    ];

    const res = await runCollect({ maxScrolls: 20 }, stepper(frames));

    expect(res.items).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(res.reachedBoundary).toBe(true);
    expect(res.truncated).toBe(false);
  });

  it('stops at maxScrolls and reports truncated when the list never ends', async () => {
    let k = 0;
    let pos = 0;
    const infinite = async () => ({ items: [`row${k++}`, `row${k++}`], scrollPos: (pos += 100) });

    const res = await runCollect({ maxScrolls: 3 }, infinite);

    expect(res.scrolls).toBe(3);
    expect(res.reachedBoundary).toBe(false);
    expect(res.truncated).toBe(true);
  });

  it('returns the first N items in order when count is set, without over-scrolling', async () => {
    const frames = [
      { items: ['1', '2', '3'], scrollPos: 0 },
      { items: ['4', '5', '6'], scrollPos: 100 },
      { items: ['7', '8', '9'], scrollPos: 200 },
    ];

    const res = await runCollect({ count: 5, maxScrolls: 20 }, stepper(frames));

    expect(res.items).toEqual(['1', '2', '3', '4', '5']);
    expect(res.scrolls).toBe(1); // one scroll was enough to exceed count
    expect(res.reachedBoundary).toBe(false); // stopped on count, not the list end
  });

  it('sets reachedBoundary when the list ends before count is reached (AC-011)', async () => {
    const frames = [
      { items: ['a', 'b'], scrollPos: 0 },
      { items: ['c'], scrollPos: 50 },
      { items: ['c'], scrollPos: 50 }, // dead end before 100 items
    ];

    const res = await runCollect({ count: 100, maxScrolls: 20 }, stepper(frames));

    expect(res.items).toEqual(['a', 'b', 'c']);
    expect(res.reachedBoundary).toBe(true);
    expect(res.truncated).toBe(false);
  });
});

describe('handleCollectPageText — browser handler', () => {
  // Replace the in-page primitive with scripted frames so we can drive the
  // handler without a real DOM.
  const mockFrames = (frames) => {
    let i = 0;
    chrome.scripting = {
      executeScript: vi.fn(async () => [{ result: frames[Math.min(i++, frames.length - 1)] }]),
    };
    return chrome.scripting.executeScript;
  };

  beforeEach(() => {
    chrome.tabs.get = vi.fn(async (id) => ({ id, url: 'https://example.com' }));
  });

  it('returns gathered text only — never an image (AC-010)', async () => {
    mockFrames([
      { items: ['msg1', 'msg2'], scrollPos: 0 },
      { items: ['msg3'], scrollPos: 50 },
      { items: ['msg3'], scrollPos: 50 }, // boundary
    ]);

    const res = await handleCollectPageText({ tabId: 1, direction: 'down' });

    expect(res.error).toBeUndefined();
    expect(typeof res.output).toBe('string');
    expect('base64Image' in res).toBe(false);
    expect(res.output).toContain('msg1');
    expect(res.output).toContain('msg3');
    expect(res.output).toContain('reachedBoundary: true');
  });

  it('newest-N starts at the bottom and scrolls up (AC-011)', async () => {
    const spy = mockFrames([
      { items: ['newest'], scrollPos: 100 },
      { items: ['newest'], scrollPos: 100 }, // boundary on first scroll
    ]);

    await handleCollectPageText({ tabId: 1, direction: 'up', count: 50 });

    // First page-call positions at the bottom; the scroll call goes up.
    expect(spy.mock.calls[0][0].args).toEqual([false, 'up', 0.9, 'bottom']);
    expect(spy.mock.calls[1][0].args).toEqual([true, 'up', 0.9, null]);
  });

  it('honors count, trimming the gathered body to N items', async () => {
    mockFrames([
      { items: ['a', 'b', 'c'], scrollPos: 0 },
      { items: ['d', 'e', 'f'], scrollPos: 100 },
    ]);

    const res = await handleCollectPageText({ tabId: 1, count: 2 });
    const body = res.output.split('---\n')[1];

    expect(body).toBe('a\nb');
  });

  it('errors cleanly when tabId is missing', async () => {
    const res = await handleCollectPageText({ direction: 'down' });
    expect(res.error).toMatch(/No active tab/);
  });
});
