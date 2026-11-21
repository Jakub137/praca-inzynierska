import type { BudgetPeriod } from "@/lib/budgets/period";
import {
  AMOUNT_INPUT_MAX_LENGTH,
  parseAmount,
  validateAmount,
} from "@/lib/transactions/transactionForm";
import type {
  BudgetUsageResponse,
  CategoryResponse,
  FieldError,
  SetBudgetLimitRequest,
} from "@/types/api";

// Same limit as @Digits(integer = 10, fraction = 2) on SetBudgetLimitCommand.
export const LIMIT_AMOUNT_INPUT_MAX_LENGTH = AMOUNT_INPUT_MAX_LENGTH;

// Display only: the thresholds live in BudgetUsageCalculator on the backend
// (WARNING_THRESHOLD_PERCENT, EXCEEDED_THRESHOLD_PERCENT). Change this text together with them.
const WARNING_THRESHOLD_PERCENT = 80;
const EXCEEDED_THRESHOLD_PERCENT = 100;

export const LIMIT_THRESHOLD_HINT = `Ostrzeżenie pojawi się po wykorzystaniu ${WARNING_THRESHOLD_PERCENT}% limitu, a przekroczenie od ${EXCEEDED_THRESHOLD_PERCENT}%. Progi są takie same dla wszystkich limitów.`;

// Order of the fields in the form: the first invalid one gets the focus.
export const LIMIT_FORM_FIELDS = ["categoryId", "limitAmount"] as const;

export type LimitFormField = (typeof LIMIT_FORM_FIELDS)[number];

export type LimitFormValues = {
  // Id of the chosen category as text; "" means none.
  readonly categoryId: string;
  readonly limitAmount: string;
};

export type LimitFormErrors = {
  readonly [Field in LimitFormField]?: string;
};

export type LimitFormResult =
  | { readonly status: "invalid"; readonly errors: LimitFormErrors }
  | { readonly status: "valid"; readonly request: SetBudgetLimitRequest };

export function createEmptyLimitValues(): LimitFormValues {
  return { categoryId: "", limitAmount: "" };
}

// No thousands separator: the amount pattern does not accept spaces.
export function toLimitFormValues(limit: BudgetUsageResponse): LimitFormValues {
  return {
    categoryId: String(limit.categoryId),
    limitAmount: limit.limitAmount.toFixed(2).replace(".", ","),
  };
}

// The backend rejects income categories; a category that already has a limit this month is edited, not added.
export function getAssignableCategories(
  categories: readonly CategoryResponse[],
  takenCategoryIds: readonly number[],
): readonly CategoryResponse[] {
  return categories.filter(
    (category) =>
      category.type === "EXPENSE" && !takenCategoryIds.includes(category.id),
  );
}

// The period always comes from the month shown in the view, never from the backend default.
export function parseLimitForm(
  values: LimitFormValues,
  allowedCategoryIds: readonly number[],
  period: BudgetPeriod,
): LimitFormResult {
  const categoryId = allowedCategoryIds.find(
    (id) => String(id) === values.categoryId,
  );
  const amountError = validateAmount(values.limitAmount);
  if (categoryId === undefined || amountError !== null) {
    return {
      status: "invalid",
      errors: {
        ...(categoryId === undefined && { categoryId: "Wybierz kategorię." }),
        ...(amountError !== null && { limitAmount: amountError }),
      },
    };
  }
  return {
    status: "valid",
    request: {
      categoryId,
      month: period.month,
      year: period.year,
      limitAmount: parseAmount(values.limitAmount),
    },
  };
}

// 400 fieldErrors of the backend for the fields this form has; other fields are left to the general message.
export function mapServerFieldErrors(
  fieldErrors: readonly FieldError[] | undefined,
): LimitFormErrors {
  return Object.fromEntries(
    LIMIT_FORM_FIELDS.flatMap((field) => {
      const match = fieldErrors?.find((error) => error.field === field);
      return match === undefined ? [] : [[field, match.message]];
    }),
  );
}
