import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RetryError } from "@/components/ui/RetryError";

const MESSAGE = "Nie udało się wczytać celów.";

describe("RetryError", () => {
  it("shows the message in an error alert", () => {
    render(<RetryError message={MESSAGE} onRetry={vi.fn()} />);

    expect(screen.getByRole("alert").textContent).toBe(MESSAGE);
  });

  it("has a button named Spróbuj ponownie", () => {
    render(<RetryError message={MESSAGE} onRetry={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Spróbuj ponownie" });
    expect(button.getAttribute("type")).toBe("button");
  });

  it("calls onRetry once when the button is clicked", () => {
    const onRetry = vi.fn();
    render(<RetryError message={MESSAGE} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
