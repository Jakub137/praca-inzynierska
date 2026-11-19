import { describe, expect, it } from "vitest";
import { getPageItems } from "@/lib/pagination";

describe("getPageItems", () => {
  it("shows a single page", () => {
    expect(getPageItems(1, 1)).toEqual([1]);
  });

  it("shows every page when there are three", () => {
    expect(getPageItems(1, 3)).toEqual([1, 2, 3]);
    expect(getPageItems(2, 3)).toEqual([1, 2, 3]);
    expect(getPageItems(3, 3)).toEqual([1, 2, 3]);
  });

  it("collapses the end of 12 pages on the first page", () => {
    expect(getPageItems(1, 12)).toEqual([1, 2, "ellipsis", 12]);
  });

  it("collapses both sides in the middle of 12 pages", () => {
    expect(getPageItems(6, 12)).toEqual([
      1,
      "ellipsis",
      5,
      6,
      7,
      "ellipsis",
      12,
    ]);
  });

  it("collapses the start of 12 pages on the last page", () => {
    expect(getPageItems(12, 12)).toEqual([1, "ellipsis", 11, 12]);
  });

  it("fills a gap of one page instead of showing an ellipsis", () => {
    expect(getPageItems(4, 12)).toEqual([1, 2, 3, 4, 5, "ellipsis", 12]);
  });

  it("returns nothing when there are no pages", () => {
    expect(getPageItems(1, 0)).toEqual([]);
  });
});
