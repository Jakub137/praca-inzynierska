import { describe, expect, it } from "vitest";
import {
  findFirstInvalidField,
  toRegisterRequest,
  toRegistrationErrors,
  toServerErrors,
  validateRegistration,
  type RegistrationValues,
} from "@/lib/validation/registration";

const VALID_VALUES: RegistrationValues = {
  firstName: "Jan",
  lastName: "Kowalski",
  email: "jan@example.com",
  password: "Haslo123!",
  passwordConfirmation: "Haslo123!",
  termsAccepted: true,
};

function withPassword(password: string): RegistrationValues {
  return { ...VALID_VALUES, password, passwordConfirmation: password };
}

describe("validateRegistration", () => {
  it("accepts valid values", () => {
    expect(validateRegistration(VALID_VALUES)).toEqual({});
  });

  it("requires every text field", () => {
    const errors = validateRegistration({
      ...VALID_VALUES,
      firstName: "  ",
      lastName: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    });

    expect(errors).toEqual({
      firstName: "Imię jest wymagane",
      lastName: "Nazwisko jest wymagane",
      email: "Adres e-mail jest wymagany",
      password: "Hasło jest wymagane",
      passwordConfirmation:
        "Powtórz hasło, aby upewnić się, że nie ma w nim literówki",
    });
  });

  it("rejects names and e-mail over the limits", () => {
    const errors = validateRegistration({
      ...VALID_VALUES,
      firstName: "a".repeat(61),
      lastName: "a".repeat(61),
      email: `${"a".repeat(146)}@b.pl`,
    });

    expect(errors).toEqual({
      firstName: "Imię może mieć maksymalnie 60 znaków",
      lastName: "Nazwisko może mieć maksymalnie 60 znaków",
      email: "Adres e-mail może mieć maksymalnie 150 znaków",
    });
  });

  it("rejects an e-mail without a domain part and trims a valid one", () => {
    expect(validateRegistration({ ...VALID_VALUES, email: "jan" }).email).toBe(
      "Podaj poprawny adres e-mail, np. jan@example.com",
    );
    expect(
      validateRegistration({ ...VALID_VALUES, email: " jan@example.com " }),
    ).toEqual({});
  });

  it.each([
    ["Ha1!", "Hasło musi mieć od 8 do 64 znaków"],
    [`Haslo123!${"a".repeat(60)}`, "Hasło musi mieć od 8 do 64 znaków"],
    ["Haslo!!!!", "Hasło musi zawierać co najmniej jedną cyfrę"],
    ["haslo123!", "Hasło musi zawierać co najmniej jedną wielką literę"],
    ["Haslo1234", "Hasło musi zawierać co najmniej jeden znak specjalny"],
    ["Haslo 1234", "Hasło musi zawierać co najmniej jeden znak specjalny"],
  ])("reports the broken password rule for %s", (password, message) => {
    const errors = validateRegistration(withPassword(password));

    expect(errors).toEqual({ password: message });
  });

  it("accepts a password of exactly 72 bytes and rejects 73", () => {
    const tooLongMessage =
      "Hasło jest zbyt długie. Skróć je albo użyj mniejszej liczby polskich liter i znaków specjalnych";
    const exactly72Bytes = `A1!${"ą".repeat(34)}a`;
    const exactly73Bytes = `A1!${"ą".repeat(35)}`;

    expect(validateRegistration(withPassword(exactly72Bytes))).toEqual({});
    expect(validateRegistration(withPassword(exactly73Bytes))).toEqual({
      password: tooLongMessage,
    });
  });

  it("reports mismatching passwords on the confirmation field", () => {
    const errors = validateRegistration({
      ...VALID_VALUES,
      passwordConfirmation: "Haslo123?",
    });

    expect(errors).toEqual({
      passwordConfirmation:
        "Hasła nie są takie same. Wpisz to samo hasło w obu polach.",
    });
  });

  it("requires the terms checkbox", () => {
    const errors = validateRegistration({
      ...VALID_VALUES,
      termsAccepted: false,
    });

    expect(errors).toEqual({
      termsAccepted:
        "Zaakceptuj Regulamin i Politykę prywatności, aby założyć konto",
    });
  });
});

describe("findFirstInvalidField", () => {
  it("returns the first field in form order", () => {
    expect(
      findFirstInvalidField({ termsAccepted: "x", email: "y", lastName: "z" }),
    ).toBe("lastName");
  });

  it("returns undefined when there are no errors", () => {
    expect(findFirstInvalidField({})).toBeUndefined();
  });
});

describe("toRegistrationErrors", () => {
  it("maps known fields, keeps the first message and ignores unknown fields", () => {
    const errors = toRegistrationErrors([
      { field: "email", message: "Podaj poprawny adres e-mail" },
      { field: "email", message: "Inny komunikat" },
      { field: "password", message: "Hasło jest wymagane" },
      { field: "unknown", message: "Ignorowany" },
    ]);

    expect(errors).toEqual({
      email: "Podaj poprawny adres e-mail",
      password: "Hasło jest wymagane",
    });
  });
});

describe("toServerErrors", () => {
  it("shows a 409 on the e-mail field using the server message", () => {
    const errors = toServerErrors(409, {
      status: 409,
      detail: "Adres e-mail jest już zajęty przez inne konto",
    });

    expect(errors).toEqual({
      email: "Adres e-mail jest już zajęty przez inne konto",
    });
  });

  it("falls back to a built-in message for a 409 without a body", () => {
    expect(toServerErrors(409, undefined)).toEqual({
      email: "Adres e-mail jest już zajęty przez inne konto",
    });
  });

  it("maps fieldErrors of a 400", () => {
    const errors = toServerErrors(400, {
      status: 400,
      fieldErrors: [{ field: "lastName", message: "Nazwisko jest wymagane" }],
    });

    expect(errors).toEqual({ lastName: "Nazwisko jest wymagane" });
  });

  it("returns no field errors for other statuses", () => {
    expect(toServerErrors(400, undefined)).toEqual({});
    expect(toServerErrors(500, { status: 500 })).toEqual({});
  });
});

describe("toRegisterRequest", () => {
  it("trims names and e-mail but never the password", () => {
    const request = toRegisterRequest({
      ...VALID_VALUES,
      firstName: "  Jan ",
      lastName: " Kowalski  ",
      email: " jan@example.com ",
      password: " Haslo123! ",
    });

    expect(request).toEqual({
      firstName: "Jan",
      lastName: "Kowalski",
      email: "jan@example.com",
      password: " Haslo123! ",
    });
  });
});
