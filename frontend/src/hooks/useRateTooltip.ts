import { useCallback, useEffect, useState } from "react";

// WCAG 1.4.13: shown on hover and on keyboard focus, dismissed with Escape,
// and kept open while the pointer is over the tooltip itself (it sits inside
// the same hover area as the trigger). `isSuppressed` hides it, e.g. while a panel is open.
export function useRateTooltip(isSuppressed: boolean) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isVisible = (isHovered || isFocused) && !isDismissed && !isSuppressed;

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDismissed(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible]);

  const onMouseEnter = useCallback(() => setIsHovered(true), []);
  const onFocus = useCallback(() => setIsFocused(true), []);

  // Escape stays in effect until both hover and focus are gone.
  const onMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isFocused) {
      setIsDismissed(false);
    }
  }, [isFocused]);
  const onBlur = useCallback(() => {
    setIsFocused(false);
    if (!isHovered) {
      setIsDismissed(false);
    }
  }, [isHovered]);

  return { isVisible, onMouseEnter, onMouseLeave, onFocus, onBlur };
}
