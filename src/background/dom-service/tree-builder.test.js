import { describe, it, expect } from 'vitest';
import { buildAxLookup } from './tree-builder.js';

describe('buildAxLookup', () => {
  it('indexes AX nodes by their backendDOMNodeId', () => {
    const nodes = [
      { backendDOMNodeId: 5, role: { value: 'button' } },
      { backendDOMNodeId: 9, role: { value: 'link' } },
    ];
    const lookup = buildAxLookup(nodes);
    expect(lookup.size).toBe(2);
    expect(lookup.get(5).role.value).toBe('button');
    expect(lookup.get(9).role.value).toBe('link');
  });

  it('skips nodes without a backendDOMNodeId', () => {
    const nodes = [
      { role: { value: 'generic' } }, // no backendDOMNodeId
      { backendDOMNodeId: 0, role: { value: 'root' } }, // 0 is a valid id (!= null)
      { backendDOMNodeId: 7, role: { value: 'textbox' } },
    ];
    const lookup = buildAxLookup(nodes);
    expect(lookup.has(0)).toBe(true);
    expect(lookup.has(7)).toBe(true);
    expect(lookup.size).toBe(2);
  });

  it('returns an empty map for no nodes', () => {
    expect(buildAxLookup([]).size).toBe(0);
  });
});
