import type { ReactNode } from "react";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";
import { CheckIcon } from "@/components/icons/CheckIcon";

type AlertProps = {
  variant: "error" | "success";
  children: ReactNode;
};

const VARIANTS = {
  error: {
    role: "alert",
    surface: "border-danger bg-card",
    iconColor: "text-danger",
    Icon: AlertCircleIcon,
  },
  success: {
    role: "status",
    surface: "border-success bg-card",
    iconColor: "text-success",
    Icon: CheckIcon,
  },
} as const;

export function Alert({ variant, children }: AlertProps) {
  const { role, surface, iconColor, Icon } = VARIANTS[variant];

  return (
    <div
      role={role}
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm text-ink ${surface}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} />
      <p>{children}</p>
    </div>
  );
}
