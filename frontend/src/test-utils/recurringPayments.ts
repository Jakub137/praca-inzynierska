import type { RecurringPaymentResponse } from "@/types/api";

// The fixed "today" of the payment tests (a Saturday in the business time zone).
export const RECURRING_TEST_TODAY = "2026-11-21";

// Overdue by 3 days, yearly, amount with thousands.
export const INSURANCE_PAYMENT: RecurringPaymentResponse = {
  id: 4,
  name: "Ubezpieczenie auta",
  amount: 1250.5,
  currency: "PLN",
  frequency: "YEARLY",
  nextDueDate: "2026-11-18",
  categoryId: 7,
  categoryName: "Transport",
};

// Overdue by 1 day, weekly.
export const GYM_PAYMENT: RecurringPaymentResponse = {
  id: 5,
  name: "Karnet na siłownię",
  amount: 49,
  currency: "PLN",
  frequency: "WEEKLY",
  nextDueDate: "2026-11-20",
  categoryId: 8,
  categoryName: "Zdrowie",
};

// Due today.
export const RENT_PAYMENT: RecurringPaymentResponse = {
  id: 3,
  name: "Czynsz",
  amount: 850,
  currency: "PLN",
  frequency: "MONTHLY",
  nextDueDate: "2026-11-21",
  categoryId: 4,
  categoryName: "Mieszkanie",
};

// Due tomorrow, in a foreign currency.
export const SPOTIFY_PAYMENT: RecurringPaymentResponse = {
  id: 2,
  name: "Spotify",
  amount: 9.99,
  currency: "EUR",
  frequency: "MONTHLY",
  nextDueDate: "2026-11-22",
  categoryId: 2,
  categoryName: "Rozrywka",
};

// Due in 3 days.
export const NETFLIX_PAYMENT: RecurringPaymentResponse = {
  id: 1,
  name: "Netflix",
  amount: 43,
  currency: "PLN",
  frequency: "MONTHLY",
  nextDueDate: "2026-11-24",
  categoryId: 2,
  categoryName: "Rozrywka",
};

// In the order of the API: the nearest due date first.
export const TEST_PAYMENTS: readonly RecurringPaymentResponse[] = [
  INSURANCE_PAYMENT,
  GYM_PAYMENT,
  RENT_PAYMENT,
  SPOTIFY_PAYMENT,
  NETFLIX_PAYMENT,
];
