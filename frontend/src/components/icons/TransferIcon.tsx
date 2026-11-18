import type { IconProps } from "@/components/icons/types";

export function TransferIcon({ className }: IconProps) {
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
      <path d="M5 8h13" />
      <path d="m15 5 3 3-3 3" />
      <path d="M19 16H6" />
      <path d="m9 13-3 3 3 3" />
    </svg>
  );
}
