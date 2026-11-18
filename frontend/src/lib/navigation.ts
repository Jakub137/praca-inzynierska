import type { ComponentType } from "react";
import { BarChartIcon } from "@/components/icons/BarChartIcon";
import { HomeIcon } from "@/components/icons/HomeIcon";
import { RepeatIcon } from "@/components/icons/RepeatIcon";
import { TargetIcon } from "@/components/icons/TargetIcon";
import { TransferIcon } from "@/components/icons/TransferIcon";
import { WalletIcon } from "@/components/icons/WalletIcon";
import type { IconProps } from "@/components/icons/types";
import { DASHBOARD_PATH } from "@/lib/auth/constants";

export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly Icon: ComponentType<IconProps>;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: DASHBOARD_PATH, label: "Strona Główna", Icon: HomeIcon },
  { href: "/transactions", label: "Transakcje", Icon: TransferIcon },
  { href: "/budgets", label: "Budżet i Limity", Icon: WalletIcon },
  { href: "/goals", label: "Cele Oszczędnościowe", Icon: TargetIcon },
  { href: "/analytics", label: "Analityka i Raporty", Icon: BarChartIcon },
  {
    href: "/recurring-payments",
    label: "Płatności Cykliczne",
    Icon: RepeatIcon,
  },
];

// A nested route such as /transactions/new keeps "Transakcje" active.
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
