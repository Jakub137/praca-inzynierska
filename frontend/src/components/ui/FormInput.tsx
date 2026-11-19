"use client";

import { useId, useState, type ComponentProps } from "react";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { EyeOffIcon } from "@/components/icons/EyeOffIcon";

const SHOW_PASSWORD_LABEL = "Pokaż hasło";
const HIDE_PASSWORD_LABEL = "Ukryj hasło";

type FormInputProps = Omit<
  ComponentProps<"input">,
  "type" | "id" | "className" | "aria-invalid" | "aria-describedby"
> & {
  label: string;
  type?: "text" | "email" | "password" | "date";
  error?: string;
  hint?: string;
};

export function FormInput({
  label,
  type = "text",
  error,
  hint,
  ...inputProps
}: FormInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword && isPasswordVisible ? "text" : type;
  const borderClass = error ? "border-danger" : "border-input-border";
  const paddingClass = isPassword ? "pr-12" : "";
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          {...inputProps}
          id={inputId}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-lg border bg-card px-3 text-base text-ink placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 ${borderClass} ${paddingClass}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={
              isPasswordVisible ? HIDE_PASSWORD_LABEL : SHOW_PASSWORD_LABEL
            }
            disabled={inputProps.disabled}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden focus-visible:ring-inset disabled:cursor-not-allowed"
          >
            {isPasswordVisible ? (
              <EyeOffIcon className="size-5" />
            ) : (
              <EyeIcon className="size-5" />
            )}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-1 min-h-5">
        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-start gap-1 text-sm text-danger"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
