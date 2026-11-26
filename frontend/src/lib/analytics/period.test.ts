import { describe, expect, it } from "vitest";
import {
  buildAnalyticsHref,
  parseAnalyticsMonths,
} from "@/lib/analytics/period";

describe("parseAnalyticsMonths", () => {
  it.each([3, 6, 12])("reads the period of %i months", (months) => {
    expect(parseAnalyticsMonths(String(months))).toBe(months);
  });

  it.each([undefined, "", "1", "9", "03", "abc"])(
    "falls back to 6 months for the value %s",
    (value) => {
      expect(parseAnalyticsMonths(value)).toBe(6);
    },
  );

  it("falls back to 6 months for a repeated parameter", () => {
    expect(parseAnalyticsMonths(["3", "12"])).toBe(6);
  });
});

describe("buildAnalyticsHref", () => {
  it("leaves the default period out of the address", () => {
    expect(buildAnalyticsHref(6)).toBe("/analytics");
  });

  it.each([3, 12] as const)("puts %i months into the address", (months) => {
    expect(buildAnalyticsHref(months)).toBe(`/analytics?months=${months}`);
  });
});
