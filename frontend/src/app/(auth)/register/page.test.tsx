import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import RegisterPage from "@/app/(auth)/register/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const PASSWORD_HINT =
  "Min. 8 znaków, 1 wielka litera, 1 cyfra, 1 znak specjalny (np. !, @, #, $).";

describe("RegisterPage", () => {
  test("renders the heading and the five form fields", () => {
    render(<RegisterPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Utwórz konto" }),
    ).toBeDefined();
    for (const label of [
      "Imię",
      "Nazwisko",
      "Adres e-mail",
      "Hasło",
      "Powtórz hasło",
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
  });

  test("describes the password field with the hint", () => {
    render(<RegisterPage />);

    const hint = screen.getByText(PASSWORD_HINT);

    expect(
      screen.getByLabelText("Hasło").getAttribute("aria-describedby"),
    ).toBe(hint.id);
  });

  test("renders the submit button and the link to login", () => {
    render(<RegisterPage />);

    expect(
      screen.getByRole("button", { name: "Zarejestruj się" }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Zaloguj się" }).getAttribute("href"),
    ).toBe("/login");
  });

  test("renders the unchecked terms checkbox and disables native validation", () => {
    render(<RegisterPage />);

    const checkbox = screen.getByLabelText(
      "Akceptuję Regulamin i Politykę prywatności",
    );

    expect(checkbox.getAttribute("type")).toBe("checkbox");
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(
      screen
        .getByRole("button", { name: "Zarejestruj się" })
        .closest("form")
        ?.hasAttribute("novalidate"),
    ).toBe(true);
  });
});
