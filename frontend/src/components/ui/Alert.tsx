import type { ReactNode, Ref } from "react";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { FOCUS_RING } from "@/lib/focusRing";

type AlertProps = {
  variant: "error" | "success";
  children: ReactNode;
  // Lets the parent move the focus to the message; the alert is then focusable by script only (tabIndex -1).
  ref?: Ref<HTMLDivElement>;
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

export function Alert({ variant, children, ref }: AlertProps) {
  const { role, surface, iconColor, Icon } = VARIANTS[variant];

  return (
    <div
      ref={ref}
      tabIndex={ref === undefined ? undefined : -1}
      role={role}
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm text-ink focus-visible:outline-hidden ${FOCUS_RING} ${surface}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} />
      <p>{children}</p>
    </div>
  );
}
