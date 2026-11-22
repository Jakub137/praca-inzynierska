import { describe, expect, it } from "vitest";
import { buildProgressHint } from "@/lib/goals/hint";
import {
  ACTIVE_GOAL,
  COMPLETED_GOAL,
  DUE_SOON_GOAL,
  OVERDUE_GOAL,
} from "@/test-utils/goals";

// formatPln groups thousands with a non-breaking space; an escape survives copying the plan.
const NBSP = "\u00a0";

describe("buildProgressHint", () => {
  it("advises a monthly contribution while months remain", () => {
    expect(buildProgressHint(ACTIVE_GOAL, 75)).toBe(
      "75% celu osiągnięte (odkładaj 187,50 zł/mies.)",
    );
  });

  it("asks for the whole remaining amount when the deadline passed", () => {
    expect(buildProgressHint(OVERDUE_GOAL, 15)).toBe(
      `15% celu osiągnięte (odłóż 6${NBSP}800,00 zł, aby osiągnąć cel)`,
    );
  });

  it("asks for the whole remaining amount when the deadline is within a month", () => {
    expect(buildProgressHint(DUE_SOON_GOAL, 20)).toBe(
      "20% celu osiągnięte (odłóż 400,00 zł, aby osiągnąć cel)",
    );
  });

  it("gives no contribution advice for a completed goal", () => {
    expect(buildProgressHint(COMPLETED_GOAL, 108)).toBe("108% celu osiągnięte");
  });
});
