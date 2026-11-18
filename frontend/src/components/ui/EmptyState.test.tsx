import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { EmptyState } from "@/components/ui/EmptyState";

const MOCK_TITLE = "Brak transakcji";
const MOCK_DESCRIPTION = "Dodaj pierwszą transakcję, aby zobaczyć listę.";

function renderEmptyState(actionButton?: ReactNode) {
  return render(
    <EmptyState
      icon={<SearchIcon />}
      title={MOCK_TITLE}
      description={MOCK_DESCRIPTION}
      actionButton={actionButton}
    />,
  );
}

describe("EmptyState", () => {
  it("renders the title as a heading and the description", () => {
    renderEmptyState();

    expect(screen.getByRole("heading", { name: MOCK_TITLE })).toBeTruthy();
    expect(screen.getByText(MOCK_DESCRIPTION)).toBeTruthy();
  });

  it("renders the provided icon inside a decorative wrapper", () => {
    const { container } = renderEmptyState();

    const wrapper = container.querySelector('[aria-hidden="true"]');

    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector("svg")).not.toBeNull();
  });

  it("renders the action button when provided", () => {
    renderEmptyState(
      <button type="button" className="rounded-lg bg-brand px-4 text-white">
        Dodaj transakcję
      </button>,
    );

    const button = screen.getByRole("button", { name: "Dodaj transakcję" });

    expect(button.className).toContain("bg-brand");
  });

  it("renders no button when actionButton is omitted", () => {
    renderEmptyState();

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses a subtle gray background and centered text", () => {
    const { container } = renderEmptyState();

    const root = container.firstElementChild;

    expect(root?.classList.contains("bg-slate-100")).toBe(true);
    expect(root?.classList.contains("text-center")).toBe(true);
  });
});
