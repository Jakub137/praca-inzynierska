"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOCUS_RING } from "@/lib/focusRing";
import { isActivePath, NAV_ITEMS } from "@/lib/navigation";

const LINK_CLASSES = `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${FOCUS_RING}`;
const ACTIVE_CLASSES = "bg-brand/10 text-ink";
const IDLE_CLASSES = "text-muted hover:bg-slate-100";

type SidebarNavProps = {
  onNavigate?: () => void;
};

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu główne">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = isActivePath(pathname, href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
                className={`${LINK_CLASSES} ${isActive ? ACTIVE_CLASSES : IDLE_CLASSES}`}
              >
                <Icon
                  className={`size-5 shrink-0 ${isActive ? "text-brand" : ""}`}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
