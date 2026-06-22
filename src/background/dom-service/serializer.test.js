import { describe, it, expect } from 'vitest';
import { serializeDomTree } from './serializer.js';

// Minimal enhanced-node builders matching the shape produced by tree-builder.js.
const text = (value, visible = true) => ({ nodeType: 3, nodeValue: value, isVisible: visible });
const el = (nodeName, props = {}) => ({
  nodeType: 1,
  nodeName,
  isVisible: true,
  attributes: {},
  children: [],
  ...props,
});
const doc = (children) => ({ nodeType: 9, children });

describe('serializeDomTree', () => {
  it('renders an interactive element with its backendNodeId and records it in the selector map', () => {
    const button = el('BUTTON', { backendNodeId: 42, children: [text('Submit')] });
    const { text: out, selectorMap, truncated } = serializeDomTree(doc([button]));

    expect(out).toContain('[42]');
    expect(out).toContain('<button');
    expect(out).toContain('Submit');
    expect(selectorMap.has(42)).toBe(true);
    expect(selectorMap.get(42)).toBe(button);
    expect(truncated).toBe(false);
  });

  it('skips disabled elements such as <script> and does not leak their text', () => {
    const script = el('SCRIPT', { children: [text('var secret = 1;')] });
    const button = el('BUTTON', { backendNodeId: 7, children: [text('Go')] });
    const { text: out } = serializeDomTree(doc([script, button]));

    expect(out).not.toContain('var secret');
    expect(out).toContain('[7]');
  });

  it('truncates when output exceeds maxChars and reports it', () => {
    const buttons = Array.from({ length: 200 }, (_, i) =>
      el('BUTTON', { backendNodeId: 1000 + i, children: [text(`Button ${i}`)] }),
    );
    const { selectorMap, truncated } = serializeDomTree(doc(buttons), { maxChars: 60 });

    expect(truncated).toBe(true);
    expect(selectorMap.size).toBeGreaterThan(0);
    expect(selectorMap.size).toBeLessThan(buttons.length);
  });

  it('treats elements with an interactive ARIA role as interactive', () => {
    const div = el('DIV', { backendNodeId: 99, attributes: { role: 'button' }, children: [text('Custom')] });
    const { selectorMap } = serializeDomTree(doc([div]));
    expect(selectorMap.has(99)).toBe(true);
  });
});
