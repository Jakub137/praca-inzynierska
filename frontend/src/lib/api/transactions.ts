import { apiRequest } from "@/lib/api/client";
import type { PageResponse, TransactionResponse } from "@/types/api";

export type TransactionsPageParams = {
  readonly page: number;
  readonly size: number;
};

// /transactions is protected: it needs the Bearer token.
// Filters and sorting are omitted on purpose: the backend defaults to newest first.
export function getTransactions(
  token: string,
  { page, size }: TransactionsPageParams,
): Promise<PageResponse<TransactionResponse>> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  return apiRequest<PageResponse<TransactionResponse>>(
    `/transactions?${query.toString()}`,
    { token },
  );
}
