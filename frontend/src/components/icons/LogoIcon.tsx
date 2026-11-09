import type { IconProps } from "@/components/icons/types";

export function LogoIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 199 183"
      width="1em"
      height="1em"
      fill="none"
      stroke="white"
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="currentColor"
        stroke="none"
        d="M155.22 0H43.78C19.601 0 0 18.025 0 40.26V142.74C0 164.975 19.601 183 43.78 183H155.22C179.399 183 199 164.975 199 142.74V40.26C199 18.025 179.399 0 155.22 0Z"
      />
      <path d="M69.658 71.3699H129.358C134.853 71.3699 139.308 75.4665 139.308 80.5199V120.78C139.308 125.833 134.853 129.93 129.358 129.93H69.658C64.1628 129.93 59.708 125.833 59.708 120.78V80.5199C59.708 75.4665 64.1628 71.3699 69.658 71.3699Z" />
      <path d="M71.6479 51.24L129.358 51.24" />
      <path
        fill="currentColor"
        strokeWidth={2}
        d="M144.359 94.7678H132.217C129.982 94.7678 128.169 96.5235 128.169 98.6893V103.918C128.169 106.084 129.982 107.839 132.217 107.839H144.359C146.595 107.839 148.407 106.084 148.407 103.918V98.6893C148.407 96.5235 146.595 94.7678 144.359 94.7678Z"
      />
      <path d="M129.358 51.24V67.71" />
      <path d="M69.6582 51.24C59.0449 57.34 59.7082 73.2 59.7082 79.605" />
    </svg>
  );
}
