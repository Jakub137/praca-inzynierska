import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionRowActions } from "@/components/transactions/TransactionRowActions";
import { EXPENSE_PLN } from "@/test-utils/transactions";

const EDIT_NAME = "Edytuj transakcję: Zakupy w Biedronce, 17.11.2026";
const DELETE_NAME = "Usuń transakcję: Zakupy w Biedronce, 17.11.2026";

describe("TransactionRowActions", () => {
  it("names both buttons with the description and the date", () => {
    render(<TransactionRowActions transaction={EXPENSE_PLN} />);

    expect(screen.getByRole("button", { name: EDIT_NAME })).toBeTruthy();
    expect(screen.getByRole("button", { name: DELETE_NAME })).toBeTruthy();
  });

  it("uses the placeholder in the names when there is no description", () => {
    render(
      <TransactionRowActions
        transaction={{ ...EXPENSE_PLN, description: null }}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Edytuj transakcję: Bez opisu, 17.11.2026",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Usuń transakcję: Bez opisu, 17.11.2026",
      }),
    ).toBeTruthy();
  });

  it("shows the short tooltip text in the title attribute", () => {
    render(<TransactionRowActions transaction={EXPENSE_PLN} />);

    expect(
      screen.getByRole("button", { name: EDIT_NAME }).getAttribute("title"),
    ).toBe("Edytuj transakcję");
    expect(
      screen.getByRole("button", { name: DELETE_NAME }).getAttribute("title"),
    ).toBe("Usuń transakcję");
  });

  it("calls onEdit with the transaction and the clicked button, and not onDelete", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TransactionRowActions
        transaction={EXPENSE_PLN}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    const editButton = screen.getByRole("button", { name: EDIT_NAME });

    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(EXPENSE_PLN, editButton);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("marks only the edit button with the id of its transaction", () => {
    render(<TransactionRowActions transaction={EXPENSE_PLN} />);

    expect(
      screen
        .getByRole("button", { name: EDIT_NAME })
        .getAttribute("data-edit-for"),
    ).toBe(EXPENSE_PLN.id);
    expect(
      screen
        .getByRole("button", { name: DELETE_NAME })
        .hasAttribute("data-edit-for"),
    ).toBe(false);
  });

  it("calls onDelete with the transaction and the clicked button, and not onEdit", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TransactionRowActions
        transaction={EXPENSE_PLN}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    const deleteButton = screen.getByRole("button", { name: DELETE_NAME });

    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(EXPENSE_PLN, deleteButton);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("does nothing and does not throw when no callbacks are given", () => {
    render(<TransactionRowActions transaction={EXPENSE_PLN} />);

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: EDIT_NAME }));
      fireEvent.click(screen.getByRole("button", { name: DELETE_NAME }));
    }).not.toThrow();
  });

  it("keeps both buttons reachable with the Tab key", () => {
    render(<TransactionRowActions transaction={EXPENSE_PLN} />);

    const buttons = screen.getAllByRole("button");

    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.getAttribute("type")).toBe("button");
      expect(button.hasAttribute("disabled")).toBe(false);
      expect(button.hasAttribute("tabindex")).toBe(false);
    }
  });

  it("hides the icons from assistive technology and adds no extra name", () => {
    const { container } = render(
      <TransactionRowActions transaction={EXPENSE_PLN} />,
    );

    const icons = container.querySelectorAll("svg");

    expect(icons).toHaveLength(2);
    for (const icon of icons) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
    expect(container.querySelector("svg title")).toBeNull();
  });
});
