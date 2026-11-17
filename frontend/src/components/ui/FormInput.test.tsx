import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { FormInput } from "@/components/ui/FormInput";

const SHOW_LABEL = "Pokaż hasło";
const HIDE_LABEL = "Ukryj hasło";

function typeOf(element: HTMLElement) {
  return element.getAttribute("type");
}

describe("FormInput", () => {
  it("links the label to the input", () => {
    render(<FormInput label="Imię" />);

    const input = screen.getByLabelText("Imię");

    expect(input.tagName).toBe("INPUT");
    expect(input.id).not.toBe("");
    expect(screen.getByText("Imię").getAttribute("for")).toBe(input.id);
  });

  it("renders a text input by default", () => {
    render(<FormInput label="Imię" />);

    expect(typeOf(screen.getByLabelText("Imię"))).toBe("text");
  });

  it("renders an e-mail input when asked", () => {
    render(<FormInput label="Adres e-mail" type="email" />);

    expect(typeOf(screen.getByLabelText("Adres e-mail"))).toBe("email");
  });

  it("sets no ARIA error attributes and no alert without an error", () => {
    render(<FormInput label="Imię" />);

    const input = screen.getByLabelText("Imię");

    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("marks the input invalid and describes it with the error", () => {
    render(<FormInput label="Imię" error="Imię jest wymagane" />);

    const input = screen.getByLabelText("Imię");
    const message = screen.getByRole("alert");

    expect(message.textContent).toContain("Imię jest wymagane");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(message.id);
  });

  it("describes the input with the hint alone when there is no error", () => {
    render(<FormInput label="Hasło" hint="Min. 8 znaków" />);

    const hint = screen.getByText("Min. 8 znaków");

    expect(hint.id).not.toBe("");
    expect(
      screen.getByLabelText("Hasło").getAttribute("aria-describedby"),
    ).toBe(hint.id);
    expect(
      screen.getByLabelText("Hasło").getAttribute("aria-invalid"),
    ).toBeNull();
  });

  it("describes the input with the hint first and the error second", () => {
    render(
      <FormInput
        label="Hasło"
        hint="Min. 8 znaków"
        error="Hasło jest za krótkie"
      />,
    );

    const hint = screen.getByText("Min. 8 znaków");
    const message = screen.getByRole("alert");

    expect(
      screen.getByLabelText("Hasło").getAttribute("aria-describedby"),
    ).toBe(`${hint.id} ${message.id}`);
  });

  it("renders no visibility toggle for non-password types", () => {
    render(
      <>
        <FormInput label="Imię" />
        <FormInput label="Adres e-mail" type="email" />
      </>,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("switches the password input between password and text", () => {
    render(<FormInput label="Hasło" type="password" />);

    const input = screen.getByLabelText("Hasło");
    expect(typeOf(input)).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: SHOW_LABEL }));

    expect(typeOf(input)).toBe("text");
    expect(screen.queryByRole("button", { name: SHOW_LABEL })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: HIDE_LABEL }));

    expect(typeOf(input)).toBe("password");
    expect(screen.getByRole("button", { name: SHOW_LABEL })).toBeDefined();
  });

  it("renders the toggle as a non-submitting button", () => {
    render(<FormInput label="Hasło" type="password" />);

    expect(
      screen.getByRole("button", { name: SHOW_LABEL }).getAttribute("type"),
    ).toBe("button");
  });

  it("keeps the typed value when the visibility changes", () => {
    render(<FormInput label="Hasło" type="password" />);
    const input = screen.getByLabelText<HTMLInputElement>("Hasło");
    fireEvent.change(input, { target: { value: "Haslo123!" } });

    fireEvent.click(screen.getByRole("button", { name: SHOW_LABEL }));

    expect(input.value).toBe("Haslo123!");
  });

  it("toggles two password fields independently", () => {
    render(
      <>
        <FormInput label="Hasło" type="password" />
        <FormInput label="Powtórz hasło" type="password" />
      </>,
    );
    const password = screen.getByLabelText("Hasło");
    const confirmation = screen.getByLabelText("Powtórz hasło");

    fireEvent.click(screen.getAllByRole("button", { name: SHOW_LABEL })[0]);

    expect(typeOf(password)).toBe("text");
    expect(typeOf(confirmation)).toBe("password");
    expect(screen.getAllByRole("button", { name: SHOW_LABEL })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: HIDE_LABEL })).toHaveLength(1);
  });

  it("disables the toggle together with the input", () => {
    render(<FormInput label="Hasło" type="password" disabled />);

    expect(
      screen.getByRole("button", { name: SHOW_LABEL }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("forwards native attributes and the ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <FormInput
        label="Adres e-mail"
        name="email"
        maxLength={150}
        autoComplete="email"
        ref={ref}
      />,
    );

    const input = screen.getByLabelText("Adres e-mail");

    expect(input.getAttribute("name")).toBe("email");
    expect(input.getAttribute("maxlength")).toBe("150");
    expect(input.getAttribute("autocomplete")).toBe("email");
    expect(ref.current).toBe(input);
  });
});
