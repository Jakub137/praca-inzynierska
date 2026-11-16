import type { FieldError, ProblemDetail, RegisterRequest } from "@/types/api";

export const NAME_MAX_LENGTH = 60;
export const EMAIL_MAX_LENGTH = 150;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
const PASSWORD_MAX_BYTES = 72;

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const DIGIT_PATTERN = /\d/;
const UPPERCASE_PATTERN = /\p{Lu}/u;
const SPECIAL_PATTERN = /[^\p{L}\p{N}\s]/u;

const EMAIL_TAKEN_MESSAGE = "Adres e-mail jest już zajęty przez inne konto";

export const REGISTRATION_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "password",
  "passwordConfirmation",
  "termsAccepted",
] as const;

export type RegistrationField = (typeof REGISTRATION_FIELDS)[number];
export type TextField = Exclude<RegistrationField, "termsAccepted">;

export type RegistrationValues = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirmation: string;
  readonly termsAccepted: boolean;
};

export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export const INITIAL_REGISTRATION_VALUES: RegistrationValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  passwordConfirmation: "",
  termsAccepted: false,
};

// Fields the backend validates and can report back in `fieldErrors`.
const SERVER_FIELDS: readonly RegistrationField[] = [
  "firstName",
  "lastName",
  "email",
  "password",
];

function validateName(
  value: string,
  requiredMessage: string,
  tooLongMessage: string,
): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return requiredMessage;
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    return tooLongMessage;
  }
  return undefined;
}

function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "Adres e-mail jest wymagany";
  }
  if (trimmed.length > EMAIL_MAX_LENGTH) {
    return `Adres e-mail może mieć maksymalnie ${EMAIL_MAX_LENGTH} znaków`;
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return "Podaj poprawny adres e-mail, np. jan@example.com";
  }
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (value.length === 0) {
    return "Hasło jest wymagane";
  }
  if (
    value.length < PASSWORD_MIN_LENGTH ||
    value.length > PASSWORD_MAX_LENGTH
  ) {
    return `Hasło musi mieć od ${PASSWORD_MIN_LENGTH} do ${PASSWORD_MAX_LENGTH} znaków`;
  }
  if (!DIGIT_PATTERN.test(value)) {
    return "Hasło musi zawierać co najmniej jedną cyfrę";
  }
  if (!UPPERCASE_PATTERN.test(value)) {
    return "Hasło musi zawierać co najmniej jedną wielką literę";
  }
  if (!SPECIAL_PATTERN.test(value)) {
    return "Hasło musi zawierać co najmniej jeden znak specjalny";
  }
  // BCrypt ignores everything past 72 bytes, and Polish letters take 2 bytes each in UTF-8.
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
    return "Hasło jest zbyt długie. Skróć je albo użyj mniejszej liczby polskich liter i znaków specjalnych";
  }
  return undefined;
}

function validatePasswordConfirmation(
  confirmation: string,
  password: string,
): string | undefined {
  if (confirmation.length === 0) {
    return "Powtórz hasło, aby upewnić się, że nie ma w nim literówki";
  }
  if (confirmation !== password) {
    return "Hasła nie są takie same. Wpisz to samo hasło w obu polach.";
  }
  return undefined;
}

function validateTerms(accepted: boolean): string | undefined {
  return accepted
    ? undefined
    : "Zaakceptuj Regulamin i Politykę prywatności, aby założyć konto";
}

export function validateRegistration(
  values: RegistrationValues,
): RegistrationErrors {
  const results: ReadonlyArray<
    readonly [RegistrationField, string | undefined]
  > = [
    [
      "firstName",
      validateName(
        values.firstName,
        "Imię jest wymagane",
        `Imię może mieć maksymalnie ${NAME_MAX_LENGTH} znaków`,
      ),
    ],
    [
      "lastName",
      validateName(
        values.lastName,
        "Nazwisko jest wymagane",
        `Nazwisko może mieć maksymalnie ${NAME_MAX_LENGTH} znaków`,
      ),
    ],
    ["email", validateEmail(values.email)],
    ["password", validatePassword(values.password)],
    [
      "passwordConfirmation",
      validatePasswordConfirmation(
        values.passwordConfirmation,
        values.password,
      ),
    ],
    ["termsAccepted", validateTerms(values.termsAccepted)],
  ];
  return Object.fromEntries(
    results.filter(([, message]) => message !== undefined),
  );
}

export function findFirstInvalidField(
  errors: RegistrationErrors,
): RegistrationField | undefined {
  return REGISTRATION_FIELDS.find((field) => errors[field] !== undefined);
}

export function toRegistrationErrors(
  fieldErrors: readonly FieldError[],
): RegistrationErrors {
  const entries = SERVER_FIELDS.flatMap((field) => {
    const match = fieldErrors.find((error) => error.field === field);
    return match ? [[field, match.message] as const] : [];
  });
  return Object.fromEntries(entries);
}

export function toServerErrors(
  status: number,
  problem: ProblemDetail | undefined,
): RegistrationErrors {
  if (status === HTTP_CONFLICT) {
    return { email: problem?.detail ?? EMAIL_TAKEN_MESSAGE };
  }
  if (status === HTTP_BAD_REQUEST) {
    return toRegistrationErrors(problem?.fieldErrors ?? []);
  }
  return {};
}

export function toRegisterRequest(values: RegistrationValues): RegisterRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    password: values.password,
  };
}
