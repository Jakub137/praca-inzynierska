import { apiRequest } from "@/lib/api/client";
import type {
  CreateTransactionRequest,
  PageResponse,
  TransactionResponse,
  TransactionType,
} from "@/types/api";

export type TransactionsPageParams = {
  // Zero-based, as in the API.
  readonly page: number;
  readonly size: number;
  readonly categoryId?: number;
  readonly type?: TransactionType;
  // Calendar dates "RRRR-MM-DD", both inclusive.
  readonly dateFrom?: string;
  readonly dateTo?: string;
};

function setIfDefined(
  query: URLSearchParams,
  name: string,
  value: string | number | undefined,
): void {
  if (value !== undefined) {
    query.set(name, String(value));
  }
}

// /transactions is protected: it needs the Bearer token.
// Only the filters that are set are sent; sorting is omitted on purpose: the backend defaults to newest first.
export function getTransactions(
  token: string,
  { page, size, categoryId, type, dateFrom, dateTo }: TransactionsPageParams,
): Promise<PageResponse<TransactionResponse>> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  setIfDefined(query, "categoryId", categoryId);
  setIfDefined(query, "type", type);
  setIfDefined(query, "dateFrom", dateFrom);
  setIfDefined(query, "dateTo", dateTo);
  return apiRequest<PageResponse<TransactionResponse>>(
    `/transactions?${query.toString()}`,
    { token },
  );
}

// POST answers 201 with the saved transaction; the backend calculates the rate and the PLN amount.
export function createTransaction(
  token: string,
  request: CreateTransactionRequest,
): Promise<TransactionResponse> {
  return apiRequest<TransactionResponse>("/transactions", {
    method: "POST",
    body: request,
    token,
  });
}
