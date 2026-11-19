import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Alert } from "@/components/ui/Alert";

describe("Alert", () => {
  it("announces an error with the alert role", () => {
    render(<Alert variant="error">Nie udało się połączyć z serwerem</Alert>);

    const alert = screen.getByRole("alert");

    expect(alert.textContent).toContain("Nie udało się połączyć z serwerem");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("announces a success with the status role", () => {
    render(<Alert variant="success">Konto zostało utworzone</Alert>);

    const status = screen.getByRole("status");

    expect(status.textContent).toContain("Konto zostało utworzone");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the message text exactly once", () => {
    render(<Alert variant="error">Błąd</Alert>);

    expect(screen.getAllByText("Błąd")).toHaveLength(1);
  });

  it("is not focusable without a ref", () => {
    render(<Alert variant="error">Błąd</Alert>);

    expect(screen.getByRole("alert").getAttribute("tabindex")).toBeNull();
  });

  it("can take the focus from the parent when it gets a ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Alert variant="error" ref={ref}>
        Błąd
      </Alert>,
    );

    ref.current?.focus();

    expect(screen.getByRole("alert").getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(screen.getByRole("alert"));
  });
});
