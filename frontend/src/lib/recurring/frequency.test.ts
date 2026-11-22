import { describe, expect, it } from "vitest";
import {
  DEFAULT_FREQUENCY,
  FREQUENCY_OPTIONS,
  getFrequencyLabel,
  parseFrequency,
} from "@/lib/recurring/frequency";

describe("frequency", () => {
  it("defaults to monthly", () => {
    expect(DEFAULT_FREQUENCY).toBe("MONTHLY");
  });

  it("lists the options from the shortest period to the longest", () => {
    expect(FREQUENCY_OPTIONS).toEqual([
      { value: "WEEKLY", label: "Co tydzień" },
      { value: "MONTHLY", label: "Co miesiąc" },
      { value: "YEARLY", label: "Co rok" },
    ]);
  });

  it.each([
    ["WEEKLY", "Co tydzień"],
    ["MONTHLY", "Co miesiąc"],
    ["YEARLY", "Co rok"],
  ] as const)("labels %s as %s", (frequency, label) => {
    expect(getFrequencyLabel(frequency)).toBe(label);
  });

  it.each(["WEEKLY", "MONTHLY", "YEARLY"])("parses %s", (value) => {
    expect(parseFrequency(value)).toBe(value);
  });

  it.each(["", "DAILY", "monthly", " MONTHLY"])(
    "does not parse %j",
    (value) => {
      expect(parseFrequency(value)).toBeNull();
    },
  );
});
