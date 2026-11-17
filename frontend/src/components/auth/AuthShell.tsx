"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const LOGIN_PATH = "/login";

const SLIDE_TRANSITION =
  "lg:motion-safe:transition-transform lg:motion-safe:duration-500 lg:motion-safe:ease-in-out motion-reduce:transition-none";

type AuthShellProps = {
  panel: ReactNode;
  children: ReactNode;
};

export function AuthShell({ panel, children }: AuthShellProps) {
  const isLogin = usePathname() === LOGIN_PATH;

  return (
    <div className="overflow-x-clip">
      <main className="flex min-h-dvh">
        <div
          className={`hidden lg:z-10 lg:flex lg:w-1/2 ${SLIDE_TRANSITION} ${
            isLogin ? "lg:translate-x-full" : "lg:translate-x-0"
          }`}
        >
          {panel}
        </div>
        <div
          className={`flex w-full items-center justify-center bg-card px-4 py-8 sm:px-8 lg:w-1/2 ${SLIDE_TRANSITION} ${
            isLogin ? "lg:-translate-x-full" : "lg:translate-x-0"
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
