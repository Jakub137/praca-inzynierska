import { describe, expect, it } from "vitest";
import { pickFieldErrors } from "@/lib/forms/fieldErrors";

const FIELDS = ["name", "targetDate"] as const;

describe("pickFieldErrors", () => {
  it("keeps the messages of the listed fields only", () => {
    const result = pickFieldErrors(FIELDS, [
      { field: "targetDate", message: "Termin" },
      { field: "other", message: "Inne" },
    ]);

    expect(result).toEqual({ targetDate: "Termin" });
  });

  it("takes the first message of a field", () => {
    const result = pickFieldErrors(FIELDS, [
      { field: "name", message: "Pierwszy" },
      { field: "name", message: "Drugi" },
    ]);

    expect(result).toEqual({ name: "Pierwszy" });
  });

  it("returns an empty object without field errors", () => {
    expect(pickFieldErrors(FIELDS, undefined)).toEqual({});
    expect(pickFieldErrors(FIELDS, [])).toEqual({});
  });
});
