import type { PageResponse, TransactionResponse } from "@/types/api";

export const EXPENSE_PLN: TransactionResponse = {
  id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  amount: 184.5,
  currency: "PLN",
  exchangeRate: 1,
  amountPln: 184.5,
  date: "2026-11-17",
  description: "Zakupy w Biedronce",
  type: "EXPENSE",
  categoryId: 1,
  categoryName: "Artykuły spożywcze",
  categoryIcon: "shopping-cart",
  recurring: false,
  createdAt: "2026-11-17T10:15:00Z",
};

export const INCOME_PLN: TransactionResponse = {
  id: "0b8f3a52-91c4-4c5e-8f0a-3d6f5a1c2b44",
  amount: 7500,
  currency: "PLN",
  exchangeRate: 1,
  amountPln: 7500,
  date: "2026-11-10",
  description: "Wynagrodzenie za listopad",
  type: "INCOME",
  categoryId: 9,
  categoryName: "Wynagrodzenie",
  categoryIcon: "wallet",
  recurring: false,
  createdAt: "2026-11-10T08:00:00Z",
};

export const EXPENSE_EUR: TransactionResponse = {
  id: "5d1a9c3e-2f67-4b8d-a1e4-9c7b6d5e4f30",
  amount: 100,
  currency: "EUR",
  exchangeRate: 4.31,
  amountPln: 431,
  date: "2026-11-12",
  description: "Bilety lotnicze",
  type: "EXPENSE",
  categoryId: 2,
  categoryName: "Rozrywka",
  categoryIcon: "film",
  recurring: false,
  createdAt: "2026-11-12T19:30:00Z",
};

export const TEST_TRANSACTIONS: readonly TransactionResponse[] = [
  EXPENSE_PLN,
  INCOME_PLN,
  EXPENSE_EUR,
];

export function makePage(
  content: readonly TransactionResponse[],
): PageResponse<TransactionResponse> {
  return {
    content,
    page: 0,
    size: 15,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
  };
}
