import { describe, expect, it } from "vitest";
import { buildDistributionRange } from "@/lib/analytics/distributionRange";

describe("buildDistributionRange", () => {
  it.each([
    ["2026-11-26", 3, "2026-09-01", "2026-11-30"],
    ["2026-11-26", 6, "2026-06-01", "2026-11-30"],
    ["2026-11-26", 12, "2025-12-01", "2026-11-30"],
    ["2026-02-15", 3, "2025-12-01", "2026-02-28"],
    ["2028-02-01", 3, "2027-12-01", "2028-02-29"],
    ["2026-12-31", 12, "2026-01-01", "2026-12-31"],
  ])(
    "for today %s and %s months covers %s to %s",
    (today, months, dateFrom, dateTo) => {
      expect(buildDistributionRange(today, months)).toEqual({
        dateFrom,
        dateTo,
      });
    },
  );
});
