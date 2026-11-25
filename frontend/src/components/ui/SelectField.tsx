import type { ReactElement, ReactNode, Ref } from "react";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";
import { FOCUS_RING } from "@/lib/focusRing";

// Room for the AI badge (about 11 rem) before the arrow; on narrow screens the badge sits below the field.
const BADGE_END_PADDING = "sm:pr-56";

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  // Drops the fixed width of the filter bar, for use inside forms.
  fullWidth?: boolean;
  // undefined or "": no message and no room kept for it (the form grows when one appears). Text: message shown.
  error?: string;
  // Badge placed over the field box (the badge positions itself); null or undefined: none.
  badge?: ReactElement | null;
  // Id of the badge element: it joins aria-describedby while the badge is shown.
  badgeId?: string;
  ref?: Ref<HTMLSelectElement>;
};

function joinIds(ids: readonly (string | undefined)[]): string | undefined {
  const present = ids.filter((id): id is string => id !== undefined);
  return present.length === 0 ? undefined : present.join(" ");
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
  disabled,
  fullWidth = false,
  error,
  badge,
  badgeId,
  ref,
}: SelectFieldProps) {
  const errorId = `${id}-error`;
  const hasError = error !== undefined && error !== "";
  const hasBadge = badge !== undefined && badge !== null;
  const borderClass = hasError ? "border-danger" : "border-input-border";
  const widthClass = fullWidth ? "" : "sm:w-56";
  const paddingClass = hasBadge ? BADGE_END_PADDING : "";
  const describedBy = joinIds([
    hasError ? errorId : undefined,
    hasBadge ? badgeId : undefined,
  ]);

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${widthClass}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-11 w-full rounded-lg border bg-card px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-60 ${borderClass} ${paddingClass} ${FOCUS_RING}`}
        >
          {children}
        </select>
        {badge}
      </div>
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
  );
}
