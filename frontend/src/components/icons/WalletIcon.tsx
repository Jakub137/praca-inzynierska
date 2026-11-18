import type { IconProps } from "@/components/icons/types";

export function WalletIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M16 7V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1" />
      <circle cx="16" cy="13" r="1" />
    </svg>
  );
}
