import { render, screen } from "@testing-library/react";
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
});
