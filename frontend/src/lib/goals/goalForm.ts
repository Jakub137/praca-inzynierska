import {
  type FieldMessages,
  type FormParseResult,
  pickFieldErrors,
} from "@/lib/forms/fieldErrors";
import { validateTargetDate } from "@/lib/goals/targetDate";
import {
  AMOUNT_INPUT_MAX_LENGTH,
  parseAmount,
  validateAmount,
} from "@/lib/transactions/transactionForm";
import type { FieldError, SavingsGoalRequest } from "@/types/api";

// Same limit as @Size(max = 100) on SavingsGoalCommand, VARCHAR(100) in V3_1 and maxLength of the input.
export const GOAL_NAME_MAX_LENGTH = 100;

// Same limit as @Digits(integer = 10, fraction = 2) on SavingsGoalCommand.
export const GOAL_AMOUNT_INPUT_MAX_LENGTH = AMOUNT_INPUT_MAX_LENGTH;

// Copied 1:1 from the annotations of SavingsGoalCommand (@NotBlank and @Size on name).
const NAME_REQUIRED_MESSAGE = "Nazwa celu jest wymagana";
const NAME_TOO_LONG_MESSAGE = `Nazwa celu może mieć maksymalnie ${GOAL_NAME_MAX_LENGTH} znaków`;

// Order of the fields in the form: the first invalid one gets the focus.
export const GOAL_FORM_FIELDS = ["name", "targetAmount", "targetDate"] as const;

export type GoalFormField = (typeof GOAL_FORM_FIELDS)[number];

export type GoalFormValues = { readonly [Field in GoalFormField]: string };

export type GoalFormErrors = FieldMessages<GoalFormField>;

export type GoalFormResult = FormParseResult<GoalFormField, SavingsGoalRequest>;

export function createEmptyGoalValues(): GoalFormValues {
  return { name: "", targetAmount: "", targetDate: "" };
}

function validateName(raw: string): string | null {
  const length = raw.trim().length;
  if (length === 0) {
    return NAME_REQUIRED_MESSAGE;
  }
  if (length > GOAL_NAME_MAX_LENGTH) {
    return NAME_TOO_LONG_MESSAGE;
  }
  return null;
}

// The amount rules and messages are shared with the transaction form (validateAmount, parseAmount).
// "today" is the calendar day in the business zone, read when the dialog was opened.
export function parseGoalForm(
  values: GoalFormValues,
  today: string,
): GoalFormResult {
  const name = validateName(values.name);
  const targetAmount = validateAmount(values.targetAmount);
  const targetDate = validateTargetDate(values.targetDate, today);
  if (name !== null || targetAmount !== null || targetDate !== null) {
    return {
      status: "invalid",
      errors: {
        ...(name !== null && { name }),
        ...(targetAmount !== null && { targetAmount }),
        ...(targetDate !== null && { targetDate }),
      },
    };
  }
  return {
    status: "valid",
    request: {
      name: values.name.trim(),
      targetAmount: parseAmount(values.targetAmount),
      targetDate: values.targetDate,
    },
  };
}

export function mapGoalServerErrors(
  fieldErrors: readonly FieldError[] | undefined,
): GoalFormErrors {
  return pickFieldErrors(GOAL_FORM_FIELDS, fieldErrors);
}
