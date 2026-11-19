import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePopoverDisclosure } from "@/hooks/usePopoverDisclosure";

function Harness() {
  const { isOpen, toggle, containerRef, triggerRef } = usePopoverDisclosure();
  return (
    <div>
      <button type="button">Outside</button>
      <div ref={containerRef}>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={isOpen}
          onClick={toggle}
        >
          Trigger
        </button>
        <p hidden={!isOpen}>Panel</p>
      </div>
    </div>
  );
}

function getTrigger() {
  return screen.getByRole("button", { name: "Trigger" });
}

function openPanel() {
  render(<Harness />);
  fireEvent.click(getTrigger());
}

describe("usePopoverDisclosure", () => {
  it("toggles the panel with the trigger", () => {
    render(<Harness />);

    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(getTrigger());
    expect(getTrigger().getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(getTrigger());
    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    openPanel();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(getTrigger());
  });

  it("closes on a pointer press outside and returns focus to the trigger", () => {
    openPanel();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));

    expect(getTrigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(getTrigger());
  });

  it("stays open on a pointer press inside the panel", () => {
    openPanel();

    fireEvent.pointerDown(screen.getByText("Panel"));

    expect(getTrigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("does not touch focus on Escape while the panel is closed", () => {
    render(<Harness />);
    const outside = screen.getByRole("button", { name: "Outside" });
    outside.focus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.activeElement).toBe(outside);
  });
});
