import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecurringPaymentsPage, {
  metadata,
} from "@/app/(app)/recurring-payments/page";
import type { UseRecurringPaymentsResult } from "@/hooks/useRecurringPayments";

const useRecurringPaymentsMock = vi.hoisted(() =>
  vi.fn<() => UseRecurringPaymentsResult>(),
);

vi.mock("@/hooks/useRecurringPayments", () => ({
  useRecurringPayments: useRecurringPaymentsMock,
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe("RecurringPaymentsPage", () => {
  beforeEach(() => {
    useRecurringPaymentsMock.mockReset();
    useRecurringPaymentsMock.mockReturnValue({
      state: { status: "loading" },
      retry: vi.fn(),
    });
  });

  it("renders the page heading", () => {
    render(<RecurringPaymentsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Płatności cykliczne" }),
    ).toBeTruthy();
  });

  it("renders the subtitle", () => {
    render(<RecurringPaymentsPage />);

    expect(
      screen.getByText("Zarządzaj swoimi subskrypcjami i stałymi rachunkami"),
    ).toBeTruthy();
  });

  it("renders the recurring payments view", () => {
    render(<RecurringPaymentsPage />);

    expect(screen.getByRole("status").textContent).toBe(
      "Ładowanie płatności cyklicznych",
    );
  });

  it("sets the page title for the %s | Saldo template", () => {
    expect(metadata.title).toBe("Płatności cykliczne");
  });
});
