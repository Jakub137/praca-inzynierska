import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LimitDialog } from "@/components/budgets/LimitDialog";
import type { CategoriesState } from "@/hooks/useCategories";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  NetworkError,
} from "@/lib/api/errors";
import { LIMIT_THRESHOLD_HINT } from "@/lib/budgets/limitForm";
import { NORMAL_USAGE } from "@/test-utils/budgets";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import { installDialogStub } from "@/test-utils/dialog";
import type { SetBudgetLimitRequest } from "@/types/api";

const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());

vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));

type Submit = (request: SetBudgetLimitRequest) => Promise<void>;

const PERIOD = { year: 2026, month: 11 };
const CATEGORY = "Kategoria *";
const AMOUNT = "Limit miesięczny (PLN) *";
const ALL_TAKEN_MESSAGE =
  "Wszystkie kategorie wydatków mają już limit w tym miesiącu. Zmień istniejący limit przyciskiem Edytuj limit.";

type RenderOptions = {
  takenCategoryIds?: readonly number[];
  initialCategoryId?: number;
  onSubmit?: Submit;
};

function renderCreate({
  takenCategoryIds = [],
  initialCategoryId,
  onSubmit = () => Promise.resolve(),
}: RenderOptions = {}) {
  const onClose = vi.fn();
  const submit = vi.fn<Submit>(onSubmit);
  render(
    <LimitDialog
      mode="create"
      period={PERIOD}
      periodLabel="Listopad 2026"
      takenCategoryIds={takenCategoryIds}
      initialCategoryId={initialCategoryId}
      onClose={onClose}
      onSubmit={submit}
    />,
  );
  return { onClose, onSubmit: submit };
}

