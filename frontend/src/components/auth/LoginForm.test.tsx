import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  NetworkError,
  SERVER_ERROR_MESSAGE,
} from "@/lib/api/errors";
import type { AuthResponse } from "@/types/api";

const { pushMock, loginUserMock, startSessionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  loginUserMock: vi.fn(),
  startSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/lib/api/auth", () => ({ loginUser: loginUserMock }));
vi.mock("@/lib/auth/session", () => ({ startSession: startSessionMock }));

const PASSWORD = "Haslo123!";
const TOKEN = "test-token-value";
const REMEMBER_LABEL = "Zapamiętaj mnie";
const INVALID_CREDENTIALS = "Nieprawidłowy adres e-mail lub hasło.";
const AUTH_RESPONSE: AuthResponse = {
  accessToken: TOKEN,
  expiresIn: 86400,
  user: {
    id: "1",
    email: "jan@example.com",
    firstName: "Jan",
    lastName: "Kowalski",
    defaultCurrency: "PLN",
  },
};

function renderForm(registered = false) {
  render(<LoginForm registered={registered} />);
}

function fillField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValidForm() {
  fillField("Adres e-mail", "jan@example.com");
  fillField("Hasło", PASSWORD);
}

function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));
}

function spyOnConsole() {
  return (["log", "info", "debug", "warn", "error"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
}

describe("LoginForm", () => {
  beforeEach(() => {
    loginUserMock.mockReset();
    startSessionMock.mockReset();
    pushMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the fields with the right autocomplete and limits", () => {
    renderForm();

    const email = screen.getByLabelText("Adres e-mail");
    const password = screen.getByLabelText("Hasło");
    expect(email.getAttribute("autocomplete")).toBe("email");
    expect(email.getAttribute("maxlength")).toBe("150");
    expect(password.getAttribute("autocomplete")).toBe("current-password");
    expect(password.getAttribute("maxlength")).toBe("64");
    expect(
      (screen.getByLabelText(REMEMBER_LABEL) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("links to registration and to the password reset", () => {
    renderForm();

    expect(
      screen
        .getByRole("link", { name: "Nie pamiętasz hasła?" })
        .getAttribute("href"),
    ).toBe("/forgot-password");
    expect(
      screen
        .getByRole("link", { name: "Zarejestruj się" })
        .getAttribute("href"),
    ).toBe("/register");
  });

  it("shows the success notice only after registration", () => {
    renderForm(true);

    expect(screen.getByRole("status").textContent).toBe(
      "Konto zostało utworzone. Zaloguj się.",
    );
  });

  it("shows no notice without the registered flag", () => {
    renderForm(false);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("blocks submit, shows errors and focuses the first invalid field", () => {
    renderForm();

    clickSubmit();

    const email = screen.getByLabelText("Adres e-mail");
    const message = screen.getByText("Adres e-mail jest wymagany");
    expect(loginUserMock).not.toHaveBeenCalled();
    expect(screen.getByText("Hasło jest wymagane")).toBeDefined();
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toContain(message.id);
    expect(document.activeElement).toBe(email);
  });

  it("shows our message instead of the native e-mail bubble", () => {
    renderForm();
    fillValidForm();
    fillField("Adres e-mail", "jan");

    clickSubmit();

    expect(
      screen.getByText("Podaj poprawny adres e-mail, np. jan@example.com"),
    ).toBeDefined();
    expect(loginUserMock).not.toHaveBeenCalled();
  });

  it("updates errors on change after the first submit", () => {
    renderForm();
    clickSubmit();
    expect(screen.getByText("Adres e-mail jest wymagany")).toBeDefined();

    fillField("Adres e-mail", "jan@example.com");

    expect(screen.queryByText("Adres e-mail jest wymagany")).toBeNull();
    expect(screen.getByText("Hasło jest wymagane")).toBeDefined();
  });

  it("does not apply the registration password rules", async () => {
    loginUserMock.mockResolvedValue(AUTH_RESPONSE);
    renderForm();
    fillField("Adres e-mail", "jan@example.com");
    fillField("Hasło", "a");

    clickSubmit();

    await waitFor(() => expect(loginUserMock).toHaveBeenCalledTimes(1));
  });

  it("sends trimmed e-mail without rememberMe, starts the session and redirects", async () => {
    loginUserMock.mockResolvedValue(AUTH_RESPONSE);
    renderForm();
    fillValidForm();
    fillField("Adres e-mail", " jan@example.com ");

    clickSubmit();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(loginUserMock).toHaveBeenCalledWith({
      email: "jan@example.com",
      password: PASSWORD,
    });
    expect(startSessionMock).toHaveBeenCalledWith(AUTH_RESPONSE, false);
  });

  it("passes rememberMe to the session, not to the request", async () => {
    loginUserMock.mockResolvedValue(AUTH_RESPONSE);
    renderForm();
    fillValidForm();
    fireEvent.click(screen.getByLabelText(REMEMBER_LABEL));

    clickSubmit();

    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(startSessionMock).toHaveBeenCalledWith(AUTH_RESPONSE, true);
    expect(loginUserMock).toHaveBeenCalledWith({
      email: "jan@example.com",
      password: PASSWORD,
    });
  });

  it("shows the detail of a 401 in a banner and marks no field invalid", async () => {
    loginUserMock.mockRejectedValue(
      new ApiError(401, { status: 401, detail: INVALID_CREDENTIALS }),
    );
    renderForm();
    fillValidForm();

    clickSubmit();

    const banner = await screen.findByText(INVALID_CREDENTIALS);
    expect(screen.getByRole("alert")).toBe(banner.closest("[role='alert']"));
    expect(
      screen.getByLabelText("Adres e-mail").getAttribute("aria-invalid"),
    ).toBeNull();
    expect(
      screen.getByLabelText("Hasło").getAttribute("aria-invalid"),
    ).toBeNull();
    expect(startSessionMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole("button", { name: "Zaloguj się" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("falls back to the fixed text when a 401 has no detail", async () => {
    loginUserMock.mockRejectedValue(new ApiError(401));
    renderForm();
    fillValidForm();

    clickSubmit();

    expect(await screen.findByText(INVALID_CREDENTIALS)).toBeDefined();
  });

  it("shows a banner for a network error", async () => {
    loginUserMock.mockRejectedValue(new NetworkError());
    renderForm();
    fillValidForm();

    clickSubmit();

    expect(await screen.findByText(NETWORK_ERROR_MESSAGE)).toBeDefined();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("disables the button while pending and sends only one request", () => {
    loginUserMock.mockReturnValue(new Promise(() => undefined));
    renderForm();
    fillValidForm();

    clickSubmit();

    const pending = screen.getByRole("button", { name: "Logowanie…" });
    expect(pending.hasAttribute("disabled")).toBe(true);
    const form = pending.closest("form");
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }
    expect(loginUserMock).toHaveBeenCalledTimes(1);
  });

  it("never writes the password to the console after a failure", async () => {
    const spies = spyOnConsole();
    loginUserMock.mockRejectedValue(new ApiError(500, { status: 500 }));
    renderForm();
    fillValidForm();

    clickSubmit();

    await screen.findByText(SERVER_ERROR_MESSAGE);
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain(PASSWORD);
  });

  it("never writes the password or the token to the console after a success", async () => {
    const spies = spyOnConsole();
    loginUserMock.mockResolvedValue(AUTH_RESPONSE);
    renderForm();
    fillValidForm();

    clickSubmit();

    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain(TOKEN);
  });
});
