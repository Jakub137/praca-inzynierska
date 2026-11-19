import { describe, expect, it } from "vitest";
import {
  buildMonthOptions,
  MONTH_OPTIONS_COUNT,
  monthToDateRange,
} from "@/lib/transactions/months";

describe("buildMonthOptions", () => {
  it("lists the current month and the 11 before it, newest first", () => {
    const options = buildMonthOptions(new Date(2026, 10, 19));

    expect(options).toHaveLength(MONTH_OPTIONS_COUNT);
    expect(options[0]).toEqual({ value: "2026-11", label: "Listopad 2026" });
    expect(options[11]).toEqual({ value: "2025-12", label: "Grudzień 2025" });
  });

  it("rolls back into the previous year in January", () => {
    const options = buildMonthOptions(new Date(2026, 0, 31));

    expect(options.slice(0, 2)).toEqual([
      { value: "2026-01", label: "Styczeń 2026" },
      { value: "2025-12", label: "Grudzień 2025" },
    ]);
  });

  it("uses the nominative case and a capital letter for every month", () => {
    const labels = buildMonthOptions(new Date(2026, 11, 1)).map(
      (option) => option.label,
    );

    expect(labels).toEqual([
      "Grudzień 2026",
      "Listopad 2026",
      "Październik 2026",
      "Wrzesień 2026",
      "Sierpień 2026",
      "Lipiec 2026",
      "Czerwiec 2026",
      "Maj 2026",
      "Kwiecień 2026",
      "Marzec 2026",
      "Luty 2026",
      "Styczeń 2026",
    ]);
  });
});

describe("monthToDateRange", () => {
  it.each([
    ["2026-01", "2026-01-31"],
    ["2026-02", "2026-02-28"],
    ["2028-02", "2028-02-29"],
    ["2026-04", "2026-04-30"],
    ["2026-12", "2026-12-31"],
  ])("covers %s up to %s", (month, dateTo) => {
    expect(monthToDateRange(month)).toEqual({
      dateFrom: `${month}-01`,
      dateTo,
    });
  });
});
