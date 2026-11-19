import type { ReactNode, Ref } from "react";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";
import { FOCUS_RING } from "@/lib/focusRing";

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  // Drops the fixed width of the filter bar, for use inside forms.
  fullWidth?: boolean;
  // undefined: no message slot (filters). "": slot reserved, no message. Text: message shown.
  error?: string;
  ref?: Ref<HTMLSelectElement>;
};

export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
  disabled,
  fullWidth = false,
  error,
  ref,
}: SelectFieldProps) {
  const errorId = `${id}-error`;
  const hasError = error !== undefined && error !== "";
  const borderClass = hasError ? "border-danger" : "border-input-border";
  const widthClass = fullWidth ? "" : "sm:w-56";

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${widthClass}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`min-h-11 w-full rounded-lg border bg-card px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-60 ${borderClass} ${FOCUS_RING}`}
      >
        {children}
      </select>
      {error !== undefined && (
        <div className="min-h-5">
          {hasError && (
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
      )}
    </div>
  );
}
