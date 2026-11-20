import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import {
  EXPENSE_EUR,
  EXPENSE_PLN,
  INCOME_PLN,
  TEST_TRANSACTIONS,
} from "@/test-utils/transactions";

function renderTable(transactions = TEST_TRANSACTIONS) {
  return render(<TransactionsTable transactions={transactions} />);
}

describe("TransactionsTable", () => {
  it("is a named table with the column headers in the mockup order", () => {
    renderTable();

    expect(
      screen.getByRole("table", {
        name: "Transakcje posortowane od najnowszej",
      }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Data", "Opis", "Kategoria", "Kwota", "Akcje"]);
  });

  it("renders one body row per transaction", () => {
    renderTable();

    expect(screen.getAllByRole("row")).toHaveLength(
      TEST_TRANSACTIONS.length + 1,
    );
  });

  it("shows date, description, category, amount and an empty actions cell", () => {
    renderTable([EXPENSE_PLN]);
    const row = screen.getByRole("row", { name: /Zakupy w Biedronce/ });

    expect(
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual([
      "17.11.2026",
      "Zakupy w Biedronce",
      "Artykuły spożywcze",
      "-184,50 zł",
      "",
    ]);
  });

  it("shows the PLN amount and the original foreign amount in the amount cell of the row", () => {
    renderTable([EXPENSE_EUR]);
    const row = screen.getByRole("row", { name: /Bilety lotnicze/ });

    const amount = within(row).getByText("-431,00 zł");
    const original = within(row).getByText("(100,00 EUR)");

    expect(amount.closest("td")).toBe(original.closest("td"));
    expect(amount.closest("td")).toBe(row.children[3]);
  });

  it("keeps the full description in the title attribute", () => {
    renderTable([EXPENSE_PLN]);

    expect(screen.getByText("Zakupy w Biedronce").getAttribute("title")).toBe(
      "Zakupy w Biedronce",
    );
  });

  it("shows a placeholder when the transaction has no description", () => {
    renderTable([{ ...EXPENSE_PLN, description: null }]);

    expect(screen.getByText("Bez opisu").getAttribute("title")).toBe(
      "Bez opisu",
    );
  });

  it("renders the category icon from the icon name", () => {
    const { container } = renderTable([EXPENSE_PLN]);

    expect(
      container.querySelector('svg[data-icon="shopping-cart"]'),
    ).not.toBeNull();
  });

  it("falls back to the ellipsis icon when the category has no icon", () => {
    const { container } = renderTable([{ ...EXPENSE_PLN, categoryIcon: null }]);

    expect(container.querySelector('svg[data-icon="ellipsis"]')).not.toBeNull();
  });

  it("wraps the table in a keyboard-focusable scroll region", () => {
    renderTable();

    expect(
      screen
        .getByRole("region", { name: "Lista transakcji" })
        .getAttribute("tabindex"),
    ).toBe("0");
  });

  it("puts an edit and a delete button in the actions cell of the row", () => {
    renderTable([EXPENSE_PLN]);
    const row = screen.getByRole("row", { name: /Zakupy w Biedronce/ });

    const buttons = within(row).getAllByRole("button");

    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Edytuj transakcję: Zakupy w Biedronce, 17.11.2026",
      "Usuń transakcję: Zakupy w Biedronce, 17.11.2026",
    ]);
    expect(
      buttons.every((button) => button.closest("td") === row.lastElementChild),
    ).toBe(true);
  });

  it("gives every row its own pair of buttons", () => {
    renderTable();

    expect(screen.getAllByRole("button")).toHaveLength(
      TEST_TRANSACTIONS.length * 2,
    );
  });

  it("passes the delete handler to the buttons of the clicked row", () => {
    const onDelete = vi.fn();
    render(
      <TransactionsTable
        transactions={TEST_TRANSACTIONS}
        onDelete={onDelete}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Usuń transakcję: Wynagrodzenie za listopad, 10.11.2026",
    });

    fireEvent.click(button);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(INCOME_PLN, button);
  });

  it("passes the edit handler to the buttons of the clicked row", () => {
    const onEdit = vi.fn();
    render(
      <TransactionsTable transactions={TEST_TRANSACTIONS} onEdit={onEdit} />,
    );
    const button = screen.getByRole("button", {
      name: "Edytuj transakcję: Wynagrodzenie za listopad, 10.11.2026",
    });

    fireEvent.click(button);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(INCOME_PLN, button);
  });
});
