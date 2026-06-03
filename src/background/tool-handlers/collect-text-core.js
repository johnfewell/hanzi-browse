/**
 * collect_page_text tool handler
 *
 * Scrolls a long or virtualized list internally, reading and de-duplicating the
 * rendered text at each step, and returns the gathered text in a SINGLE tool
 * call. This moves the mechanical scroll→read→dedupe loop out of the LLM agent
 * loop (REQ-007): instead of N model turns to page through a list, the agent
 * makes one call.
 *
 * The collection loop (runCollect) is kept pure and injectable so it can be
 * unit-tested without a browser; the handler builds the real browser primitives.
 */

const MAX_OUTPUT_CHARS = 50000;

/**
 * Pure collection loop. Drives scroll+read+dedupe via an injected `step`
 * primitive so it can be tested without a browser.
 *
 * @param {Object} opts
 * @param {number} [opts.count=0] - Stop after collecting this many items (0 = no limit).
 * @param {number} [opts.maxScrolls=20] - Safety bound on scroll iterations.
 * @param {(doScroll: boolean) => Promise<{items: string[], scrollPos: number}>} step
 *   Reads the current viewport. doScroll=false reads in place (initial frame);
 *   doScroll=true advances one viewport in the configured direction, then reads.
 * @returns {Promise<{items: string[], reachedBoundary: boolean, truncated: boolean, scrolls: number}>}
 */
export async function runCollect(opts, step) {
  const count = Number.isInteger(opts?.count) && opts.count > 0 ? opts.count : 0;
  const maxScrolls =
    Number.isInteger(opts?.maxScrolls) && opts.maxScrolls > 0 ? opts.maxScrolls : 20;

  const seen = new Set();
  const items = [];
  let reachedBoundary = false;
  let scrolls = 0;

  // Dedupe by item TEXT, not array position — virtualized lists recycle DOM
  // nodes, so the same row reappears at a different index after a re-render.
  const ingest = (viewportItems) => {
    let added = 0;
    for (const raw of Array.isArray(viewportItems) ? viewportItems : []) {
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (!text || seen.has(text)) continue;
      seen.add(text);
      items.push(text);
      added++;
    }
    return added;
  };

  let frame = await step(false);
  ingest(frame.items);

  while (!(count && items.length >= count) && scrolls < maxScrolls) {
    const before = frame.scrollPos;
    frame = await step(true);
    scrolls++;
    const added = ingest(frame.items);
    // Boundary: we could not advance AND nothing new appeared → true list end.
    if (added === 0 && frame.scrollPos === before) {
      reachedBoundary = true;
      break;
    }
  }

  const collected = count ? items.slice(0, count) : items;
  // Truncated = we stopped on the safety bound before reaching the list end and
  // without satisfying the requested count, so there is more to gather.
  const truncated =
    !reachedBoundary && scrolls >= maxScrolls && !(count && items.length >= count);

  return { items: collected, reachedBoundary, truncated, scrolls };
}

/**
 * Run a function in the page and unwrap the executeScript result.
 */
async function runInPage(tabId, func, args) {
  const res = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  if (!res || !res[0]) throw new Error('Page script returned no result');
  if (res[0].error) {
    throw new Error(res[0].error.message || 'Page script failed');
  }
  return res[0].result;
}

/**
 * In-page frame primitive (serialized into the tab). Positions or scrolls the
 * dominant vertical scroller, then returns the rendered text lines + scrollPos.
 * Self-contained — executeScript funcs cannot close over outer scope.
 */
