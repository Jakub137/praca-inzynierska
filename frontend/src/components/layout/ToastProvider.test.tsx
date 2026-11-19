import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/layout/ToastProvider";
import { TOAST_DURATION_MS } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

function ShowButtons() {
  const { showToast } = useToast();
  return (
    <>
      <button type="button" onClick={() => showToast("Pierwszy")}>
        Pokaż pierwszy
      </button>
      <button type="button" onClick={() => showToast("Drugi")}>
        Pokaż drugi
      </button>
    </>
  );
}

function renderProvider() {
  render(
    <ToastProvider>
      <ShowButtons />
    </ToastProvider>,
  );
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("ToastProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders an empty status region before any toast", () => {
    renderProvider();

    expect(screen.getByRole("status").textContent).toBe("");
    expect(
      screen.queryByRole("button", { name: "Zamknij powiadomienie" }),
    ).toBeNull();
  });

  it("puts the message into the region that was already in the page", () => {
    renderProvider();
    const region = screen.getByRole("status");

    click("Pokaż pierwszy");

    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toBe("Pierwszy");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it("puts the same message again as a new node so that it is announced again", () => {
    renderProvider();
    click("Pokaż pierwszy");
    const first = screen.getByRole("status").firstElementChild;

    click("Pokaż pierwszy");

    expect(screen.getByRole("status").textContent).toBe("Pierwszy");
    expect(screen.getByRole("status").firstElementChild).not.toBe(first);
  });

  it("shows one toast at a time: a new one replaces the old one", () => {
    renderProvider();

    click("Pokaż pierwszy");
    click("Pokaż drugi");

    expect(screen.getByRole("status").textContent).toBe("Drugi");
    expect(
      screen.getAllByRole("button", { name: "Zamknij powiadomienie" }),
    ).toHaveLength(1);
  });

  it("clears the region and removes the card with the close button", () => {
    renderProvider();
    click("Pokaż pierwszy");

    click("Zamknij powiadomienie");

    expect(screen.getByRole("status").textContent).toBe("");
    expect(
      screen.queryByRole("button", { name: "Zamknij powiadomienie" }),
    ).toBeNull();
  });

  it("disappears after five seconds", () => {
    vi.useFakeTimers();
    renderProvider();
    click("Pokaż pierwszy");

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });

    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("restarts the timer when a new toast replaces the old one", () => {
    vi.useFakeTimers();
    renderProvider();
    click("Pokaż pierwszy");
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1000);
    });

    click("Pokaż drugi");
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    });

    expect(screen.getByRole("status").textContent).toBe("Drugi");
  });

  it("does not take the focus", () => {
    renderProvider();
    const opener = screen.getByRole("button", { name: "Pokaż pierwszy" });
    act(() => opener.focus());

    fireEvent.click(opener);

    expect(document.activeElement).toBe(opener);
  });

  it("throws when useToast is used outside the provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() => render(<ShowButtons />)).toThrow(
      "useToast must be used within ToastProvider",
    );

    consoleError.mockRestore();
  });
});
