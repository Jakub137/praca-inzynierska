import { describe, expect, it } from "vitest";
import {
  DEPOSIT_AMOUNT_INPUT_MAX_LENGTH,
  mapDepositServerErrors,
  parseDepositForm,
} from "@/lib/goals/depositForm";

describe("parseDepositForm", () => {
  it("exports the amount limit shared with the backend", () => {
    expect(DEPOSIT_AMOUNT_INPUT_MAX_LENGTH).toBe(13);
  });

  it.each([
    ["250", 250],
    ["250,5", 250.5],
    ["0,01", 0.01],
    ["9999999999,99", 9999999999.99],
  ])("builds the request for %s", (amount, expected) => {
    expect(parseDepositForm({ amount })).toEqual({
      status: "valid",
      request: { amount: expected },
    });
  });

  it.each([
    ["", "Podaj kwotę."],
    ["0", "Kwota musi być większa od zera."],
    [
      "abc",
      "Wpisz kwotę w formacie 184,50 (maksymalnie 10 cyfr przed i 2 po przecinku).",
    ],
    [
      "10000000000",
      "Wpisz kwotę w formacie 184,50 (maksymalnie 10 cyfr przed i 2 po przecinku).",
    ],
  ])("rejects %j with its message", (amount, message) => {
    expect(parseDepositForm({ amount })).toEqual({
      status: "invalid",
      errors: { amount: message },
    });
  });
});

describe("mapDepositServerErrors", () => {
  it("maps the amount message of the backend (total above the limit)", () => {
    const message =
      "Suma wpłat na ten cel nie może przekroczyć 9 999 999 999,99. Wpisz mniejszą kwotę.";

    expect(mapDepositServerErrors([{ field: "amount", message }])).toEqual({
      amount: message,
    });
  });

  it("ignores other fields and a missing list", () => {
    expect(mapDepositServerErrors([{ field: "id", message: "x" }])).toEqual({});
    expect(mapDepositServerErrors(undefined)).toEqual({});
  });
});
