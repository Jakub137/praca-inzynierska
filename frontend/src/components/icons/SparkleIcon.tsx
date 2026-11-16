import type { IconProps } from "@/components/icons/types";

export function SparkleIcon({ className }: IconProps) {
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
      <path d="M11 6L12.8 10.2L17 12L12.8 13.8L11 18L9.2 13.8L5 12L9.2 10.2L11 6Z" />
      <path d="M18.5 4V8" />
      <path d="M16.5 6H20.5" />
    </svg>
  );
}
