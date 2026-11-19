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

export type LoginRequest = {
  readonly email: string;
  readonly password: string;
};

export type AuthUserResponse = {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly defaultCurrency: SupportedCurrency;
};

export type AuthResponse = {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly user: AuthUserResponse;
};

export type RateSource = "NBP" | "FALLBACK";

export type CurrencyRateResponse = {
  readonly currency: Exclude<SupportedCurrency, "PLN">;
  // Display only: never use this number in calculations.
  readonly rate: number;
  readonly effectiveDate: string;
  readonly source: RateSource;
};

export type CurrencyRatesResponse = {
  readonly rates: readonly CurrencyRateResponse[];
};

export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionResponse = {
  readonly id: string;
  // Display only: amounts are calculated by the backend (BigDecimal), never here.
  readonly amount: number;
  readonly currency: SupportedCurrency;
  readonly exchangeRate: number;
  readonly amountPln: number;
  // Calendar date without a time zone, e.g. "2026-11-17".
  readonly date: string;
  readonly description: string | null;
  readonly type: TransactionType;
  readonly categoryId: number;
  readonly categoryName: string;
  readonly categoryIcon: string | null;
  readonly recurring: boolean;
  readonly createdAt: string;
};

export type PageResponse<T> = {
  readonly content: readonly T[];
  // Zero-based page index.
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
};

export type CategoryResponse = {
  readonly id: number;
  readonly name: string;
  // Null for categories created by the user.
  readonly icon: string | null;
  readonly type: TransactionType;
  readonly isDefault: boolean;
};
