import type { IconProps } from "@/components/icons/types";

export function SearchIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="345.5 133.5 20 20"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M361.175 140.708C361.175 144.246 358.012 147.114 354.109 147.114C350.206 147.114 347.043 144.246 347.043 140.708C347.043 137.17 350.206 134.302 354.109 134.302C358.012 134.302 361.175 137.17 361.175 140.708Z" />
      <path d="M359.997 146.046L364.708 150.317" />
    </svg>
  );
}
