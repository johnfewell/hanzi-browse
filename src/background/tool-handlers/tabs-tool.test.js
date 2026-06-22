import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleTabsContext, handleTabsCreate, handleTabsClose } from './tabs-tool.js';

afterEach(() => { delete globalThis.chrome; });

describe('handleTabsClose', () => {
  it('requires a tabId', async () => {
    expect(await handleTabsClose({}, { agentOpenedTabs: new Set() })).toBe('Error: tabId is required');
  });

  it('closes the tab and stops tracking it', async () => {
    globalThis.chrome = { tabs: { get: vi.fn(async () => ({})), remove: vi.fn(async () => {}) } };
    const agentOpenedTabs = new Set([5]);
    const out = await handleTabsClose({ tabId: 5 }, { agentOpenedTabs });
    expect(out).toBe('Successfully closed tab 5');
    expect(agentOpenedTabs.has(5)).toBe(false);
    expect(chrome.tabs.remove).toHaveBeenCalledWith(5);
  });

  it('returns an error string when the tab is gone', async () => {
    globalThis.chrome = { tabs: { get: async () => { throw new Error('No tab'); } } };
    expect(await handleTabsClose({ tabId: 5 }, { agentOpenedTabs: new Set() }))
      .toBe('Error closing tab 5: No tab');
  });
});

describe('handleTabsCreate', () => {
  it('adds a new UI-session tab to the agent group', async () => {
    globalThis.chrome = { tabs: { create: vi.fn(async () => ({ id: 12 })) } };
    const addTabToGroup = vi.fn(async () => {});
    const out = await handleTabsCreate({}, {
      addTabToGroup, sessionTabGroupId: 3, agentOpenedTabs: new Set(),
    });
    expect(out).toBe('Created new tab with ID: 12');
    expect(addTabToGroup).toHaveBeenCalledWith(12, 3);
  });

  it('skips grouping for an MCP dedicated window and tracks the tab', async () => {
    globalThis.chrome = { tabs: { create: vi.fn(async () => ({ id: 20 })) } };
    const addTabToGroup = vi.fn(async () => {});
    const agentOpenedTabs = new Set();
    await handleTabsCreate({}, {
      addTabToGroup, sessionTabGroupId: null, agentOpenedTabs, mcpSession: { windowId: 99 },
    });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'chrome://newtab', windowId: 99 });
    expect(addTabToGroup).not.toHaveBeenCalled();
    expect(agentOpenedTabs.has(20)).toBe(true);
  });
});

describe('handleTabsContext', () => {
  it('lists group tabs and filters restricted chrome pages', async () => {
    globalThis.chrome = {
      tabs: {
        query: vi.fn(async (q) => {
          if (q.groupId === 7) {
            return [
              { id: 1, url: 'https://a.com', title: 'A', active: true, groupId: 7 },
              { id: 2, url: 'chrome://settings', title: 'S', active: false, groupId: 7 },
            ];
          }
          return [];
        }),
      },
    };
    const out = JSON.parse(await handleTabsContext({}, {
      sessionTabGroupId: 7, agentOpenedTabs: new Set(), isAnySessionActive: () => false,
    }));
    expect(out.availableTabs).toHaveLength(1);
    expect(out.availableTabs[0].tabId).toBe(1);
    expect(out.groupId).toBe(7);
  });

  it('falls back to the active tab when nothing else is tracked', async () => {
    globalThis.chrome = {
      tabs: {
        query: vi.fn(async (q) => {
          if (q.active) return [{ id: 9, url: 'https://z.com', title: 'Z', active: true, groupId: -1 }];
          return [];
        }),
      },
    };
    const out = JSON.parse(await handleTabsContext({}, {
      sessionTabGroupId: null, agentOpenedTabs: new Set(), isAnySessionActive: () => false,
    }));
    expect(out.availableTabs).toHaveLength(1);
    expect(out.availableTabs[0].tabId).toBe(9);
  });

  it('returns no tabs when the only active tab is a restricted page', async () => {
    globalThis.chrome = {
      tabs: { query: vi.fn(async () => [{ id: 9, url: 'chrome://newtab', active: true }]) },
    };
    const out = JSON.parse(await handleTabsContext({}, {
      sessionTabGroupId: null, agentOpenedTabs: new Set(), isAnySessionActive: () => false,
    }));
    expect(out.availableTabs).toHaveLength(0);
  });
});
