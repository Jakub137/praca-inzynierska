import { describe, expect, it } from "vitest";
import {
  MAX_NEXT_DUE_DATE,
  validateNextDueDate,
} from "@/lib/recurring/nextDueDate";

const TODAY = "2026-11-21";
// Copied from RecurringPaymentCommand and RecurringPaymentDates (backend), so a typo here fails the test.
const REQUIRED = "Termin następnej płatności jest wymagany";
const PAST =
  "Termin następnej płatności nie może być w przeszłości. Wybierz dzisiejszą lub późniejszą datę.";
const TOO_LATE =
  "Termin następnej płatności może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.";

describe("validateNextDueDate", () => {
  it("exports the last allowed date", () => {
    expect(MAX_NEXT_DUE_DATE).toBe("2100-12-31");
  });

  it.each([
    ["", REQUIRED],
    ["2026-11", REQUIRED],
    ["2026-11-20", PAST],
    ["0001-01-01", PAST],
    ["2101-01-01", TOO_LATE],
    ["275760-09-13", TOO_LATE],
    ["100000-01-01", TOO_LATE],
  ])("rejects %j with its message", (raw, message) => {
    expect(validateNextDueDate(raw, TODAY)).toBe(message);
  });

  it.each([TODAY, "2026-11-22", "2100-12-31"])("accepts %s", (raw) => {
    expect(validateNextDueDate(raw, TODAY)).toBeNull();
  });
});
