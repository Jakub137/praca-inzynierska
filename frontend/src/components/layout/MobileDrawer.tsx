"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { Sidebar } from "@/components/layout/Sidebar";
import { FOCUS_RING } from "@/lib/focusRing";

export const MOBILE_DRAWER_ID = "mobile-navigation";

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div
      id={MOBILE_DRAWER_ID}
      role="dialog"
      aria-modal="true"
      aria-label="Menu nawigacji"
      hidden={!isOpen}
      className="fixed inset-0 z-40 lg:hidden"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl">
        <div className="flex justify-end p-2">
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Zamknij menu"
            onClick={onClose}
            className={`flex size-11 items-center justify-center rounded-lg text-ink hover:bg-slate-100 ${FOCUS_RING}`}
          >
            <CloseIcon className="size-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <Sidebar onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
