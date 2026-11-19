import { useCallback, useEffect, useRef, useState } from "react";

// Disclosure pattern: a button toggles a panel. `useMobileDrawer` is tied to the
// desktop media query and the inert page, so this small hook is separate.
export function usePopoverDisclosure() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const toggle = useCallback(() => setIsOpen((current) => !current), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }
      close();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, close]);

  // Focus goes back to the trigger only after the panel closed.
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  return { isOpen, toggle, close, containerRef, triggerRef };
}
