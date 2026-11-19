import type { TransactionResponse } from "@/types/api";

export const NO_DESCRIPTION = "Bez opisu";

export function getTransactionTitle(
  transaction: Pick<TransactionResponse, "description">,
): string {
  return transaction.description ?? NO_DESCRIPTION;
}
