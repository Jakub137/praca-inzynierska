import type { ComponentPropsWithRef } from "react";
import { PRIMARY_ACTION, SECONDARY_ACTION } from "@/lib/buttonStyles";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
};

const DISABLED_CLASSES = "disabled:cursor-not-allowed disabled:opacity-60";

const VARIANT_CLASSES: Readonly<Record<ButtonVariant, string>> = {
  primary: `${PRIMARY_ACTION} ${DISABLED_CLASSES}`,
  secondary: `${SECONDARY_ACTION} ${DISABLED_CLASSES}`,
};

// A <button> in the two styles of the app; links keep using PRIMARY_ACTION directly.
export function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  const base = VARIANT_CLASSES[variant];
  const classes = className === undefined ? base : `${base} ${className}`;
  return <button type={type} className={classes} {...props} />;
}
