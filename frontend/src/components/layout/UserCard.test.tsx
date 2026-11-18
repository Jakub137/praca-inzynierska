import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserCard } from "@/components/layout/UserCard";
import { AuthContext, type AuthContextValue } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";

function renderCard(value: AuthContextValue) {
  render(
    <AuthContext.Provider value={value}>
      <UserCard />
    </AuthContext.Provider>,
  );
}

describe("UserCard", () => {
  it("shows the initials badge and the full name", () => {
    renderCard(makeAuthValue());

    expect(screen.getByText("JJ")).toBeDefined();
    expect(screen.getByText("Jakub Janiec")).toBeDefined();
  });

  it("renders the sign-out control as a button with visible text", () => {
    renderCard(makeAuthValue());
    const button = screen.getByRole("button", { name: "Wyloguj się" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.textContent).toBe("Wyloguj się");
  });

  it("calls logout when the button is clicked", () => {
    const logout = vi.fn();
    renderCard(makeAuthValue({ logout }));

    fireEvent.click(screen.getByRole("button", { name: "Wyloguj się" }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("shows no name while the session is loading", () => {
    renderCard(makeAuthValue({ status: "loading", user: undefined }));

    expect(screen.queryByText("Jakub Janiec")).toBeNull();
    expect(screen.getByRole("button", { name: "Wyloguj się" })).toBeDefined();
  });

  it("shows no name when the session could not be restored", () => {
    renderCard(makeAuthValue({ status: "error", user: undefined }));

    expect(screen.queryByText("Jakub Janiec")).toBeNull();
    expect(screen.getByRole("button", { name: "Wyloguj się" })).toBeDefined();
  });
});
