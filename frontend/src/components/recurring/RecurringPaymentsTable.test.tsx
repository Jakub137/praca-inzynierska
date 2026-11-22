import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecurringPaymentsTable } from "@/components/recurring/RecurringPaymentsTable";
import {
  GYM_PAYMENT,
  INSURANCE_PAYMENT,
  NETFLIX_PAYMENT,
  RECURRING_TEST_TODAY,
  RENT_PAYMENT,
  SPOTIFY_PAYMENT,
  TEST_PAYMENTS,
} from "@/test-utils/recurringPayments";

// formatPln groups thousands with a non-breaking space; an escape survives copying the plan.
const NBSP = "\u00a0";

function renderTable(payments = TEST_PAYMENTS) {
  return render(
    <RecurringPaymentsTable payments={payments} today={RECURRING_TEST_TODAY} />,
  );
}

function rowOf(name: string): HTMLElement {
  const row = screen
    .getAllByRole("row")
    .find((candidate) => within(candidate).queryByText(name) !== null);
  if (row === undefined) {
    throw new Error(`No row for ${name}`);
  }
  return row;
}

describe("RecurringPaymentsTable", () => {
  it("is a focusable, scrollable region with a name", () => {
    renderTable();

    const region = screen.getByRole("region", {
      name: "Lista płatności cyklicznych",
    });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.className).toContain("overflow-x-auto");
  });

  it("has a caption for screen readers", () => {
    renderTable();

    expect(
      screen.getByRole("table", {
        name: "Płatności cykliczne posortowane według terminu następnej płatności",
      }),
    ).toBeTruthy();
  });

  it("has the five column headers in the order of the mockup", () => {
    renderTable();

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Nazwa", "Kategoria", "Cykl", "Następna płatność", "Kwota"]);
  });

  it("renders one row per payment in the order of the API", () => {
    renderTable();

    const rows = screen.getAllByRole("row").slice(1);
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[0].textContent),
    ).toEqual([
      "Ubezpieczenie auta",
      "Karnet na siłownię",
      "Czynsz",
      "Spotify",
      "Netflix",
    ]);
  });

  it("shows the name truncated, with the full name in the title", () => {
    const longName = "a".repeat(100);
    renderTable([{ ...NETFLIX_PAYMENT, name: longName }]);

    const name = screen.getByText(longName);
    expect(name.getAttribute("title")).toBe(longName);
    expect(name.className).toContain("truncate");
  });

  it("shows the category as a pill", () => {
    renderTable();

    const pill = within(rowOf("Netflix")).getByText("Rozrywka");
    expect(pill.className).toContain("rounded-full");
    expect(pill.className).toContain("bg-slate-100");
  });

  it.each([
    [INSURANCE_PAYMENT, "Co rok"],
    [GYM_PAYMENT, "Co tydzień"],
    [NETFLIX_PAYMENT, "Co miesiąc"],
  ])("shows the frequency of %j as the badge %s", (payment, label) => {
    renderTable();

    const badge = within(rowOf(payment.name)).getByText(label);
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("bg-brand/10");
    expect(badge.className).toContain("text-ink");
    expect(badge.className).not.toMatch(/(^|\s)text-brand/);
  });

  it("shows the date as DD.MM.RRRR with the text of the days left", () => {
    renderTable();

    expect(within(rowOf("Netflix")).getByText("24.11.2026")).toBeTruthy();
    expect(within(rowOf("Netflix")).getByText("za 3 dni")).toBeTruthy();
    expect(within(rowOf("Spotify")).getByText("jutro")).toBeTruthy();
    expect(within(rowOf("Czynsz")).getByText("dziś")).toBeTruthy();
  });

  it("marks a payment past its date in text and in the danger color", () => {
    renderTable();

    const insurance = within(rowOf("Ubezpieczenie auta")).getByText(
      "po terminie (3 dni)",
    );
    expect(insurance.className).toContain("text-danger");
    const gym = within(rowOf("Karnet na siłownię")).getByText(
      "po terminie (1 dzień)",
    );
    expect(gym.className).toContain("text-danger");
  });

  it("does not use the danger color for a payment that is not overdue", () => {
    renderTable();

    for (const payment of [RENT_PAYMENT, SPOTIFY_PAYMENT, NETFLIX_PAYMENT]) {
      const text = within(rowOf(payment.name)).getByText(
        /^(dziś|jutro|za \d+ dni)$/,
      );
      expect(text.className).not.toContain("text-danger");
    }
  });

  it("shows the amount in its own currency and right-aligned", () => {
    renderTable();

    const amountOf = (name: string) =>
      within(rowOf(name)).getAllByRole("cell")[4];
    expect(amountOf("Netflix").textContent).toBe("43,00 zł");
    expect(amountOf("Spotify").textContent).toBe("9,99 EUR");
    expect(amountOf("Ubezpieczenie auta").textContent).toBe(
      `1${NBSP}250,50 zł`,
    );
    expect(amountOf("Netflix").className).toContain("text-right");
  });
});
