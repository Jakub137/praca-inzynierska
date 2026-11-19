import type {
  CategoryResponse,
  CreateTransactionRequest,
  SupportedCurrency,
  TransactionType,
} from "@/types/api";

export const DESCRIPTION_MAX_LENGTH = 100;
const AMOUNT_MAX_INTEGER_DIGITS = 10;
const AMOUNT_MAX_FRACTION_DIGITS = 2;
// Integer digits, one separator and fraction digits.
export const AMOUNT_INPUT_MAX_LENGTH =
  AMOUNT_MAX_INTEGER_DIGITS + 1 + AMOUNT_MAX_FRACTION_DIGITS;

const DEFAULT_CURRENCY: SupportedCurrency = "PLN";
const DEFAULT_TYPE: TransactionType = "EXPENSE";

// Same limits as @Digits on CreateTransactionCommand; both "," and "." separate the fraction.
const AMOUNT_PATTERN = new RegExp(
  `^\\d{1,${AMOUNT_MAX_INTEGER_DIGITS}}(?:[.,]\\d{1,${AMOUNT_MAX_FRACTION_DIGITS}})?$`,
);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const AMOUNT_FORMAT_MESSAGE = `Wpisz kwotę w formacie 184,50 (maksymalnie ${AMOUNT_MAX_INTEGER_DIGITS} cyfr przed i ${AMOUNT_MAX_FRACTION_DIGITS} po przecinku).`;

type CurrencyOption = {
  readonly value: SupportedCurrency;
  readonly label: string;
};

export const CURRENCY_OPTIONS: readonly CurrencyOption[] = [
  { value: "PLN", label: "PLN (zł)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CHF", label: "CHF" },
];

// Order of the fields in the form: the first invalid one gets the focus.
export const TRANSACTION_FORM_FIELDS = [
  "amount",
  "description",
  "categoryId",
  "date",
] as const;

export type TransactionFormField = (typeof TRANSACTION_FORM_FIELDS)[number];

export type TransactionFormValues = {
  readonly amount: string;
  readonly currency: SupportedCurrency;
  readonly description: string;
  // Id of the chosen category as text; "" means none.
  readonly categoryId: string;
  // Calendar date "RRRR-MM-DD".
  readonly date: string;
};

export type TransactionFormErrors = {
  readonly [Field in TransactionFormField]?: string;
};

export type TransactionFormResult =
  | { readonly status: "invalid"; readonly errors: TransactionFormErrors }
  | { readonly status: "valid"; readonly request: CreateTransactionRequest };

export function createEmptyFormValues(date: string): TransactionFormValues {
  return {
    amount: "",
    currency: DEFAULT_CURRENCY,
    description: "",
    categoryId: "",
    date,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Local calendar date: toISOString() gives the UTC date, which differs from it after local midnight.
export function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseCurrency(value: string): SupportedCurrency | null {
  const match = CURRENCY_OPTIONS.find((option) => option.value === value);
  return match?.value ?? null;
}

function findCategory(
  categoryId: string,
  categories: readonly CategoryResponse[],
): CategoryResponse | undefined {
  return categories.find((category) => String(category.id) === categoryId);
}

// The type of a transaction is the type of its category; an unchosen category counts as an expense.
export function getSelectedType(
  categoryId: string,
  categories: readonly CategoryResponse[],
): TransactionType {
  return findCategory(categoryId, categories)?.type ?? DEFAULT_TYPE;
}

function parseAmount(raw: string): number {
  return Number(raw.trim().replace(",", "."));
}

function validateAmount(raw: string): string | null {
  const text = raw.trim();
  if (text === "") {
    return "Podaj kwotę.";
  }
  if (!AMOUNT_PATTERN.test(text)) {
    return AMOUNT_FORMAT_MESSAGE;
  }
  if (parseAmount(text) <= 0) {
    return "Kwota musi być większa od zera.";
  }
  return null;
}

// The amount as a number when it passes the same validation as the form, otherwise null.
export function parseAmountOrNull(raw: string): number | null {
  return validateAmount(raw) === null ? parseAmount(raw) : null;
}

function validateDescription(raw: string): string | null {
  const length = raw.trim().length;
  if (length === 0) {
    return "Podaj opis transakcji.";
  }
  if (length > DESCRIPTION_MAX_LENGTH) {
    return `Opis może mieć maksymalnie ${DESCRIPTION_MAX_LENGTH} znaków.`;
  }
  return null;
}

function validateDate(raw: string): string | null {
  return DATE_PATTERN.test(raw) ? null : "Wybierz datę transakcji.";
}

function collectErrors(
  values: TransactionFormValues,
  category: CategoryResponse | undefined,
): TransactionFormErrors {
  const amount = validateAmount(values.amount);
  const description = validateDescription(values.description);
  const categoryId = category === undefined ? "Wybierz kategorię." : null;
  const date = validateDate(values.date);
  return {
    ...(amount !== null && { amount }),
    ...(description !== null && { description }),
    ...(categoryId !== null && { categoryId }),
    ...(date !== null && { date }),
  };
}

export function parseTransactionForm(
  values: TransactionFormValues,
  categories: readonly CategoryResponse[],
): TransactionFormResult {
  const category = findCategory(values.categoryId, categories);
  const errors = collectErrors(values, category);
  if (category === undefined || Object.keys(errors).length > 0) {
    return { status: "invalid", errors };
  }
  return {
    status: "valid",
    request: {
      amount: parseAmount(values.amount),
      currency: values.currency,
      categoryId: category.id,
      date: values.date,
      description: values.description.trim(),
      type: category.type,
    },
  };
}
