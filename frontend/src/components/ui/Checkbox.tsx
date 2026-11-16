"use client";

import { useId, type ComponentProps } from "react";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";

type CheckboxProps = Omit<
  ComponentProps<"input">,
  "type" | "id" | "className" | "aria-invalid" | "aria-describedby"
> & {
  label: string;
  error?: string;
};

export function Checkbox({ label, error, ...inputProps }: CheckboxProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div>
      <div className="flex min-h-11 items-center gap-3">
        <input
          {...inputProps}
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="size-6 shrink-0 accent-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-hidden"
        />
        <label htmlFor={inputId} className="text-sm text-ink">
          {label}
        </label>
      </div>
      <div className="min-h-5">
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
