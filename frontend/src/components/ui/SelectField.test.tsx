import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectField } from "@/components/ui/SelectField";

function renderField(onChange = vi.fn()) {
  render(
    <SelectField id="kind" label="Typ" value="a" onChange={onChange}>
      <option value="a">Alfa</option>
      <option value="b">Beta</option>
    </SelectField>,
  );
  return onChange;
}

describe("SelectField", () => {
  it("links the visible label to the select", () => {
    renderField();

    expect(screen.getByLabelText("Typ")).toBe(screen.getByRole("combobox"));
  });

  it("shows the current value", () => {
    renderField();

    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("a");
  });

  it("reports the chosen value", () => {
    const onChange = renderField();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });

    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("uses the input-border token for the border", () => {
    renderField();

    expect(screen.getByRole("combobox").className).toContain(
      "border-input-border",
    );
  });

  it("shows the error and links it to the select", () => {
    render(
      <SelectField
        id="kind"
        label="Typ"
        value="a"
        onChange={vi.fn()}
        error="Wybierz kategorię."
      >
        <option value="a">Alfa</option>
      </SelectField>,
    );

    const select = screen.getByRole("combobox");
    const alert = screen.getByRole("alert");

    expect(alert.textContent).toBe("Wybierz kategorię.");
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(select.getAttribute("aria-describedby")).toBe(alert.id);
    expect(select.className).toContain("border-danger");
  });

  it("sets no error attributes for an empty error text", () => {
    render(
      <SelectField id="kind" label="Typ" value="a" onChange={vi.fn()} error="">
        <option value="a">Alfa</option>
      </SelectField>,
    );

    const select = screen.getByRole("combobox");

    expect(screen.queryByRole("alert")).toBeNull();
    expect(select.getAttribute("aria-invalid")).toBeNull();
    expect(select.getAttribute("aria-describedby")).toBeNull();
  });

  it("keeps the fixed filter width unless fullWidth is set", () => {
    const { unmount } = render(
      <SelectField id="kind" label="Typ" value="a" onChange={vi.fn()}>
        <option value="a">Alfa</option>
      </SelectField>,
    );

    expect(screen.getByRole("combobox").parentElement?.className).toContain(
      "sm:w-56",
    );

    unmount();
    render(
      <SelectField id="kind" label="Typ" value="a" onChange={vi.fn()} fullWidth>
        <option value="a">Alfa</option>
      </SelectField>,
    );

    expect(screen.getByRole("combobox").parentElement?.className).not.toContain(
      "sm:w-56",
    );
  });

  it("disables the select", () => {
    render(
      <SelectField id="kind" label="Typ" value="a" onChange={vi.fn()} disabled>
        <option value="a">Alfa</option>
      </SelectField>,
    );

    expect((screen.getByRole("combobox") as HTMLSelectElement).disabled).toBe(
      true,
    );
  });
});
