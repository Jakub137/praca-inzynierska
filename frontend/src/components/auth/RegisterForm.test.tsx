import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/auth/RegisterForm";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  NetworkError,
  SERVER_ERROR_MESSAGE,
} from "@/lib/api/errors";

const { pushMock, registerUserMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  registerUserMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/lib/api/auth", () => ({ registerUser: registerUserMock }));

const PASSWORD = "Haslo123!";
const TERMS_LABEL = "Akceptuję Regulamin i Politykę prywatności";
const EMAIL_TAKEN = "Adres e-mail jest już zajęty przez inne konto";

function fillField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValidForm() {
  fillField("Imię", "Jan");
  fillField("Nazwisko", "Kowalski");
  fillField("Adres e-mail", "jan@example.com");
  fillField("Hasło", PASSWORD);
  fillField("Powtórz hasło", PASSWORD);
  fireEvent.click(screen.getByLabelText(TERMS_LABEL));
}

function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: "Zarejestruj się" }));
}

describe("RegisterForm", () => {
  beforeEach(() => {
    registerUserMock.mockReset();
    pushMock.mockReset();
    render(<RegisterForm />);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks submit, shows errors and focuses the first invalid field", () => {
    clickSubmit();

    const firstName = screen.getByLabelText("Imię");
    const message = screen.getByText("Imię jest wymagane");
    expect(registerUserMock).not.toHaveBeenCalled();
    expect(firstName.getAttribute("aria-invalid")).toBe("true");
    expect(firstName.getAttribute("aria-describedby")).toContain(message.id);
    expect(document.activeElement).toBe(firstName);
  });

  it("shows our message instead of the native e-mail bubble", () => {
    fillValidForm();
    fillField("Adres e-mail", "jan");

    clickSubmit();

    expect(
      screen.getByText("Podaj poprawny adres e-mail, np. jan@example.com"),
    ).toBeDefined();
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it("blocks submit when the passwords differ", () => {
    fillValidForm();
    fillField("Powtórz hasło", "Haslo123?");

    clickSubmit();

    expect(
      screen.getByText(
        "Hasła nie są takie same. Wpisz to samo hasło w obu polach.",
      ),
    ).toBeDefined();
    expect(document.activeElement).toBe(screen.getByLabelText("Powtórz hasło"));
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it("toggles the password and the confirmation independently", () => {
    const password = screen.getByLabelText("Hasło");
    const confirmation = screen.getByLabelText("Powtórz hasło");
    expect(password.getAttribute("type")).toBe("password");
    expect(confirmation.getAttribute("type")).toBe("password");

    fireEvent.click(screen.getAllByRole("button", { name: "Pokaż hasło" })[0]);

    expect(password.getAttribute("type")).toBe("text");
    expect(confirmation.getAttribute("type")).toBe("password");
  });

  it("blocks submit when the terms are not accepted", () => {
    fillValidForm();
    fireEvent.click(screen.getByLabelText(TERMS_LABEL));

    clickSubmit();

    expect(
      screen.getByText(
        "Zaakceptuj Regulamin i Politykę prywatności, aby założyć konto",
      ),
    ).toBeDefined();
    expect(document.activeElement).toBe(screen.getByLabelText(TERMS_LABEL));
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it("updates errors on change after the first submit", () => {
    clickSubmit();
    expect(screen.getByText("Imię jest wymagane")).toBeDefined();

    fillField("Imię", "Jan");

    expect(screen.queryByText("Imię jest wymagane")).toBeNull();
    expect(screen.getByText("Nazwisko jest wymagane")).toBeDefined();
  });

  it("sends trimmed data without a token and redirects to login", async () => {
    registerUserMock.mockResolvedValue(undefined);
    fillValidForm();
    fillField("Imię", "  Jan ");
    fillField("Adres e-mail", " jan@example.com ");

    clickSubmit();

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/login?registered=1"),
    );
    expect(registerUserMock).toHaveBeenCalledWith({
      firstName: "Jan",
      lastName: "Kowalski",
      email: "jan@example.com",
      password: PASSWORD,
    });
  });

  it("shows a taken e-mail on the e-mail field, not in a banner", async () => {
    registerUserMock.mockRejectedValue(
      new ApiError(409, { status: 409, detail: EMAIL_TAKEN }),
    );
    fillValidForm();

    clickSubmit();

    const message = await screen.findByText(EMAIL_TAKEN);
    const email = screen.getByLabelText("Adres e-mail");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toContain(message.id);
    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("maps fieldErrors of a 400 onto the fields", async () => {
    const message = "Hasło musi zawierać co najmniej jedną cyfrę";
    registerUserMock.mockRejectedValue(
      new ApiError(400, {
        status: 400,
        fieldErrors: [{ field: "password", message }],
      }),
    );
    fillValidForm();

    clickSubmit();

    await screen.findByText(message);
    const password = screen.getByLabelText("Hasło");
    expect(password.getAttribute("aria-invalid")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(password));
  });

  it("clears a server error once the field is edited", async () => {
    registerUserMock.mockRejectedValue(
      new ApiError(409, { status: 409, detail: EMAIL_TAKEN }),
    );
    fillValidForm();
    clickSubmit();
    await screen.findByText(EMAIL_TAKEN);

    fillField("Adres e-mail", "inny@example.com");

    expect(screen.queryByText(EMAIL_TAKEN)).toBeNull();
  });

  it("shows a banner for a network error and re-enables the button", async () => {
    registerUserMock.mockRejectedValue(new NetworkError());
    fillValidForm();

    clickSubmit();

    await screen.findByText(NETWORK_ERROR_MESSAGE);
    expect(
      screen.getByLabelText("Adres e-mail").getAttribute("aria-invalid"),
    ).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Zarejestruj się" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("disables the button while pending and sends only one request", () => {
    registerUserMock.mockReturnValue(new Promise(() => undefined));
    fillValidForm();

    clickSubmit();

    const pending = screen.getByRole("button", { name: "Rejestracja…" });
    expect(pending.hasAttribute("disabled")).toBe(true);
    const form = pending.closest("form");
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }
    expect(registerUserMock).toHaveBeenCalledTimes(1);
  });

  it("never writes the password to the console", async () => {
    const spies = (["log", "info", "debug", "warn", "error"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    registerUserMock.mockRejectedValue(new ApiError(500, { status: 500 }));
    fillValidForm();

    clickSubmit();

    await screen.findByText(SERVER_ERROR_MESSAGE);
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain(PASSWORD);
  });
});
