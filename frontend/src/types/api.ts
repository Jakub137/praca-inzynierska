export type FieldError = {
  readonly field: string;
  readonly message: string;
};

export type ProblemDetail = {
  readonly type?: string;
  readonly title?: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly timestamp?: string;
  readonly fieldErrors?: readonly FieldError[];
};

export type HealthResponse = {
  readonly status: "UP";
  readonly timestamp: string;
};

export type SupportedCurrency = "PLN" | "EUR" | "USD" | "GBP" | "CHF";

export type RegisterRequest = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
};

export type UserResponse = {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly defaultCurrency: SupportedCurrency;
  readonly createdAt: string;
};
