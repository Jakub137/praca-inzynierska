import {
  type FieldMessages,
  type FormParseResult,
  pickFieldErrors,
} from "@/lib/forms/fieldErrors";
import { DEFAULT_FREQUENCY, parseFrequency } from "@/lib/recurring/frequency";
import { validateNextDueDate } from "@/lib/recurring/nextDueDate";
import {
  AMOUNT_INPUT_MAX_LENGTH,
  parseAmount,
  parseCurrency,
  validateAmount,
} from "@/lib/transactions/transactionForm";
import type {
  CategoryResponse,
  FieldError,
  RecurringPaymentRequest,
} from "@/types/api";

// Same limit as @Size(max = 100) on RecurringPaymentCommand, VARCHAR(100) in V3_2 and maxLength of the input.
export const RECURRING_NAME_MAX_LENGTH = 100;

// Same limit as @Digits(integer = 10, fraction = 2) on RecurringPaymentCommand.
export const RECURRING_AMOUNT_INPUT_MAX_LENGTH = AMOUNT_INPUT_MAX_LENGTH;

// Copied 1:1 from the annotations of RecurringPaymentCommand.
const NAME_REQUIRED_MESSAGE = "Nazwa płatności jest wymagana";
const NAME_TOO_LONG_MESSAGE = `Nazwa płatności może mieć maksymalnie ${RECURRING_NAME_MAX_LENGTH} znaków`;
const CURRENCY_REQUIRED_MESSAGE = "Waluta jest wymagana";
const CATEGORY_REQUIRED_MESSAGE = "Kategoria jest wymagana";
const FREQUENCY_REQUIRED_MESSAGE = "Częstotliwość jest wymagana";

// Order of the fields in the form: the first invalid one gets the focus.
export const RECURRING_FORM_FIELDS = [
  "name",
  "amount",
  "currency",
  "categoryId",
  "frequency",
  "nextDueDate",
] as const;

export type RecurringFormField = (typeof RECURRING_FORM_FIELDS)[number];

export type RecurringFormValues = {
  readonly [Field in RecurringFormField]: string;
};

export type RecurringFormErrors = FieldMessages<RecurringFormField>;

export type RecurringFormResult = FormParseResult<
  RecurringFormField,
  RecurringPaymentRequest
>;

// The currency and the frequency start with a value, and their selects cannot be emptied.
export function createEmptyRecurringValues(): RecurringFormValues {
  return {
    name: "",
    amount: "",
    currency: "PLN",
    categoryId: "",
    frequency: DEFAULT_FREQUENCY,
    nextDueDate: "",
  };
}

// The backend accepts only an expense category; the select offers nothing else.
export function getExpenseCategories(
  categories: readonly CategoryResponse[],
): readonly CategoryResponse[] {
  return categories.filter((category) => category.type === "EXPENSE");
}

function validateName(raw: string): string | null {
  const length = raw.trim().length;
  if (length === 0) {
    return NAME_REQUIRED_MESSAGE;
  }
  if (length > RECURRING_NAME_MAX_LENGTH) {
    return NAME_TOO_LONG_MESSAGE;
  }
  return null;
}

function parseCategoryId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// The amount rules and messages are shared with the transaction form (validateAmount, parseAmount).
// "today" is the calendar day in the business zone, read when the dialog was opened.
// An empty currency or frequency cannot come from the selects; the messages only keep the types honest.
export function parseRecurringForm(
  values: RecurringFormValues,
  today: string,
): RecurringFormResult {
  const name = validateName(values.name);
  const amount = validateAmount(values.amount);
  const currency = parseCurrency(values.currency);
  const categoryId = parseCategoryId(values.categoryId);
  const frequency = parseFrequency(values.frequency);
  const nextDueDate = validateNextDueDate(values.nextDueDate, today);
  if (
    name !== null ||
    amount !== null ||
    currency === null ||
    categoryId === null ||
    frequency === null ||
    nextDueDate !== null
  ) {
    return {
      status: "invalid",
      errors: {
        ...(name !== null && { name }),
        ...(amount !== null && { amount }),
        ...(currency === null && { currency: CURRENCY_REQUIRED_MESSAGE }),
        ...(categoryId === null && { categoryId: CATEGORY_REQUIRED_MESSAGE }),
        ...(frequency === null && { frequency: FREQUENCY_REQUIRED_MESSAGE }),
        ...(nextDueDate !== null && { nextDueDate }),
      },
    };
  }
  return {
    status: "valid",
    request: {
      name: values.name.trim(),
      amount: parseAmount(values.amount),
      currency,
      frequency,
      nextDueDate: values.nextDueDate,
      categoryId,
    },
  };
}

export function mapRecurringServerErrors(
  fieldErrors: readonly FieldError[] | undefined,
): RecurringFormErrors {
  return pickFieldErrors(RECURRING_FORM_FIELDS, fieldErrors);
}
