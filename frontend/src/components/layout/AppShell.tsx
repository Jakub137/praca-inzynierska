"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import {
  MOBILE_DRAWER_ID,
  MobileDrawer,
} from "@/components/layout/MobileDrawer";
import { SessionGate } from "@/components/layout/SessionGate";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/layout/ToastProvider";
import { useMobileDrawer } from "@/hooks/useMobileDrawer";
import { FOCUS_RING } from "@/lib/focusRing";

const MAIN_CONTENT_ID = "main-content";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { isOpen, open, close, triggerRef } = useMobileDrawer();

  return (
    <ToastProvider>
      <div inert={isOpen} className="min-h-dvh lg:pl-64">
        <a
          href={`#${MAIN_CONTENT_ID}`}
          className={`sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-ink ${FOCUS_RING}`}
        >
          Przejdź do treści
        </a>
        <div className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-card lg:block">
          <Sidebar />
        </div>
        <Header
          isMenuOpen={isOpen}
          menuButtonRef={triggerRef}
          menuControlsId={MOBILE_DRAWER_ID}
          onMenuClick={open}
        />
        <main id={MAIN_CONTENT_ID} className="p-4 lg:p-8">
          <SessionGate>{children}</SessionGate>
        </main>
      </div>
      <MobileDrawer isOpen={isOpen} onClose={close} />
    </ToastProvider>
  );
}
