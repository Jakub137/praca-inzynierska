import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionGate } from "@/components/layout/SessionGate";
import { AuthContext, type AuthContextValue } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";

function renderGate(value: AuthContextValue) {
  render(
    <AuthContext.Provider value={value}>
      <SessionGate>
        <p>Treść strony</p>
      </SessionGate>
    </AuthContext.Provider>,
  );
}

describe("SessionGate", () => {
  it("renders the page for an authenticated user", () => {
    renderGate(makeAuthValue());

    expect(screen.getByText("Treść strony")).toBeDefined();
  });

  it("shows a loading status instead of the page while loading", () => {
    renderGate(makeAuthValue({ status: "loading", user: undefined }));

    expect(screen.getByRole("status").textContent).toBe("Ładowanie…");
    expect(screen.queryByText("Treść strony")).toBeNull();
  });

  it("shows an error alert with a retry button on error", () => {
    const retry = vi.fn();
    renderGate(makeAuthValue({ status: "error", user: undefined, retry }));

    expect(screen.getByRole("alert").textContent).toContain(
      "Nie udało się połączyć z serwerem.",
    );
    expect(screen.queryByText("Treść strony")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("renders nothing for an unauthenticated user", () => {
    renderGate(makeAuthValue({ status: "unauthenticated", user: undefined }));

    expect(screen.queryByText("Treść strony")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
