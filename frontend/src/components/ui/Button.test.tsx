import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { FOCUS_RING } from "@/lib/focusRing";

describe("Button", () => {
  it("is type=button by default, so it never submits a form by accident", () => {
    render(<Button>Zapisz</Button>);

    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("passes type=submit and the form attribute through", () => {
    render(
      <Button type="submit" form="limit-form">
        Zapisz
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.getAttribute("form")).toBe("limit-form");
  });

  it("is primary by default: brand background, white text", () => {
    render(<Button>Zapisz</Button>);

    const { className } = screen.getByRole("button");
    expect(className).toContain("bg-brand");
    expect(className).toContain("text-white");
  });

  it("draws the secondary variant with the slate-300 border and no brand background", () => {
    render(<Button variant="secondary">Anuluj</Button>);

    const { className } = screen.getByRole("button");
    expect(className).toContain("border-slate-300");
    expect(className).not.toContain("bg-brand");
  });

  it.each<"primary" | "secondary">(["primary", "secondary"])(
    "keeps the focus ring in the %s variant",
    (variant) => {
      render(<Button variant={variant}>Zapisz</Button>);

      expect(screen.getByRole("button").className).toContain(FOCUS_RING);
    },
  );

  it("appends the given class names to the variant classes", () => {
    render(<Button className="self-start">Zapisz</Button>);

    const { className } = screen.getByRole("button");
    expect(className).toContain("min-h-11");
    expect(className).toContain("self-start");
  });

  it("passes the ref, aria-label and onClick to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <Button ref={ref} aria-label="Edytuj limit: Rozrywka" onClick={onClick}>
        Edytuj limit
      </Button>,
    );

    const button = screen.getByRole("button", {
      name: "Edytuj limit: Rozrywka",
    });
    fireEvent.click(button);

    expect(ref.current).toBe(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
