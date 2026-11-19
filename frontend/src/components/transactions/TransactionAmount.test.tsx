import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionAmount } from "@/components/transactions/TransactionAmount";
import {
  EXPENSE_EUR,
  EXPENSE_PLN,
  INCOME_PLN,
} from "@/test-utils/transactions";

const NBSP = " ";

function getSpanWithText(text: string) {
  return screen.getByText(
    (_content, element) =>
      element?.tagName === "SPAN" && element.textContent === text,
  );
}

describe("TransactionAmount", () => {
  it("shows an expense in red with a minus sign", () => {
    render(<TransactionAmount transaction={EXPENSE_PLN} />);

    expect(getSpanWithText("-184,50 zł").className).toContain("text-danger");
  });

  it("shows an income in green with a plus sign", () => {
    render(<TransactionAmount transaction={INCOME_PLN} />);

    expect(getSpanWithText(`+7${NBSP}500,00 zł`).className).toContain(
      "text-success",
    );
  });

  it("shows no second line for a PLN transaction", () => {
    const { container } = render(
      <TransactionAmount transaction={EXPENSE_PLN} />,
    );

    expect(container.textContent).toBe("-184,50 zł");
  });

  it("shows the original amount in muted parentheses for a foreign currency", () => {
    render(<TransactionAmount transaction={EXPENSE_EUR} />);

    expect(getSpanWithText("-431,00 zł").className).toContain("text-danger");
    expect(getSpanWithText("(100,00 EUR)").className).toContain("text-muted");
  });

  it("takes the sign from the type, not from the number", () => {
    render(
      <TransactionAmount transaction={{ ...EXPENSE_PLN, amountPln: -184.5 }} />,
    );

    expect(getSpanWithText("-184,50 zł")).toBeTruthy();
  });
});
