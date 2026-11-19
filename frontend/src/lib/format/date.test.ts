import { describe, expect, it } from "vitest";
import { formatIsoDate } from "@/lib/format/date";

describe("formatIsoDate", () => {
  it("rearranges an ISO date into DD.MM.YYYY", () => {
    expect(formatIsoDate("2026-11-17")).toBe("17.11.2026");
  });

  it("keeps leading zeros", () => {
    expect(formatIsoDate("2026-01-05")).toBe("05.01.2026");
  });

  it("returns text that is not an ISO date unchanged", () => {
    expect(formatIsoDate("17.11.2026")).toBe("17.11.2026");
  });
});
