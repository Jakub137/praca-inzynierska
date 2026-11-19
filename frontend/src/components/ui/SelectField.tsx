import type { ReactNode } from "react";
import { FOCUS_RING } from "@/lib/focusRing";

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: SelectFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:w-56">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-h-11 w-full rounded-lg border border-input-border bg-card px-3 text-sm text-ink ${FOCUS_RING}`}
      >
        {children}
      </select>
    </div>
  );
}
