import { formatForeignAmount, formatPln } from "@/lib/format/money";
import type { SupportedCurrency } from "@/types/api";

// Same formats as the transaction list: "43,00 zł" for PLN, "9,99 EUR" for the others.
// The amount is shown in the currency of the payment; there is no PLN equivalent in the API.
export function formatPaymentAmount(
  amount: number,
  currency: SupportedCurrency,
): string {
  return currency === "PLN"
    ? formatPln(amount)
    : formatForeignAmount(amount, currency);
}
