import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiInsightBanner } from "@/components/dashboard/AiInsightBanner";
import type { DashboardInsightState } from "@/hooks/useDashboardInsight";
import { TEST_INSIGHT_MESSAGE } from "@/test-utils/dashboardInsight";

const READY_WITH_INSIGHT: DashboardInsightState = {
  status: "ready",
  insight: {
    categoryId: 2,
    categoryName: "Rozrywka",
    message: TEST_INSIGHT_MESSAGE,
  },
};

describe("AiInsightBanner", () => {
  it("shows the title, the message and a link to the limit of the category", () => {
    render(<AiInsightBanner state={READY_WITH_INSIGHT} />);

    const banner = screen.getByRole("region", { name: "Sugestia modułu AI" });
    expect(banner.textContent).toContain("Sugestia (Moduł AI):");
    expect(banner.textContent).toContain(TEST_INSIGHT_MESSAGE);
    const link = screen.getByRole("link", {
      name: "Dostosuj limit: Rozrywka",
    });
    expect(link.getAttribute("href")).toBe("/budgets?edit=2");
  });

  it("ends the link text with an arrow that screen readers skip", () => {
    render(<AiInsightBanner state={READY_WITH_INSIGHT} />);

    const link = screen.getByRole("link", {
      name: "Dostosuj limit: Rozrywka",
    });
    expect(link.textContent).toBe("Dostosuj limit →");
    expect(link.querySelector("span")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("uses the purple AI tokens", () => {
    render(<AiInsightBanner state={READY_WITH_INSIGHT} />);

    const banner = screen.getByRole("region", { name: "Sugestia modułu AI" });
    expect(banner.className).toContain("bg-ai-surface");
    expect(banner.className).toContain("border-ai/30");
    expect(
      screen.getByRole("link", { name: "Dostosuj limit: Rozrywka" }).className,
    ).toContain("text-ai");
  });

  it.each<[string, DashboardInsightState]>([
    ["idle", { status: "idle" }],
    ["loading", { status: "loading" }],
    ["error", { status: "error" }],
    ["ready without an insight", { status: "ready", insight: null }],
  ])("renders nothing when the state is %s", (_name, state) => {
    const { container } = render(<AiInsightBanner state={state} />);

    expect(container.innerHTML).toBe("");
  });
});
