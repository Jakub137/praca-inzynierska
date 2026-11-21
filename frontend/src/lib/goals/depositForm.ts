import {
  type FieldMessages,
  type FormParseResult,
  pickFieldErrors,
} from "@/lib/forms/fieldErrors";
import {
  AMOUNT_INPUT_MAX_LENGTH,
  parseAmount,
  validateAmount,
} from "@/lib/transactions/transactionForm";
import type { DepositToGoalRequest, FieldError } from "@/types/api";

// Same limit as @Digits(integer = 10, fraction = 2) on DepositToGoalCommand.
export const DEPOSIT_AMOUNT_INPUT_MAX_LENGTH = AMOUNT_INPUT_MAX_LENGTH;

export const DEPOSIT_FORM_FIELDS = ["amount"] as const;

export type DepositFormField = (typeof DEPOSIT_FORM_FIELDS)[number];

export type DepositFormValues = {
  readonly [Field in DepositFormField]: string;
};

export type DepositFormErrors = FieldMessages<DepositFormField>;

export type DepositFormResult = FormParseResult<
  DepositFormField,
  DepositToGoalRequest
>;

export function createEmptyDepositValues(): DepositFormValues {
  return { amount: "" };
}

// The amount rules and messages are shared with the transaction form (validateAmount, parseAmount).
// The cap on the total of the deposits (9 999 999 999,99) is checked only by the backend: it knows the sum.
export function parseDepositForm(values: DepositFormValues): DepositFormResult {
  const amount = validateAmount(values.amount);
  if (amount !== null) {
    return { status: "invalid", errors: { amount } };
  }
  return {
    status: "valid",
    request: { amount: parseAmount(values.amount) },
  };
}

export function mapDepositServerErrors(
  fieldErrors: readonly FieldError[] | undefined,
): DepositFormErrors {
  return pickFieldErrors(DEPOSIT_FORM_FIELDS, fieldErrors);
}
