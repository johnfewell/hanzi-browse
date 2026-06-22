import { useEffect, useRef } from 'preact/hooks';

/**
 * Traps focus within a container element.
 * Tab/Shift+Tab cycle through focusable elements inside the container.
 */
export function useFocusTrap(active = true) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement;

    const getFocusable = () => {
      return container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    };

    // Focus first focusable element
    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const elements = getFocusable();
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      // If focus has escaped the trap (e.g. the focused element was removed or
      // disabled), pull it back inside instead of letting Tab leave the modal.
      const inTrap = container.contains(document.activeElement);

      if (e.shiftKey) {
        if (document.activeElement === first || !inTrap) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !inTrap) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus only if the previously-focused element still exists in the
      // document and is focusable; guard against it having been unmounted.
      if (
        previouslyFocused &&
        typeof previouslyFocused.focus === 'function' &&
        document.contains(previouslyFocused)
      ) {
        try {
          previouslyFocused.focus();
        } catch {
          /* element no longer focusable — ignore */
        }
      }
    };
  }, [active]);

  return containerRef;
}
