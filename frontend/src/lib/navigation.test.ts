import { describe, expect, it } from "vitest";
import { isActivePath, NAV_ITEMS } from "@/lib/navigation";

describe("NAV_ITEMS", () => {
  it("lists the six sections in the order from the mockup", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "Strona Główna",
      "Transakcje",
      "Budżet i Limity",
      "Cele Oszczędnościowe",
      "Analityka i Raporty",
      "Płatności Cykliczne",
    ]);
  });

  it("points every item at the route from the frontend guidelines", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/dashboard",
      "/transactions",
      "/budgets",
      "/goals",
      "/analytics",
      "/recurring-payments",
    ]);
  });
});

describe("isActivePath", () => {
  it("matches the exact path", () => {
    expect(isActivePath("/transactions", "/transactions")).toBe(true);
  });

  it("matches nested routes", () => {
    expect(isActivePath("/transactions/new", "/transactions")).toBe(true);
  });

  it("does not match a different path with the same prefix", () => {
    expect(isActivePath("/transactions-old", "/transactions")).toBe(false);
  });

  it("does not match another section", () => {
    expect(isActivePath("/budgets", "/transactions")).toBe(false);
  });
});
