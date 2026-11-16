import { ApiError, getUserMessage } from "@/lib/api/errors";
import {
  PASSWORD_MAX_BYTES,
  validateEmail,
} from "@/lib/validation/registration";
import type { LoginRequest } from "@/types/api";

const HTTP_UNAUTHORIZED = 401;

export const INVALID_CREDENTIALS_MESSAGE =
  "Nieprawidłowy adres e-mail lub hasło.";
const PASSWORD_REQUIRED_MESSAGE = "Hasło jest wymagane";
const PASSWORD_TOO_LONG_MESSAGE =
  "Hasło jest zbyt długie. Skróć je albo użyj mniejszej liczby polskich liter i znaków specjalnych";

export const LOGIN_FIELDS = ["email", "password"] as const;

export type LoginField = (typeof LOGIN_FIELDS)[number];

export type LoginValues = {
  readonly email: string;
  readonly password: string;
  readonly rememberMe: boolean;
};

export type LoginErrors = Partial<Record<LoginField, string>>;

export const INITIAL_LOGIN_VALUES: LoginValues = {
  email: "",
  password: "",
  rememberMe: false,
};

// Mirrors LoginUserCommand: @NotBlank and the BCrypt byte limit, otherwise the backend answers 400.
function validateLoginPassword(value: string): string | undefined {
  if (value.trim().length === 0) {
    return PASSWORD_REQUIRED_MESSAGE;
  }
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
    return PASSWORD_TOO_LONG_MESSAGE;
  }
  return undefined;
}

export function validateLogin(values: LoginValues): LoginErrors {
  const results: ReadonlyArray<readonly [LoginField, string | undefined]> = [
    ["email", validateEmail(values.email)],
    ["password", validateLoginPassword(values.password)],
  ];
  return Object.fromEntries(
    results.filter(([, message]) => message !== undefined),
  );
}

export function findFirstInvalidLoginField(
  errors: LoginErrors,
): LoginField | undefined {
  return LOGIN_FIELDS.find((field) => errors[field] !== undefined);
}

// rememberMe is deliberately absent: the backend does not know it.
export function toLoginRequest(values: LoginValues): LoginRequest {
  return {
    email: values.email.trim(),
    password: values.password,
  };
}

export function toLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === HTTP_UNAUTHORIZED) {
    return error.problem?.detail ?? INVALID_CREDENTIALS_MESSAGE;
  }
  return getUserMessage(error);
}