function renderEdit({
  onSubmit = () => Promise.resolve(),
}: RenderOptions = {}) {
  const onClose = vi.fn();
  const submit = vi.fn<Submit>(onSubmit);
  render(
    <LimitDialog
      mode="edit"
      period={PERIOD}
      periodLabel="Listopad 2026"
      limit={NORMAL_USAGE}
      onClose={onClose}
      onSubmit={submit}
    />,
  );
  return { onClose, onSubmit: submit };
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function clickSave(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

// Clicks save and lets the pending request settle inside act().
async function saveAndSettle(name: string) {
  await act(async () => {
    clickSave(name);
  });
}

function valueOf(label: string): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

describe("LimitDialog", () => {
  beforeAll(installDialogStub);

  beforeEach(() => {
    useCategoriesMock.mockReset();
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
  });

  describe("create mode", () => {
    it("renders the title, the month as text and the fields", () => {
      renderCreate();

      const dialog = screen.getByRole("dialog", { name: "Nowy limit" });
      expect(dialog.textContent).toContain("Listopad 2026");
      expect(screen.getByLabelText(CATEGORY)).toBeTruthy();
      expect(screen.getByLabelText(AMOUNT)).toBeTruthy();
      expect(screen.queryByLabelText(/Miesiąc/)).toBeNull();
    });

    it("explains the thresholds in a paragraph linked to the amount field", () => {
      renderCreate();

      const hint = screen.getByText(LIMIT_THRESHOLD_HINT);
      expect(hint.tagName).toBe("P");
      expect(
        screen.getByLabelText(AMOUNT).getAttribute("aria-describedby"),
      ).toContain(hint.id);
    });

    it("has no threshold select and no padlock", () => {
      renderCreate();

      expect(screen.queryByLabelText(/Próg/)).toBeNull();
      expect(screen.getAllByRole("combobox")).toHaveLength(1);
    });

    it("gives the fields the input-border token", () => {
      renderCreate();

      expect(screen.getByLabelText(CATEGORY).className).toContain(
        "border-input-border",
      );
      expect(screen.getByLabelText(AMOUNT).className).toContain(
        "border-input-border",
      );
    });

    it("offers only the expense categories without a limit", () => {
      renderCreate({ takenCategoryIds: [1] });

      const select = screen.getByLabelText(CATEGORY) as HTMLSelectElement;
      expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
        "Wybierz kategorię",
        "Rozrywka",
      ]);
    });

    it("shows a message and only a close button when every category has a limit", () => {
      const { onClose } = renderCreate({ takenCategoryIds: [1, 2] });

      expect(screen.getByText(ALL_TAKEN_MESSAGE)).toBeTruthy();
      expect(screen.queryByLabelText(AMOUNT)).toBeNull();
      expect(screen.queryByRole("button", { name: "Zapisz limit" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Anuluj" })).toBeNull();
      // The header cross and the footer button share the name "Zamknij".
      const closeButtons = screen.getAllByRole("button", { name: "Zamknij" });
      expect(closeButtons).toHaveLength(2);
      fireEvent.click(closeButtons[1]);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("disables the select and saving while the categories load", () => {
      useCategoriesMock.mockReturnValue({ status: "loading" });
      renderCreate();

      expect(
        (screen.getByLabelText(CATEGORY) as HTMLSelectElement).disabled,
      ).toBe(true);
      expect(
        (
          screen.getByRole("button", {
            name: "Zapisz limit",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    });

    it("shows a message at the field when the categories fail to load", () => {
      useCategoriesMock.mockReturnValue({ status: "error" });
      renderCreate();

      expect(screen.getByRole("alert").textContent).toBe(
        "Nie udało się wczytać kategorii. Zamknij okno i spróbuj ponownie.",
      );
    });

    it("sends nothing, shows both messages and focuses the category when the form is empty", async () => {
      const { onSubmit } = renderCreate();

      await saveAndSettle("Zapisz limit");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([
        "Wybierz kategorię.",
        "Podaj kwotę.",
      ]);
      expect(document.activeElement).toBe(screen.getByLabelText(CATEGORY));
    });

    it("sends the request with the explicit month and year", async () => {
      const { onSubmit } = renderCreate();

      fill(CATEGORY, "2");
      fill(AMOUNT, "1200,50");
      await saveAndSettle("Zapisz limit");

      expect(onSubmit).toHaveBeenCalledWith({
        categoryId: 2,
        month: 11,
        year: 2026,
        limitAmount: 1200.5,
      });
    });

    it("starts with the given category chosen", () => {
      renderCreate({ initialCategoryId: 2 });

      expect((screen.getByLabelText(CATEGORY) as HTMLSelectElement).value).toBe(
        "2",
      );
    });

    it("sends the given category without choosing it again", async () => {
      const { onSubmit } = renderCreate({ initialCategoryId: 2 });

      fill(AMOUNT, "1200");
      await saveAndSettle("Zapisz limit");

      expect(onSubmit).toHaveBeenCalledWith({
        categoryId: 2,
        month: 11,
        year: 2026,
        limitAmount: 1200,
      });
    });

    it("asks for a category when the given one is not on the list", async () => {
      const { onSubmit } = renderCreate({ initialCategoryId: 9 });

      fill(AMOUNT, "1200");
      await saveAndSettle("Zapisz limit");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toBe("Wybierz kategorię.");
    });
  });

  describe("edit mode", () => {
    it("shows the category and the month as text and fills the amount", () => {
      renderEdit();

      const dialog = screen.getByRole("dialog", { name: "Edytuj limit" });
      expect(dialog.textContent).toContain("Artykuły spożywcze");
      expect(dialog.textContent).toContain("Listopad 2026");
      expect(screen.queryByRole("combobox")).toBeNull();
      expect(valueOf(AMOUNT)).toBe("1500,00");
    });

    it("sends the changed amount for the same category and month", async () => {
      const { onSubmit } = renderEdit();

      fill(AMOUNT, "1800");
      await saveAndSettle("Zapisz zmiany");

      expect(onSubmit).toHaveBeenCalledWith({
        categoryId: 1,
        month: 11,
        year: 2026,
        limitAmount: 1800,
      });
    });

    it("focuses the amount and sends nothing when it is invalid", async () => {
      const { onSubmit } = renderEdit();

      fill(AMOUNT, "abc");
      await saveAndSettle("Zapisz zmiany");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(screen.getByLabelText(AMOUNT));
      expect(screen.getByLabelText(AMOUNT).getAttribute("aria-invalid")).toBe(
        "true",
      );
    });
  });

  describe("failed requests", () => {
    it("shows 400 field errors at the field and keeps the dialog open", async () => {
      renderEdit({
        onSubmit: () =>
          Promise.reject(
            new ApiError(400, {
              status: 400,
              fieldErrors: [
                {
                  field: "limitAmount",
                  message: "Limit musi być większy od zera",
                },
              ],
            }),
          ),
      });

      fill(AMOUNT, "1800");
      await saveAndSettle("Zapisz zmiany");

      expect(screen.getByRole("alert").textContent).toBe(
        "Limit musi być większy od zera",
      );
      expect(screen.getByLabelText(AMOUNT).getAttribute("aria-invalid")).toBe(
        "true",
      );
      expect(valueOf(AMOUNT)).toBe("1800");
      expect(screen.getByRole("dialog", { name: "Edytuj limit" })).toBeTruthy();
    });

    it.each([404, 409])(
      "shows the detail of %i in the dialog and keeps the values",
      async (status) => {
        renderEdit({
          onSubmit: () =>
            Promise.reject(
              new ApiError(status, { status, detail: "Odśwież dane." }),
            ),
        });

        fill(AMOUNT, "1800");
        await saveAndSettle("Zapisz zmiany");

        expect(screen.getByRole("alert").textContent).toBe("Odśwież dane.");
        expect(valueOf(AMOUNT)).toBe("1800");
      },
    );

    it("shows a network failure in the dialog", async () => {
      renderEdit({ onSubmit: () => Promise.reject(new NetworkError()) });

      await saveAndSettle("Zapisz zmiany");

      expect(screen.getByRole("alert").textContent).toBe(NETWORK_ERROR_MESSAGE);
    });

    it("clears the failure message when a field is edited", async () => {
      renderEdit({
        onSubmit: () =>
          Promise.reject(
            new ApiError(409, { status: 409, detail: "Konflikt" }),
          ),
      });

      await saveAndSettle("Zapisz zmiany");
      fill(AMOUNT, "1900");

      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  it("blocks a second submit while the request is pending", async () => {
    let resolveSubmit: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const { onSubmit } = renderEdit({ onSubmit: () => pending });

    await saveAndSettle("Zapisz zmiany");
    const saving = screen.getByRole("button", {
      name: "Zapisywanie…",
    }) as HTMLButtonElement;
    expect(saving.disabled).toBe(true);
    fireEvent.submit(
      screen.getByRole("dialog").querySelector("form") as Element,
    );
    await act(async () => {
      resolveSubmit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Zapisz zmiany" })).toBeTruthy();
  });

  it("closes with Anuluj without sending anything", () => {
    const { onClose, onSubmit } = renderEdit();

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
