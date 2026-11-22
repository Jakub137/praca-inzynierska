import Link from "next/link";
import type { ReactNode } from "react";
import { FOCUS_RING } from "@/lib/focusRing";

type DashboardLinkProps = {
  href: string;
  children: ReactNode;
};

export function DashboardLink({ href, children }: DashboardLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline ${FOCUS_RING}`}
    >
      {children}
    </Link>
  );
}
