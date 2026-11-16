import type { IconProps } from "@/components/icons/types";

export function EyeOffIcon({ className }: IconProps) {
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
      <path d="M22 12C22 12 18 6 12 6C6 6 2 12 2 12C2 12 6 18 12 18C18 18 22 12 22 12Z" />
      <path d="M15 12C15 13.657 13.657 15 12 15C10.343 15 9 13.657 9 12C9 10.343 10.343 9 12 9C13.657 9 15 10.343 15 12Z" />
      <path d="M4 4L20 20" />
    </svg>
  );
}
