import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toast, TOAST_DURATION_MS } from "@/components/ui/Toast";

function renderToast() {
  const onDismiss = vi.fn();
  render(<Toast message="Zapisano" onDismiss={onDismiss} />);
  return { onDismiss };
}

function advance(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

function closeButton() {
  return screen.getByRole("button", { name: "Zamknij powiadomienie" });
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dismisses itself after five seconds", () => {
    const { onDismiss } = renderToast();

    advance(TOAST_DURATION_MS - 1);
    expect(onDismiss).not.toHaveBeenCalled();

    advance(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses immediately with the close button", () => {
    const { onDismiss } = renderToast();

    fireEvent.click(closeButton());

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("gives the close button a target of at least 24 by 24 pixels", () => {
    renderToast();

    expect(closeButton().className).toContain("size-8");
  });

  it("stops the timer while the pointer is over the card and restarts it afterwards", () => {
    const { onDismiss } = renderToast();
    const card = closeButton().parentElement as HTMLElement;

    fireEvent.mouseEnter(card);
    advance(TOAST_DURATION_MS * 3);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(card);
    advance(TOAST_DURATION_MS - 1);
    expect(onDismiss).not.toHaveBeenCalled();

    advance(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("stops the timer while the keyboard focus is on the card", () => {
    const { onDismiss } = renderToast();

    act(() => closeButton().focus());
    advance(TOAST_DURATION_MS * 3);
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => closeButton().blur());
    advance(TOAST_DURATION_MS);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss after it was removed", () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <Toast message="Zapisano" onDismiss={onDismiss} />,
    );

    unmount();
    advance(TOAST_DURATION_MS * 2);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("keeps the message on the card readable for assistive technology", () => {
    renderToast();

    expect(screen.getByText("Zapisano").closest("[aria-hidden]")).toBeNull();
  });
});