/* istanbul ignore next — runs in the page, exercised by the live re-measurement */
async function frameInPage(doScroll, direction, overlap, position) {
  const pickScroller = () => {
    const docEl = document.scrollingElement || document.documentElement;
    let best = docEl;
    let bestScore = (docEl.scrollHeight || 0) - (docEl.clientHeight || 0);
    const candidates = document.querySelectorAll(
      'div, main, section, ul, ol, [role="list"], [role="feed"], [role="log"]',
    );
    for (const el of candidates) {
      const cs = getComputedStyle(el);
      const scrollable = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
      if (scrollable && el.scrollHeight - el.clientHeight > 200 && el.clientHeight > 200) {
        const score = el.scrollHeight - el.clientHeight;
        if (score > bestScore) {
          best = el;
          bestScore = score;
        }
      }
    }
    return best;
  };

  const scroller = pickScroller();
  const isDoc =
    scroller === document.scrollingElement ||
    scroller === document.documentElement ||
    scroller === document.body;
  const viewport = (isDoc ? window.innerHeight : scroller.clientHeight) || 600;

  if (position === 'bottom') {
    if (isDoc) window.scrollTo(0, document.body.scrollHeight);
    else scroller.scrollTop = scroller.scrollHeight;
  } else if (position === 'top') {
    if (isDoc) window.scrollTo(0, 0);
    else scroller.scrollTop = 0;
  } else if (doScroll) {
    // Scroll ~90% of a viewport so a sliver overlaps for dedupe continuity.
    const delta = Math.max(100, Math.floor(viewport * overlap)) * (direction === 'up' ? -1 : 1);
    if (isDoc) window.scrollBy(0, delta);
    else scroller.scrollTop += delta;
  }

  if (position || doScroll) {
    await new Promise((r) => setTimeout(r, 250));
  }

  const root = isDoc ? document.body : scroller;
  const items = [];
  for (const line of (root.innerText || '').split('\n')) {
    const t = line.replace(/\s+/g, ' ').trim();
    if (t) items.push(t);
  }
  const scrollPos = isDoc
    ? window.scrollY || document.documentElement.scrollTop || 0
    : scroller.scrollTop;
  return { items, scrollPos };
}

/**
 * Handle collect_page_text — gather a long/virtualized list in one call.
 *
 * @param {Object} input
 * @param {number} input.tabId
 * @param {'up'|'down'} [input.direction='down'] - 'up' = newest-first (start at bottom).
 * @param {number} [input.count] - Target number of items (e.g. newest N).
 * @param {number} [input.maxScrolls=20] - Safety bound (clamped 1..50).
 * @param {'top'|'bottom'|'current'} [input.startPosition] - Defaults by direction.
 * @returns {Promise<{output?: string, error?: string}>}
 */
export async function handleCollectPageText(input) {
  try {
    const { tabId } = input || {};
    if (!tabId) throw new Error('No active tab found');

    const direction = input.direction === 'up' ? 'up' : 'down';
    const count =
      Number.isInteger(input.count) && input.count > 0 ? Math.min(input.count, 2000) : 0;
    const maxScrolls = Math.min(
      Math.max(Number.isInteger(input.maxScrolls) ? input.maxScrolls : 20, 1),
      50,
    );
    const startPosition =
      input.startPosition || (direction === 'up' ? 'bottom' : 'top');

    await chrome.tabs.get(tabId); // validate the tab exists

    let positioned = false;
    const step = async (doScroll) => {
      // First call positions to the start; later calls scroll one viewport.
      const position = positioned ? null : startPosition;
      positioned = true;
      return runInPage(tabId, frameInPage, [doScroll, direction, 0.9, position]);
    };

    const { items, reachedBoundary, truncated, scrolls } = await runCollect(
      { count, maxScrolls },
      step,
    );

    let body = items.join('\n');
    let outputTruncated = truncated;
    if (body.length > MAX_OUTPUT_CHARS) {
      body = body.slice(0, MAX_OUTPUT_CHARS);
      outputTruncated = true;
    }

    const header = [
      `Collected ${items.length} item${items.length === 1 ? '' : 's'} over ${scrolls} scroll${scrolls === 1 ? '' : 's'} (direction: ${direction})`,
      `reachedBoundary: ${reachedBoundary}`,
      outputTruncated ? 'truncated: true (call again to continue)' : 'truncated: false',
    ].join(' | ');

    return { output: `${header}\n---\n${body}` };
  } catch (err) {
    return {
      error: `Failed to collect page text: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
