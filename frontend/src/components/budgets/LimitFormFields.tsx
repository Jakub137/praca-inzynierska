"use client";

import { useId } from "react";
import type { CategoriesStatus } from "@/components/transactions/TransactionFormFields";
import { FormInput } from "@/components/ui/FormInput";
import { SelectField } from "@/components/ui/SelectField";
import type { LimitFormState } from "@/hooks/useLimitForm";
import {
  LIMIT_AMOUNT_INPUT_MAX_LENGTH,
  LIMIT_THRESHOLD_HINT,
} from "@/lib/budgets/limitForm";
import type { CategoryResponse } from "@/types/api";

const CATEGORIES_ERROR =
  "Nie udało się wczytać kategorii. Zamknij okno i spróbuj ponownie.";

export type LimitCategoryField =
  // Edit mode: the category is shown as text and cannot change.
  | { readonly kind: "locked"; readonly name: string }
  // Create mode: the user picks one of the free expense categories.
  | {
      readonly kind: "select";
      readonly status: CategoriesStatus;
      readonly options: readonly CategoryResponse[];
    };

type LimitFormFieldsProps = {
  form: LimitFormState;
  periodLabel: string;
  category: LimitCategoryField;
};

type CategoryOptionsProps = {
  status: CategoriesStatus;
  options: readonly CategoryResponse[];
};

function CategoryOptions({ status, options }: CategoryOptionsProps) {
  if (status === "loading") {
    return <option value="">Ładowanie kategorii…</option>;
  }
  if (status === "error") {
    return <option value="">Kategorie niedostępne</option>;
  }
  return (
    <>
      <option value="">Wybierz kategorię</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </>
  );
}

// A failed category request is shown at the field; "" keeps the message slot reserved.
function getCategoryError(
  status: CategoriesStatus,
  message: string | undefined,
): string {
  if (status === "error") {
    return CATEGORIES_ERROR;
  }
  return message ?? "";
}

export function LimitFormFields({
  form,
  periodLabel,
  category,
}: LimitFormFieldsProps) {
  const categoryFieldId = useId();
  const { values, errors, refs, setField } = form;

  // Destructured on purpose: after ref={…}, react-hooks/refs reports every later refs.* read.
  const { categoryId: categoryIdRef, limitAmount: limitAmountRef } = refs;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">Pola oznaczone * są wymagane.</p>
      <dl className="mb-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">Miesiąc</dt>
        <dd className="font-medium text-ink">{periodLabel}</dd>
        {category.kind === "locked" && (
          <>
            <dt className="text-muted">Kategoria</dt>
            <dd className="font-medium wrap-break-word text-ink">
              {category.name}
            </dd>
          </>
        )}
      </dl>
      {category.kind === "select" && (
        <SelectField
          ref={categoryIdRef}
          id={categoryFieldId}
          label="Kategoria *"
          value={values.categoryId}
          onChange={(value) => setField("categoryId", value)}
          disabled={category.status !== "ready"}
          fullWidth
          error={getCategoryError(category.status, errors.categoryId)}
        >
          <CategoryOptions
            status={category.status}
            options={category.options}
          />
        </SelectField>
      )}
      <FormInput
        ref={limitAmountRef}
        label="Limit miesięczny (PLN) *"
        name="limitAmount"
        inputMode="decimal"
        autoComplete="off"
        maxLength={LIMIT_AMOUNT_INPUT_MAX_LENGTH}
        value={values.limitAmount}
        onChange={(event) => setField("limitAmount", event.target.value)}
        hint={LIMIT_THRESHOLD_HINT}
        error={errors.limitAmount}
      />
    </div>
  );
}
