import { describe, expect, it } from "vitest";
import {
  getTransactionTitle,
  NO_DESCRIPTION,
} from "@/lib/format/transactionTitle";
import { EXPENSE_PLN } from "@/test-utils/transactions";

describe("getTransactionTitle", () => {
  it("returns the description when there is one", () => {
    expect(getTransactionTitle(EXPENSE_PLN)).toBe("Zakupy w Biedronce");
  });

  it("returns the placeholder when the description is null", () => {
    expect(getTransactionTitle({ description: null })).toBe("Bez opisu");
  });

  it("exposes the placeholder as a constant", () => {
    expect(NO_DESCRIPTION).toBe("Bez opisu");
  });
});
