import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "@/components/ui/Checkbox";

const LABEL = "Zapamiętaj mnie";

describe("Checkbox", () => {
  it("links the label to an unchecked checkbox", () => {
    render(<Checkbox label={LABEL} />);

    const input = screen.getByLabelText<HTMLInputElement>(LABEL);

    expect(input.getAttribute("type")).toBe("checkbox");
    expect(input.checked).toBe(false);
    expect(screen.getByText(LABEL).getAttribute("for")).toBe(input.id);
  });

  it("toggles when the box is clicked", () => {
    render(<Checkbox label={LABEL} />);
    const input = screen.getByLabelText<HTMLInputElement>(LABEL);

    fireEvent.click(input);
    expect(input.checked).toBe(true);

    fireEvent.click(input);
    expect(input.checked).toBe(false);
  });

  it("toggles when the label is clicked", () => {
    render(<Checkbox label={LABEL} />);

    fireEvent.click(screen.getByText(LABEL));

    expect(screen.getByLabelText<HTMLInputElement>(LABEL).checked).toBe(true);
  });

  it("sets no ARIA error attributes and no alert without an error", () => {
    render(<Checkbox label={LABEL} />);

    const input = screen.getByLabelText(LABEL);

    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("marks the checkbox invalid and describes it with the error", () => {
    render(<Checkbox label={LABEL} error="Zaakceptuj regulamin" />);

    const input = screen.getByLabelText(LABEL);
    const message = screen.getByRole("alert");

    expect(message.textContent).toContain("Zaakceptuj regulamin");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(message.id);
  });

  it("forwards native attributes and the ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox label={LABEL} name="rememberMe" ref={ref} />);

    const input = screen.getByLabelText(LABEL);

    expect(input.getAttribute("name")).toBe("rememberMe");
    expect(ref.current).toBe(input);
  });
});
