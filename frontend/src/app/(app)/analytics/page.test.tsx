import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnalyticsPage, { metadata } from "@/app/(app)/analytics/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

async function renderPage(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  render(await AnalyticsPage({ searchParams: Promise.resolve(searchParams) }));
}

function selectedPeriod(): string {
  return (screen.getByLabelText("Okres") as HTMLSelectElement).value;
}

describe("AnalyticsPage", () => {
  it("renders the page heading", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Analityka i Raporty" }),
    ).toBeTruthy();
  });

  it("sets the page title for the %s | Saldo template", () => {
    expect(metadata.title).toBe("Analityka i Raporty");
  });

  it("selects 6 months when the address has no period", async () => {
    await renderPage();

    expect(selectedPeriod()).toBe("6");
  });

  it("reads a valid period from the address", async () => {
    await renderPage({ months: "12" });

    expect(selectedPeriod()).toBe("12");
  });

  it.each(["9", "abc", ""])(
    "treats the invalid period '%s' like a missing one",
    async (months) => {
      await renderPage({ months });

      expect(selectedPeriod()).toBe("6");
    },
  );
});
