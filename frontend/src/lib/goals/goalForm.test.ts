import { describe, expect, it } from "vitest";
import {
  createEmptyGoalValues,
  GOAL_AMOUNT_INPUT_MAX_LENGTH,
  GOAL_NAME_MAX_LENGTH,
  mapGoalServerErrors,
  parseGoalForm,
} from "@/lib/goals/goalForm";

const TODAY = "2026-11-21";
const VALID = {
  name: "Wakacje we Włoszech",
  targetAmount: "6000",
  targetDate: "2027-07-21",
};

describe("parseGoalForm", () => {
  it("exports the limits shared with the backend", () => {
    expect(GOAL_NAME_MAX_LENGTH).toBe(100);
    expect(GOAL_AMOUNT_INPUT_MAX_LENGTH).toBe(13);
  });

  it("builds the request with a trimmed name and the amount as a number", () => {
    const result = parseGoalForm(
      { ...VALID, name: "  Wakacje  ", targetAmount: "6000,5" },
      TODAY,
    );

    expect(result).toEqual({
      status: "valid",
      request: {
        name: "Wakacje",
        targetAmount: 6000.5,
        targetDate: "2027-07-21",
      },
    });
  });

  it("reports every empty field with its message", () => {
    const result = parseGoalForm(createEmptyGoalValues(), TODAY);

    expect(result).toEqual({
      status: "invalid",
      errors: {
        name: "Nazwa celu jest wymagana",
        targetAmount: "Podaj kwotę.",
        targetDate: "Termin celu jest wymagany",
      },
    });
  });

  it("treats a name of spaces as empty", () => {
    const result = parseGoalForm({ ...VALID, name: "   " }, TODAY);

    expect(result).toEqual({
      status: "invalid",
      errors: { name: "Nazwa celu jest wymagana" },
    });
  });

  it("accepts a name of 100 characters and rejects one of 101", () => {
    expect(
      parseGoalForm({ ...VALID, name: "a".repeat(100) }, TODAY).status,
    ).toBe("valid");
    expect(parseGoalForm({ ...VALID, name: "a".repeat(101) }, TODAY)).toEqual({
      status: "invalid",
      errors: { name: "Nazwa celu może mieć maksymalnie 100 znaków" },
    });
  });

  it("accepts the upper bound 9999999999,99 of the amount", () => {
    const result = parseGoalForm(
      { ...VALID, targetAmount: "9999999999,99" },
      TODAY,
    );

    expect(result).toMatchObject({
      status: "valid",
      request: { targetAmount: 9999999999.99 },
    });
  });

  it.each(["10000000000", "1,234", "abc", "-5", "0", "12 000"])(
    "rejects the amount %s",
    (targetAmount) => {
      const result = parseGoalForm({ ...VALID, targetAmount }, TODAY);

      expect(result.status).toBe("invalid");
    },
  );

  it.each([
    [
      "2026-11-21",
      "Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza.",
    ],
    [
      "2026-11-20",
      "Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza.",
    ],
    [
      "2101-01-01",
      "Termin celu może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.",
    ],
  ])("rejects the date %s", (targetDate, message) => {
    const result = parseGoalForm({ ...VALID, targetDate }, TODAY);

    expect(result).toEqual({
      status: "invalid",
      errors: { targetDate: message },
    });
  });

  it("accepts the last allowed date", () => {
    expect(
      parseGoalForm({ ...VALID, targetDate: "2100-12-31" }, TODAY).status,
    ).toBe("valid");
  });
});

describe("mapGoalServerErrors", () => {
  it("maps the fields of the form and ignores the others", () => {
    const result = mapGoalServerErrors([
      { field: "targetDate", message: "Termin celu musi być w przyszłości." },
      { field: "name", message: "Nazwa celu jest wymagana" },
      { field: "currency", message: "Nieznane pole" },
    ]);

    expect(result).toEqual({
      name: "Nazwa celu jest wymagana",
      targetDate: "Termin celu musi być w przyszłości.",
    });
  });

  it("returns no errors without field errors", () => {
    expect(mapGoalServerErrors(undefined)).toEqual({});
  });
});
