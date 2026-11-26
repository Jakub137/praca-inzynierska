import { describe, expect, it } from "vitest";
import { distributionMark } from "@/components/analytics/distributionMarks";

function marks(count: number) {
  return Array.from({ length: count }, (_, index) => distributionMark(index));
}

describe("distributionMark", () => {
  it("gives 32 different pairs of colour and pattern", () => {
    const pairs = new Set(
      marks(32).map((mark) => `${mark.color} ${mark.pattern}`),
    );

    expect(pairs.size).toBe(32);
  });

  it("repeats the pairs from the 33rd category", () => {
    expect(distributionMark(32)).toEqual(distributionMark(0));
  });

  it("changes both the colour and the pattern between neighbours", () => {
    const firstRound = marks(8);

    firstRound.slice(1).forEach((mark, position) => {
      expect(mark.color).not.toBe(firstRound[position].color);
      expect(mark.pattern).not.toBe(firstRound[position].pattern);
    });
  });
});
