import { useEffect, useCallback } from "react";

/**
 * Hook para navegação por teclado
 * Facilita a implementação de atalhos de teclado
 *
 * @example
 * useKeyboardNavigation({
 *   "Escape": () => closeModal(),
 *   "Enter": () => submitForm(),
 *   "ArrowUp": () => selectPrevious(),
 *   "ArrowDown": () => selectNext(),
 * });
 */
export function useKeyboardNavigation(
  keyMap: Record<string, (event: KeyboardEvent) => void>,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const handler = keyMap[event.key];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    },
    [keyMap, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Hook para atalhos com modificadores (Ctrl, Shift, Alt)
 *
 * @example
 * useKeyboardShortcut("s", () => save(), { ctrl: true });
 * useKeyboardShortcut("k", () => openSearch(), { ctrl: true, shift: true });
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean; // Cmd no Mac
    enabled?: boolean;
  } = {}
) {
  const { ctrl, shift, alt, meta, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const matchesKey = event.key.toLowerCase() === key.toLowerCase();
      const matchesCtrl = ctrl ? event.ctrlKey : !event.ctrlKey;
      const matchesShift = shift ? event.shiftKey : !event.shiftKey;
      const matchesAlt = alt ? event.altKey : !event.altKey;
      const matchesMeta = meta ? event.metaKey : !event.metaKey;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, callback, ctrl, shift, alt, meta, enabled]);
}

/**
 * Hook para trap de foco (útil em modals)
 * Mantém o foco dentro de um elemento
 *
 * @example
 * const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
 *
 * return (
 *   <div ref={modalRef}>
 *     <input />
 *     <button>Close</button>
 *   </div>
 * );
 */
export function useFocusTrap<T extends HTMLElement>(enabled: boolean = true) {
  const elementRef = useCallback(
    (node: T | null) => {
      if (!node || !enabled) return;

      const focusableElements = node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      };

      node.addEventListener("keydown", handleKeyDown);

      // Foca no primeiro elemento ao abrir
      firstElement?.focus();

      return () => {
        node.removeEventListener("keydown", handleKeyDown);
      };
    },
    [enabled]
  );

  return elementRef;
}

/**
 * Hook para restaurar foco ao fechar modal
 *
 * @example
 * const restoreFocus = useRestoreFocus();
 *
 * function openModal() {
 *   restoreFocus.save();
 *   setIsOpen(true);
 * }
 *
 * function closeModal() {
 *   setIsOpen(false);
 *   restoreFocus.restore();
 * }
 */
export function useRestoreFocus() {
  const previousActiveElement = useCallback(() => {
    return document.activeElement as HTMLElement;
  }, []);

  return {
    save: () => {
      const element = previousActiveElement();
      return () => element?.focus();
    },
    restore: (restoreFn?: () => void) => {
      if (restoreFn) {
        restoreFn();
      } else {
        previousActiveElement()?.focus();
      }
    },
  };
}
