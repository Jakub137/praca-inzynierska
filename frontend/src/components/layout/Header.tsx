import type { RefObject } from "react";
import { MenuIcon } from "@/components/icons/MenuIcon";
import { FOCUS_RING } from "@/lib/focusRing";

type HeaderProps = {
  isMenuOpen: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  menuControlsId: string;
  onMenuClick: () => void;
};

export function Header({
  isMenuOpen,
  menuButtonRef,
  menuControlsId,
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-line bg-card px-4 lg:px-8">
      <button
        ref={menuButtonRef}
        type="button"
        aria-label="Otwórz menu"
        aria-expanded={isMenuOpen}
        aria-controls={menuControlsId}
        onClick={onMenuClick}
        className={`flex size-11 items-center justify-center rounded-lg text-ink hover:bg-slate-100 lg:hidden ${FOCUS_RING}`}
      >
        <MenuIcon className="size-6" />
      </button>
      <span className="text-lg font-semibold text-ink lg:hidden">Saldo</span>
    </header>
  );
}
