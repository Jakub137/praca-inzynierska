"use client";

import { useId } from "react";
import type { CategoriesStatus } from "@/components/transactions/TransactionFormFields";
import { FormInput } from "@/components/ui/FormInput";
import { SelectField } from "@/components/ui/SelectField";
import type { RecurringPaymentFormState } from "@/hooks/useRecurringPaymentForm";
import { FREQUENCY_OPTIONS, parseFrequency } from "@/lib/recurring/frequency";
import { MAX_NEXT_DUE_DATE } from "@/lib/recurring/nextDueDate";
import {
  RECURRING_AMOUNT_INPUT_MAX_LENGTH,
  RECURRING_NAME_MAX_LENGTH,
} from "@/lib/recurring/recurringForm";
import {
  CURRENCY_OPTIONS,
  parseCurrency,
} from "@/lib/transactions/transactionForm";
import type { CategoryResponse } from "@/types/api";

const CATEGORIES_ERROR =
  "Nie udało się wczytać kategorii. Zamknij okno i spróbuj ponownie.";

type RecurringPaymentFormFieldsProps = {
  form: RecurringPaymentFormState;
  // Only the expense categories: the backend rejects an income category.
  categories: readonly CategoryResponse[];
  categoriesStatus: CategoriesStatus;
  // Calendar day (RRRR-MM-DD, business zone) read when the dialog was opened.
  today: string;
};

type CategoryOptionsProps = {
  status: CategoriesStatus;
  categories: readonly CategoryResponse[];
};

function CategoryOptions({ status, categories }: CategoryOptionsProps) {
  if (status === "loading") {
    return <option value="">Ładowanie kategorii…</option>;
  }
  if (status === "error") {
    return <option value="">Kategorie niedostępne</option>;
  }
  return (
    <>
      <option value="">Wybierz kategorię</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
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

export function RecurringPaymentFormFields({
  form,
  categories,
  categoriesStatus,
  today,
}: RecurringPaymentFormFieldsProps) {
  const idPrefix = useId();
  const { values, errors, refs, setField } = form;

  // Destructured on purpose: after ref={…}, react-hooks/refs reports every later refs.* read.
  const {
    name: nameRef,
    amount: amountRef,
    currency: currencyRef,
    categoryId: categoryIdRef,
    frequency: frequencyRef,
    nextDueDate: nextDueDateRef,
  } = refs;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">Pola oznaczone * są wymagane.</p>
      <FormInput
        ref={nameRef}
        label="Nazwa płatności *"
        name="name"
        autoComplete="off"
        maxLength={RECURRING_NAME_MAX_LENGTH}
        placeholder="np. Netflix"
        value={values.name}
        onChange={(event) => setField("name", event.target.value)}
        error={errors.name}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_9rem] items-start gap-3">
        <FormInput
          ref={amountRef}
          label="Kwota *"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          maxLength={RECURRING_AMOUNT_INPUT_MAX_LENGTH}
          value={values.amount}
          onChange={(event) => setField("amount", event.target.value)}
          error={errors.amount}
        />
        <SelectField
          ref={currencyRef}
          id={`${idPrefix}-currency`}
          label="Waluta"
          value={values.currency}
          onChange={(value) => {
            const currency = parseCurrency(value);
            if (currency !== null) {
              setField("currency", currency);
            }
          }}
          fullWidth
          error={errors.currency ?? ""}
        >
          {CURRENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>
      <SelectField
        ref={categoryIdRef}
        id={`${idPrefix}-category`}
        label="Kategoria *"
        value={values.categoryId}
        onChange={(value) => setField("categoryId", value)}
        disabled={categoriesStatus !== "ready"}
        fullWidth
        error={getCategoryError(categoriesStatus, errors.categoryId)}
      >
        <CategoryOptions status={categoriesStatus} categories={categories} />
      </SelectField>
      <SelectField
        ref={frequencyRef}
        id={`${idPrefix}-frequency`}
        label="Cykl rozliczeniowy *"
        value={values.frequency}
        onChange={(value) => {
          const frequency = parseFrequency(value);
          if (frequency !== null) {
            setField("frequency", frequency);
          }
        }}
        fullWidth
        error={errors.frequency ?? ""}
      >
        {FREQUENCY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <FormInput
        ref={nextDueDateRef}
        label="Data najbliższej płatności *"
        name="nextDueDate"
        type="date"
        min={today}
        max={MAX_NEXT_DUE_DATE}
        value={values.nextDueDate}
        onChange={(event) => setField("nextDueDate", event.target.value)}
        error={errors.nextDueDate}
      />
    </div>
  );
}
