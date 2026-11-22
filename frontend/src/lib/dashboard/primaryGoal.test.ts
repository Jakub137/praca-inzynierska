import { describe, expect, it } from "vitest";
import { selectPrimaryGoal } from "@/lib/dashboard/primaryGoal";
import {
  ACTIVE_GOAL,
  COMPLETED_GOAL,
  DUE_SOON_GOAL,
  OVERDUE_GOAL,
  TEST_GOALS,
} from "@/test-utils/goals";

describe("selectPrimaryGoal", () => {
  it("picks the first active goal in the order of the API", () => {
    expect(selectPrimaryGoal(TEST_GOALS)).toBe(ACTIVE_GOAL);
  });

  it("skips a completed goal that comes first", () => {
    expect(selectPrimaryGoal([COMPLETED_GOAL, DUE_SOON_GOAL])).toBe(
      DUE_SOON_GOAL,
    );
  });

  it("picks the first goal when every goal is completed", () => {
    const secondCompleted = { ...COMPLETED_GOAL, id: 5 };

    expect(selectPrimaryGoal([COMPLETED_GOAL, secondCompleted])).toBe(
      COMPLETED_GOAL,
    );
  });

  it("keeps an active goal with a passed deadline when it comes first", () => {
    expect(selectPrimaryGoal([OVERDUE_GOAL, ACTIVE_GOAL])).toBe(OVERDUE_GOAL);
  });

  it("returns undefined when there are no goals", () => {
    expect(selectPrimaryGoal([])).toBeUndefined();
  });
});
