import { describe, expect, it } from "vitest";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  NetworkError,
  SERVER_ERROR_MESSAGE,
} from "@/lib/api/errors";
import {
  findFirstInvalidLoginField,
  INITIAL_LOGIN_VALUES,
  INVALID_CREDENTIALS_MESSAGE,
  toLoginErrorMessage,
  toLoginRequest,
  validateLogin,
  type LoginValues,
} from "@/lib/validation/login";

const VALID: LoginValues = {
  email: "jan@example.com",
  password: "a",
  rememberMe: false,
};

describe("validateLogin", () => {
  it("reports both required fields on an empty form", () => {
    expect(validateLogin(INITIAL_LOGIN_VALUES)).toEqual({
      email: "Adres e-mail jest wymagany",
      password: "Hasło jest wymagane",
    });
  });

  it("rejects a malformed e-mail", () => {
    expect(validateLogin({ ...VALID, email: "jan" }).email).toBe(
      "Podaj poprawny adres e-mail, np. jan@example.com",
    );
  });

  it("treats a whitespace-only e-mail as empty", () => {
    expect(validateLogin({ ...VALID, email: "   " }).email).toBe(
      "Adres e-mail jest wymagany",
    );
  });

  it("accepts any non-empty password, the server decides", () => {
    expect(validateLogin(VALID)).toEqual({});
  });

  it("treats a whitespace-only password as empty, like the backend", () => {
    expect(validateLogin({ ...VALID, password: "   " }).password).toBe(
      "Hasło jest wymagane",
    );
  });

  it("accepts a password of exactly 72 bytes and rejects 73", () => {
    expect(
      validateLogin({ ...VALID, password: `a${"ą".repeat(35)}a` }),
    ).toEqual({});
    expect(
      validateLogin({ ...VALID, password: `${"ą".repeat(36)}a` }).password,
    ).toBe(
      "Hasło jest zbyt długie. Skróć je albo użyj mniejszej liczby polskich liter i znaków specjalnych",
    );
  });
});

describe("findFirstInvalidLoginField", () => {
  it("returns the e-mail first", () => {
    expect(
      findFirstInvalidLoginField(validateLogin(INITIAL_LOGIN_VALUES)),
    ).toBe("email");
  });

  it("returns the password when only it is invalid", () => {
    expect(
      findFirstInvalidLoginField(validateLogin({ ...VALID, password: "" })),
    ).toBe("password");
  });

  it("returns undefined for a valid form", () => {
    expect(findFirstInvalidLoginField(validateLogin(VALID))).toBeUndefined();
  });
});

describe("toLoginRequest", () => {
  it("trims the e-mail, keeps the password and omits rememberMe", () => {
    expect(
      toLoginRequest({
        email: " jan@example.com ",
        password: " Haslo ",
        rememberMe: true,
      }),
    ).toEqual({ email: "jan@example.com", password: " Haslo " });
  });
});

describe("toLoginErrorMessage", () => {
  it("uses the detail of a 401", () => {
    const error = new ApiError(401, { status: 401, detail: "Zły login." });

    expect(toLoginErrorMessage(error)).toBe("Zły login.");
  });

  it("falls back to the fixed text when a 401 has no detail", () => {
    expect(toLoginErrorMessage(new ApiError(401, { status: 401 }))).toBe(
      INVALID_CREDENTIALS_MESSAGE,
    );
    expect(toLoginErrorMessage(new ApiError(401))).toBe(
      INVALID_CREDENTIALS_MESSAGE,
    );
  });

  it("uses the generic messages for other failures", () => {
    expect(toLoginErrorMessage(new ApiError(500, { status: 500 }))).toBe(
      SERVER_ERROR_MESSAGE,
    );
    expect(toLoginErrorMessage(new NetworkError())).toBe(NETWORK_ERROR_MESSAGE);
  });
});
