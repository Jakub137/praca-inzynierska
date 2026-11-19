"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { useCategories } from "@/hooks/useCategories";
import {
  buildTransactionsHref,
  FIRST_PAGE,
  parseCategoryId,
  parseTransactionType,
  type TransactionFilters,
} from "@/lib/transactions/filters";
import type { MonthOption } from "@/lib/transactions/months";
import type { CategoryResponse } from "@/types/api";

// Value of the "all" option in every filter.
const ALL_VALUE = "";

type TransactionsFiltersProps = {
  filters: TransactionFilters;
  monthOptions: readonly MonthOption[];
};

// The address (and so the "filters" prop) changes only after the server render.
// Until then the controls show the chosen values; a new "filters" object ends the pending state.
type PendingFilters = {
  readonly base: TransactionFilters;
  readonly next: TransactionFilters;
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

export function TransactionsFilters({
  filters,
  monthOptions,
}: TransactionsFiltersProps) {
  const router = useRouter();
  const categoriesState = useCategories();
  const [pending, setPending] = useState<PendingFilters | null>(null);
  const shown =
    pending !== null && pending.base === filters ? pending.next : filters;
  // A failed or pending category request leaves only "Wszystkie kategorie"; the page keeps working.
  const categories: readonly CategoryResponse[] =
    categoriesState.status === "ready" ? categoriesState.categories : [];

  // Every filter change goes back to the first page.
  function applyFilters(change: Partial<TransactionFilters>) {
    const next = { ...shown, ...change, page: FIRST_PAGE };
    setPending({ base: filters, next });
    router.push(buildTransactionsHref(next), { scroll: false });
  }

  return (
    <div
      role="group"
      aria-label="Filtry transakcji"
      className="flex flex-col gap-4 sm:flex-row sm:flex-wrap"
    >
      <SelectField
        id="transactions-filter-month"
        label="Okres"
        value={shown.month ?? ALL_VALUE}
        onChange={(value) =>
          applyFilters({ month: value === ALL_VALUE ? null : value })
        }
      >
        <option value={ALL_VALUE}>Wszystkie okresy</option>
        {monthOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        id="transactions-filter-type"
        label="Typ"
        value={shown.type ?? ALL_VALUE}
        onChange={(value) =>
          applyFilters({ type: parseTransactionType(value) })
        }
      >
        <option value={ALL_VALUE}>Wszystkie typy</option>
        <option value="EXPENSE">Wydatki</option>
        <option value="INCOME">Przychody</option>
      </SelectField>
      <SelectField
        id="transactions-filter-category"
        label="Kategoria"
        value={shown.categoryId === null ? ALL_VALUE : String(shown.categoryId)}
        onChange={(value) =>
          applyFilters({ categoryId: parseCategoryId(value) })
        }
      >
        <option value={ALL_VALUE}>Wszystkie kategorie</option>
        <CategoryGroup
          label="Wydatki"
          categories={categories.filter(
            (category) => category.type === "EXPENSE",
          )}
        />
        <CategoryGroup
          label="Przychody"
          categories={categories.filter(
            (category) => category.type === "INCOME",
          )}
        />
      </SelectField>
    </div>
  );
}
