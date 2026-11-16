import type { IconProps } from "@/components/icons/types";

export function AlertCircleIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12.5" />
      <path d="M12 16H12.01" />
    </svg>
  );
}
