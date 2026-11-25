import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetsView } from "@/components/budgets/BudgetsView";
import type {
  BudgetUsageState,
  UseBudgetUsageResult,
} from "@/hooks/useBudgetUsage";
import type { CategoriesState } from "@/hooks/useCategories";
import type { SetBudgetLimitResult } from "@/lib/api/budgets";
import { ApiError } from "@/lib/api/errors";
import { NORMAL_USAGE, TEST_BUDGET_USAGE } from "@/test-utils/budgets";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import { installDialogStub } from "@/test-utils/dialog";
import { TEST_MONTH_OPTIONS } from "@/test-utils/transactions";
import type { SetBudgetLimitRequest } from "@/types/api";

const useBudgetUsageMock = vi.hoisted(() =>
  vi.fn<(month: string | null) => UseBudgetUsageResult>(),
);
const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());
const setBudgetLimitMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      request: SetBudgetLimitRequest,
    ) => Promise<SetBudgetLimitResult>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());
const pushMock = vi.hoisted(() =>
  vi.fn<(href: string, options?: { scroll: boolean }) => void>(),
);
const replaceMock = vi.hoisted(() =>
  vi.fn<(href: string, options?: { scroll: boolean }) => void>(),
);

vi.mock("@/hooks/useBudgetUsage", () => ({
  useBudgetUsage: useBudgetUsageMock,
}));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));
vi.mock("@/lib/api/budgets", () => ({
  setBudgetLimit: setBudgetLimitMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

function viewElement(
  month: string | null,
  editCategoryId: number | null = null,
) {
  return (
    <BudgetsView
      month={month}
      monthOptions={TEST_MONTH_OPTIONS}
      editCategoryId={editCategoryId}
    />
  );
}

function renderView(
  state: BudgetUsageState,
  month: string | null = null,
  retry: () => void = vi.fn(),
  editCategoryId: number | null = null,
) {
  useBudgetUsageMock.mockReturnValue({ state, retry });
  return render(viewElement(month, editCategoryId));
}

const READY: BudgetUsageState = { status: "ready", usage: TEST_BUDGET_USAGE };

describe("BudgetsView", () => {
  beforeEach(() => {
    useBudgetUsageMock.mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
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

describe("BudgetsView limit dialogs", () => {
  const CATEGORY = "Kategoria *";
  const AMOUNT = "Limit miesięczny (PLN) *";
  const ALL_TAKEN_MESSAGE =
    "Wszystkie kategorie wydatków mają już limit w tym miesiącu. Zmień istniejący limit przyciskiem Edytuj limit.";
  const SAVED_LIMIT = {
    id: 7,
    categoryId: 2,
    month: 11,
    year: 2026,
    limitAmount: 1200,
  };
  const CREATED: SetBudgetLimitResult = { created: true, limit: SAVED_LIMIT };
  const UPDATED: SetBudgetLimitResult = { created: false, limit: SAVED_LIMIT };

  beforeAll(installDialogStub);

  beforeEach(() => {
    useBudgetUsageMock.mockReset();
    useCategoriesMock.mockReset();
    setBudgetLimitMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
    readSessionTokenMock.mockReturnValue("token");
  });

  function openNewLimit() {
    fireEvent.click(screen.getByRole("button", { name: "+ Nowy limit" }));
  }

  function openEdit(categoryName: string) {
    fireEvent.click(
      screen.getByRole("button", { name: `Edytuj limit: ${categoryName}` }),
    );
  }

  function fill(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }

  async function save(name: string) {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name }));
    });
  }

  it.each<BudgetUsageState>([
    { status: "loading" },
    { status: "error" },
    READY,
  ])(
    "shows the new-limit button in every state except idle (case %#)",
    (state) => {
      renderView(state);

      expect(screen.getByRole("button", { name: "+ Nowy limit" })).toBeTruthy();
    },
  );

  it("puts an edit button named after the category on every card", () => {
    renderView(READY);

    for (const name of ["Artykuły spożywcze", "Rozrywka", "Paliwo"]) {
      expect(
        screen.getByRole("button", { name: `Edytuj limit: ${name}` }),
      ).toBeTruthy();
    }
  });

  it("offers only the expense categories that have no limit yet", () => {
    renderView({ status: "ready", usage: [NORMAL_USAGE] });

    openNewLimit();

    const select = screen.getByLabelText(CATEGORY) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      "Wybierz kategorię",
      "Rozrywka",
    ]);
  });

  it("explains that every category has a limit and keeps the button active", () => {
    renderView(READY);

    const button = screen.getByRole("button", {
      name: "+ Nowy limit",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    openNewLimit();

    expect(screen.getByText(ALL_TAKEN_MESSAGE)).toBeTruthy();
    expect(screen.queryByLabelText(AMOUNT)).toBeNull();
  });

  it("saves a new limit for the month shown, reloads, shows the toast and keeps the focus on the add button", async () => {
    setBudgetLimitMock.mockResolvedValue(CREATED);
    const retry = vi.fn();
    renderView({ status: "ready", usage: [NORMAL_USAGE] }, null, retry);

    openNewLimit();
    expect(
      within(screen.getByRole("dialog", { name: "Nowy limit" })).getByText(
        "Listopad 2026",
      ),
    ).toBeTruthy();
    fill(CATEGORY, "2");
    fill(AMOUNT, "1200");
    await save("Zapisz limit");

    expect(setBudgetLimitMock).toHaveBeenCalledWith("token", {
      categoryId: 2,
      month: 11,
      year: 2026,
      limitAmount: 1200,
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("Dodano limit");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "+ Nowy limit" }),
    );
  });

  it("sends the month from the address, not the default one", async () => {
    setBudgetLimitMock.mockResolvedValue(CREATED);
    renderView({ status: "ready", usage: [NORMAL_USAGE] }, "2026-10");

    openNewLimit();
    expect(
      within(screen.getByRole("dialog", { name: "Nowy limit" })).getByText(
        "Październik 2026",
      ),
    ).toBeTruthy();
    fill(CATEGORY, "2");
    fill(AMOUNT, "800,50");
    await save("Zapisz limit");

    expect(setBudgetLimitMock).toHaveBeenCalledWith("token", {
      categoryId: 2,
      month: 10,
      year: 2026,
      limitAmount: 800.5,
    });
  });

  it("opens the edit dialog filled from the card and saves the same category", async () => {
    setBudgetLimitMock.mockResolvedValue(UPDATED);
    const retry = vi.fn();
    renderView(READY, null, retry);

    openEdit("Rozrywka");
    const dialog = screen.getByRole("dialog", { name: "Edytuj limit" });
    expect(within(dialog).getByText("Rozrywka")).toBeTruthy();
    expect((screen.getByLabelText(AMOUNT) as HTMLInputElement).value).toBe(
      "1000,00",
    );
    fill(AMOUNT, "1200");
    await save("Zapisz zmiany");

    expect(setBudgetLimitMock).toHaveBeenCalledWith("token", {
      categoryId: 2,
      month: 11,
      year: 2026,
      limitAmount: 1200,
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("Zaktualizowano limit");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns the focus to the edit button of the same card once the usage is back", async () => {
    setBudgetLimitMock.mockResolvedValue(UPDATED);
    const retry = vi.fn();
    const { rerender } = renderView(READY, null, retry);

    openEdit("Rozrywka");
    fill(AMOUNT, "1200");
    await save("Zapisz zmiany");

    // The reload replaces the cards by the skeleton, and the focused button goes with them.
    useBudgetUsageMock.mockReturnValue({ state: { status: "loading" }, retry });
    rerender(viewElement(null));
    expect(document.activeElement).toBe(document.body);

    useBudgetUsageMock.mockReturnValue({ state: READY, retry });
    rerender(viewElement(null));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Edytuj limit: Rozrywka" }),
    );
  });

  it("keeps the focus on the add button while the usage reloads after a new limit", async () => {
    setBudgetLimitMock.mockResolvedValue(CREATED);
    const retry = vi.fn();
    const { rerender } = renderView(
      { status: "ready", usage: [NORMAL_USAGE] },
      null,
      retry,
    );

    openNewLimit();
    fill(CATEGORY, "2");
    fill(AMOUNT, "1200");
    await save("Zapisz limit");
    const addButton = screen.getByRole("button", { name: "+ Nowy limit" });

    useBudgetUsageMock.mockReturnValue({ state: { status: "loading" }, retry });
    rerender(viewElement(null));
    expect(document.activeElement).toBe(addButton);

    useBudgetUsageMock.mockReturnValue({ state: READY, retry });
    rerender(viewElement(null));
    expect(document.activeElement).toBe(addButton);
  });

  it("keeps the dialog, the typed amount and the data when saving fails", async () => {
    setBudgetLimitMock.mockRejectedValue(
      new ApiError(409, {
        status: 409,
        detail: "Odśwież dane i spróbuj ponownie.",
      }),
    );
    const retry = vi.fn();
    renderView(READY, null, retry);

    openEdit("Rozrywka");
    fill(AMOUNT, "1200");
    await save("Zapisz zmiany");

    expect(screen.getByRole("alert").textContent).toBe(
      "Odśwież dane i spróbuj ponownie.",
    );
    expect(screen.getByRole("dialog", { name: "Edytuj limit" })).toBeTruthy();
    expect((screen.getByLabelText(AMOUNT) as HTMLInputElement).value).toBe(
      "1200",
    );
    expect(retry).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("returns the focus to the edit button on Anuluj", () => {
    renderView(READY);

    openEdit("Rozrywka");
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(setBudgetLimitMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Edytuj limit: Rozrywka" }),
    );
  });
});

describe("BudgetsView opened with ?edit= in the address", () => {
  const CATEGORY = "Kategoria *";
  const AMOUNT = "Limit miesięczny (PLN) *";
  const UPDATED: SetBudgetLimitResult = {
    created: false,
    limit: { id: 7, categoryId: 2, month: 11, year: 2026, limitAmount: 1200 },
  };

  beforeAll(installDialogStub);

  beforeEach(() => {
    useBudgetUsageMock.mockReset();
    useCategoriesMock.mockReset();
    setBudgetLimitMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
    readSessionTokenMock.mockReturnValue("token");
  });

  function fill(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }

  async function save(name: string) {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name }));
    });
  }

  it("opens the edit dialog of the category that has a limit", () => {
    renderView(READY, null, vi.fn(), 2);

    const dialog = screen.getByRole("dialog", { name: "Edytuj limit" });
    expect(within(dialog).getByText("Rozrywka")).toBeTruthy();
    expect((screen.getByLabelText(AMOUNT) as HTMLInputElement).value).toBe(
      "1000,00",
    );
  });

  it("opens a new limit with the category chosen when it has no limit yet", () => {
    renderView({ status: "ready", usage: [NORMAL_USAGE] }, null, vi.fn(), 2);

    expect(screen.getByRole("dialog", { name: "Nowy limit" })).toBeTruthy();
    expect((screen.getByLabelText(CATEGORY) as HTMLSelectElement).value).toBe(
      "2",
    );
  });

  it("waits for the usage before it opens anything", () => {
    const retry = vi.fn();
    const { rerender } = renderView({ status: "loading" }, null, retry, 2);
    expect(screen.queryByRole("dialog")).toBeNull();

    useBudgetUsageMock.mockReturnValue({ state: READY, retry });
    rerender(viewElement(null, 2));

    expect(screen.getByRole("dialog", { name: "Edytuj limit" })).toBeTruthy();
  });

  it("opens no dialog when the usage fails to load", () => {
    renderView({ status: "error" }, null, vi.fn(), 2);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens no dialog without ?edit=", () => {
    renderView(READY);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("removes ?edit= on Anuluj, does not open the dialog again and focuses the add button", () => {
    const retry = vi.fn();
    const { rerender } = renderView(READY, null, retry, 2);

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(replaceMock).toHaveBeenCalledWith("/budgets", { scroll: false });
    expect(screen.queryByRole("dialog")).toBeNull();
    // The address still has ?edit= until the router has replaced it.
    rerender(viewElement(null, 2));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "+ Nowy limit" }),
    );
  });

  it("keeps the month in the address when it removes ?edit=", () => {
    renderView(READY, "2026-10", vi.fn(), 2);

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(replaceMock).toHaveBeenCalledWith("/budgets?month=2026-10", {
      scroll: false,
    });
  });

  it("saves the limit, removes ?edit= and reloads the usage", async () => {
    setBudgetLimitMock.mockResolvedValue(UPDATED);
    const retry = vi.fn();
    renderView(READY, null, retry, 2);

    fill(AMOUNT, "1200");
    await save("Zapisz zmiany");

    expect(setBudgetLimitMock).toHaveBeenCalledWith("token", {
      categoryId: 2,
      month: 11,
      year: 2026,
      limitAmount: 1200,
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/budgets", { scroll: false });
    expect(showToastMock).toHaveBeenCalledWith("Zaktualizowano limit");
  });

  it("leaves the address alone when the dialog was opened with a button", () => {
    renderView(READY);

    fireEvent.click(
      screen.getByRole("button", { name: "Edytuj limit: Rozrywka" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
