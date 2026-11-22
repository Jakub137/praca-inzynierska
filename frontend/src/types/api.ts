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

// Request body of POST /api/v1/transactions (CreateTransactionCommand).
export type CreateTransactionRequest = {
  // At most 10 integer and 2 fraction digits, so the JSON number keeps the exact decimal value.
  readonly amount: number;
  readonly currency: SupportedCurrency;
  readonly categoryId: number;
  // Calendar date "RRRR-MM-DD".
  readonly date: string;
  readonly description: string;
  readonly type: TransactionType;
};

// PUT replaces all fields, so it takes the same body as POST.
export type UpdateTransactionRequest = CreateTransactionRequest;

export type BudgetStatus = "NORMAL" | "WARNING" | "EXCEEDED";

// One position of GET /api/v1/budget-limits/usage (BudgetUsageResponse).
export type BudgetUsageResponse = {
  readonly categoryId: number;
  readonly categoryName: string;
  // Display only: amounts and the percentage are calculated by the backend (BigDecimal), never here.
  readonly limitAmount: number;
  readonly spentAmount: number;
  // Can exceed 100.
  readonly percentage: number;
  // The 80% and 100% thresholds live in the backend: the status is never recalculated here.
  readonly status: BudgetStatus;
};

// Request body of POST /api/v1/budget-limits (SetBudgetLimitCommand).
export type SetBudgetLimitRequest = {
  readonly categoryId: number;
  // 1-12
  readonly month: number;
  // 2000-2100
  readonly year: number;
  // At most 10 integer and 2 fraction digits, so the JSON number keeps the exact decimal value.
  readonly limitAmount: number;
};

// Response of POST /api/v1/budget-limits (BudgetLimitResponse): 201 for a new limit, 200 for a changed one.
export type BudgetLimitResponse = {
  readonly id: number;
  readonly categoryId: number;
  readonly month: number;
  readonly year: number;
  readonly limitAmount: number;
};

export type GoalStatus = "ACTIVE" | "COMPLETED";

// One position of GET /api/v1/savings-goals (SavingsGoalResponse).
export type SavingsGoalResponse = {
  readonly id: number;
  readonly name: string;
  // Display only: amounts are BigDecimal in the backend, never summed or compared here.
  readonly targetAmount: number;
  readonly currentAmount: number;
  // Calendar date "RRRR-MM-DD".
  readonly targetDate: string;
  // Computed by the backend (currentAmount >= targetAmount), not a stored column.
  readonly status: GoalStatus;
  // Never negative: 0 means both "within a month" and "deadline passed".
  readonly monthsRemaining: number;
  // Remaining amount divided by monthsRemaining; the whole remaining amount when monthsRemaining is 0.
  readonly monthlyContribution: number;
};

// Body of POST /api/v1/savings-goals (SavingsGoalCommand).
export type SavingsGoalRequest = {
  readonly name: string;
  // At most 10 integer and 2 fraction digits, so the JSON number keeps the exact decimal value.
  readonly targetAmount: number;
  // Calendar date "RRRR-MM-DD": after today (Europe/Warsaw) and not later than 2100-12-31.
  readonly targetDate: string;
};

// Body of POST /api/v1/savings-goals/{id}/deposit (DepositToGoalCommand).
export type DepositToGoalRequest = {
  readonly amount: number;
};

// Allowed values of the frequency column (chk_recurring_payments_frequency in V3_2).
export type PaymentFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

// One position of GET /api/v1/recurring-payments and the answer of POST (RecurringPaymentResponse).
export type RecurringPaymentResponse = {
  readonly id: number;
  readonly name: string;
  // Display only: amounts are BigDecimal in the backend, never summed or compared here.
  // The amount is in the currency below and is not converted to PLN.
  readonly amount: number;
  readonly currency: SupportedCurrency;
  readonly frequency: PaymentFrequency;
  // Calendar date "RRRR-MM-DD"; a payment past its date stays on the list.
  readonly nextDueDate: string;
  readonly categoryId: number;
  readonly categoryName: string;
};

// Body of POST /api/v1/recurring-payments (RecurringPaymentCommand).
export type RecurringPaymentRequest = {
  readonly name: string;
  // At most 10 integer and 2 fraction digits, so the JSON number keeps the exact decimal value.
  readonly amount: number;
  readonly currency: SupportedCurrency;
  readonly frequency: PaymentFrequency;
  // Calendar date "RRRR-MM-DD": today or later (Europe/Warsaw) and not later than 2100-12-31.
  readonly nextDueDate: string;
  // Must be an expense category, the user's own or a system one.
  readonly categoryId: number;
};

// Response of GET /api/v1/dashboard/summary (DashboardSummaryResponse).
export type DashboardSummaryResponse = {
  // Calendar month the sums refer to, "RRRR-MM" (Europe/Warsaw).
  readonly month: string;
  // Display only: amounts are BigDecimal in the backend, never summed or compared here.
  // The balance counts the transactions up to and including today.
  readonly availableFunds: number;
  // One decimal place; null when there is no earlier balance to compare with (balance <= 0).
  readonly availableFundsChangePercent: number | null;
  // The whole calendar month, including the days after today.
  readonly monthExpenses: number;
  readonly monthIncome: number;
  // Sum of the limits of this month; null when none is set ("no limit" is not "0").
  readonly monthLimitTotal: number | null;
};
