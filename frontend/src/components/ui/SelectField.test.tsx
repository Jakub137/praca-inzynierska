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
});
