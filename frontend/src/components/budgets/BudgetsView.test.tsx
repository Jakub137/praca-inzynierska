import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetsView } from "@/components/budgets/BudgetsView";
import type {
  BudgetUsageState,
  UseBudgetUsageResult,
} from "@/hooks/useBudgetUsage";
import { TEST_BUDGET_USAGE } from "@/test-utils/budgets";
import { TEST_MONTH_OPTIONS } from "@/test-utils/transactions";

const useBudgetUsageMock = vi.hoisted(() =>
  vi.fn<(month: string | null) => UseBudgetUsageResult>(),
);
const pushMock = vi.hoisted(() =>
  vi.fn<(href: string, options?: { scroll: boolean }) => void>(),
);

vi.mock("@/hooks/useBudgetUsage", () => ({
  useBudgetUsage: useBudgetUsageMock,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function renderView(
  state: BudgetUsageState,
  month: string | null = null,
  retry: () => void = vi.fn(),
) {
  useBudgetUsageMock.mockReturnValue({ state, retry });
  return render(
    <BudgetsView month={month} monthOptions={TEST_MONTH_OPTIONS} />,
  );
}

const READY: BudgetUsageState = { status: "ready", usage: TEST_BUDGET_USAGE };

describe("BudgetsView", () => {
  beforeEach(() => {
    useBudgetUsageMock.mockReset();
    pushMock.mockReset();
  });

  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderView({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });

  it("passes the month from the address to the hook", () => {
    renderView({ status: "loading" }, "2026-10");

    expect(useBudgetUsageMock).toHaveBeenCalledWith("2026-10");
  });

  it("shows the loading skeleton", () => {
    renderView({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe("Ładowanie limitów");
  });

  it("shows an error with a retry button", () => {
    const retry = vi.fn();
    renderView({ status: "error" }, null, retry);

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać limitów.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows a text message instead of an empty grid", () => {
    renderView({ status: "ready", usage: [] });

    expect(
      screen.getByRole("heading", { name: "Brak limitów w tym miesiącu" }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("renders one card per category with its status", () => {
    renderView(READY);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["Artykuły spożywcze", "Rozrywka", "Paliwo"]);
    expect(screen.getByText("W normie")).toBeTruthy();
    expect(screen.getByText("Zbliżasz się do limitu")).toBeTruthy();
    expect(screen.getByText("Przekroczono limit")).toBeTruthy();
  });

  it("offers the month options and selects the first one by default", () => {
    renderView(READY);

    const select = screen.getByLabelText("Miesiąc") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      "Listopad 2026",
      "Październik 2026",
    ]);
    expect(select.value).toBe("2026-11");
  });

  it("selects the month from the address", () => {
    renderView(READY, "2026-10");

    expect((screen.getByLabelText("Miesiąc") as HTMLSelectElement).value).toBe(
      "2026-10",
    );
  });

  it("puts a chosen older month into the address", () => {
    renderView(READY);

    fireEvent.change(screen.getByLabelText("Miesiąc"), {
      target: { value: "2026-10" },
    });

    expect(pushMock).toHaveBeenCalledWith("/budgets?month=2026-10", {
      scroll: false,
    });
  });

  it("clears the address when the current month is chosen again", () => {
    renderView(READY, "2026-10");

    fireEvent.change(screen.getByLabelText("Miesiąc"), {
      target: { value: "2026-11" },
    });

    expect(pushMock).toHaveBeenCalledWith("/budgets", { scroll: false });
  });
});
