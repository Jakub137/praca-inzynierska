import { describe, expect, it } from "vitest";
import { calculateProgressPercent } from "@/lib/goals/progress";

describe("calculateProgressPercent", () => {
  it.each([
    { current: 4500, target: 6000, expected: 75 },
    { current: 29, target: 100, expected: 29 },
    { current: 0.29, target: 1, expected: 29 },
    { current: 5999.99, target: 6000, expected: 99 },
    { current: 6000, target: 6000, expected: 100 },
    { current: 7500, target: 6000, expected: 125 },
    { current: 0, target: 6000, expected: 0 },
    { current: 100, target: 0, expected: 0 },
  ])(
    "gives $expected for $current of $target",
    ({ current, target, expected }) => {
      expect(calculateProgressPercent(current, target)).toBe(expected);
    },
  );
});
