import { render, cleanup } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { useFocusTrap } from './useFocusTrap';

function Modal() {
  const ref = useFocusTrap(true);
  return (
    <div ref={ref}>
      <button type="button">first</button>
      <button type="button">middle</button>
      <button type="button">last</button>
    </div>
  );
}

function dispatchTab(target, { shift = false } = {}) {
  const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

describe('useFocusTrap', () => {
  afterEach(cleanup);

  it('focuses the first focusable element on mount', () => {
    const { getByText } = render(<Modal />);
    expect(document.activeElement).toBe(getByText('first'));
  });

  it('wraps Tab from the last element back to the first', () => {
    const { getByText, container } = render(<Modal />);
    const first = getByText('first');
    const last = getByText('last');
    last.focus();

    const ev = dispatchTab(container.firstChild);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('wraps Shift+Tab from the first element back to the last', () => {
    const { getByText, container } = render(<Modal />);
    const first = getByText('first');
    const last = getByText('last');
    first.focus();

    const ev = dispatchTab(container.firstChild, { shift: true });
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('pulls focus back inside when it has escaped the trap', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const { getByText, container } = render(<Modal />);

    // Simulate focus escaping to an element outside the trap.
    outside.focus();
    expect(container.firstChild.contains(document.activeElement)).toBe(false);

    // Dispatch on the outside element itself — the keydown bubbles up its own
    // ancestor chain (not through the modal container), so only a document-
    // level capture listener will catch it.
    const ev = dispatchTab(outside);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(getByText('first'));

    outside.remove();
  });

  it('does not throw when the previously focused element was removed before cleanup', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(<Modal />);
    // The element that had focus before the trap opened is removed.
    trigger.remove();

    expect(() => unmount()).not.toThrow();
  });
});
