import type { IconProps } from "@/components/icons/types";

export function RepeatIcon({ className }: IconProps) {
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
      <path d="m17 4 3 3-3 3" />
      <path d="M4 11v-1a3 3 0 0 1 3-3h13" />
      <path d="m7 20-3-3 3-3" />
      <path d="M20 13v1a3 3 0 0 1-3 3H4" />
    </svg>
  );
}
