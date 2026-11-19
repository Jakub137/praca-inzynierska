"use client";

import { useId } from "react";
import { FormInput } from "@/components/ui/FormInput";
import { SelectField } from "@/components/ui/SelectField";
import type { TransactionFormState } from "@/hooks/useTransactionForm";
import { buildAmountHint } from "@/lib/transactions/nbpNotice";
import {
  AMOUNT_INPUT_MAX_LENGTH,
  CURRENCY_OPTIONS,
  DESCRIPTION_MAX_LENGTH,
  parseCurrency,
} from "@/lib/transactions/transactionForm";
import type { CategoryResponse, CurrencyRateResponse } from "@/types/api";

export type CategoriesStatus = "loading" | "ready" | "error";

const CATEGORIES_ERROR =
  "Nie udało się wczytać kategorii. Zamknij okno i spróbuj ponownie.";

type TransactionFormFieldsProps = {
  form: TransactionFormState;
  categories: readonly CategoryResponse[];
  categoriesStatus: CategoriesStatus;
  // Empty while the rates load or when the request failed.
  rates: readonly CurrencyRateResponse[];
};

type CategoryGroupProps = {
  label: string;
  categories: readonly CategoryResponse[];
};

function CategoryGroup({ label, categories }: CategoryGroupProps) {
  if (categories.length === 0) {
    return null;
  }
  return (
    <optgroup label={label}>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </optgroup>
  );
}

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
      <CategoryGroup
        label="Wydatki"
        categories={categories.filter(
          (category) => category.type === "EXPENSE",
        )}
      />
      <CategoryGroup
        label="Przychody"
        categories={categories.filter((category) => category.type === "INCOME")}
      />
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

export function TransactionFormFields({
  form,
  categories,
  categoriesStatus,
  rates,
}: TransactionFormFieldsProps) {
  const idPrefix = useId();
  const { values, errors, refs, setField } = form;

  // Destructured on purpose: after ref={refs.amount}, react-hooks/refs
  // reports every later refs.* read (facebook/react#34775).
  const {
    amount: amountRef,
    description: descriptionRef,
    categoryId: categoryIdRef,
    date: dateRef,
  } = refs;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">Pola oznaczone * są wymagane.</p>
      <div className="grid grid-cols-[minmax(0,1fr)_9rem] items-start gap-3">
        <FormInput
          ref={amountRef}
          label="Kwota transakcji *"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          maxLength={AMOUNT_INPUT_MAX_LENGTH}
          value={values.amount}
          onChange={(event) => setField("amount", event.target.value)}
          hint={buildAmountHint(values.amount, values.currency, rates)}
          error={errors.amount}
        />
        <SelectField
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
          error=""
        >
          {CURRENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>
      <FormInput
        ref={descriptionRef}
        label="Opis transakcji *"
        name="description"
        autoComplete="off"
        maxLength={DESCRIPTION_MAX_LENGTH}
        value={values.description}
        onChange={(event) => setField("description", event.target.value)}
        error={errors.description}
      />
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
      <FormInput
        ref={dateRef}
        label="Data transakcji *"
        name="date"
        type="date"
        value={values.date}
        onChange={(event) => setField("date", event.target.value)}
        error={errors.date}
      />
    </div>
  );
}
