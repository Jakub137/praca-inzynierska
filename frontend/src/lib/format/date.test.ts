import { describe, expect, it } from "vitest";
import { formatIsoDate, formatLongIsoDate } from "@/lib/format/date";

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

describe("formatLongIsoDate", () => {
  it("writes the month in words in the genitive", () => {
    expect(formatLongIsoDate("2027-07-15")).toBe("15 lipca 2027");
  });

  it("does not add a leading zero to the day", () => {
    expect(formatLongIsoDate("2026-10-01")).toBe("1 października 2026");
  });

  it("keeps the calendar day at the end of the year", () => {
    expect(formatLongIsoDate("2027-12-31")).toBe("31 grudnia 2027");
  });

  it("returns text that is not an ISO date unchanged", () => {
    expect(formatLongIsoDate("15.07.2027")).toBe("15.07.2027");
  });
});
