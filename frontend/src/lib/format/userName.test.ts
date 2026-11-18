import { describe, expect, it } from "vitest";
import { getFullName, getInitials } from "@/lib/format/userName";

describe("getInitials", () => {
  it("returns the uppercase first letters of the first and last name", () => {
    expect(getInitials("Jakub", "Janiec")).toBe("JJ");
    expect(getInitials("anna", "nowak")).toBe("AN");
  });

  it("uppercases Polish letters", () => {
    expect(getInitials("łukasz", "żak")).toBe("ŁŻ");
  });

  it("ignores surrounding whitespace", () => {
    expect(getInitials(" Jan ", " Kowalski ")).toBe("JK");
  });

  it("returns an empty string for empty names", () => {
    expect(getInitials("", "")).toBe("");
  });
});

describe("getFullName", () => {
  it("joins the first and last name", () => {
    expect(getFullName("Jakub", "Janiec")).toBe("Jakub Janiec");
  });

  it("trims the result when a part is empty", () => {
    expect(getFullName("Jan", "")).toBe("Jan");
  });
});
