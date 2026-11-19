import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, useRef, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";
import { installDialogStub } from "@/test-utils/dialog";

type HarnessProps = {
  onClose: () => void;
};

function Harness({ onClose }: HarnessProps) {
  const openerRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
    onClose();
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          openerRef.current = event.currentTarget;
          setOpen(true);
        }}
      >
        Otwórz
      </button>
      <Modal
        open={open}
        onClose={close}
        title="Tytuł okna"
        description="Opis okna"
        initialFocusRef={inputRef}
        returnFocusRef={openerRef}
        footer={
          <button type="button" onClick={close}>
            Stopka
          </button>
        }
      >
        <input aria-label="Pole" ref={inputRef} />
      </Modal>
    </>
  );
}

function getDialog(): HTMLDialogElement {
  return screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
}

function renderOpened() {
  const onClose = vi.fn();
  render(<Harness onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: "Otwórz" }));
  return onClose;
}

describe("Modal", () => {
  beforeAll(installDialogStub);

  it("stays closed until it is opened", () => {
    render(<Harness onClose={vi.fn()} />);

    expect(getDialog().open).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Otwórz" }));

    expect(getDialog().open).toBe(true);
  });

  it("is named by its title and described by its subtitle", () => {
    renderOpened();

    const dialog = screen.getByRole("dialog", { name: "Tytuł okna" });
    const descriptionId = dialog.getAttribute("aria-describedby") ?? "";

    expect(document.getElementById(descriptionId)?.textContent).toBe(
      "Opis okna",
    );
  });

  it("focuses the requested field after opening", () => {
    renderOpened();

    expect(document.activeElement).toBe(screen.getByLabelText("Pole"));
  });

  it("closes through the close icon", async () => {
    const onClose = renderOpened();

    fireEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    await act(async () => {});

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getDialog().open).toBe(false);
  });

  it("closes through a button in the footer", async () => {
    const onClose = renderOpened();

    fireEvent.click(screen.getByRole("button", { name: "Stopka" }));
    await act(async () => {});

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getDialog().open).toBe(false);
  });

  it("asks the parent to close on the cancel event (Esc) and keeps the dialog open itself", () => {
    const onClose = renderOpened();
    const cancel = new Event("cancel", { cancelable: true });

    fireEvent(getDialog(), cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reports a close that the browser did on its own", async () => {
    const onClose = renderOpened();

    await act(async () => {
      getDialog().close();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("gives the focus back to the element that opened it", () => {
    renderOpened();

    fireEvent.click(screen.getByRole("button", { name: "Stopka" }));

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Otwórz" }),
    );
  });

  it("stays open under React Strict Mode", async () => {
    const onClose = vi.fn();

    render(
      <StrictMode>
        <Modal
          open
          onClose={onClose}
          title="Tytuł okna"
          description="Opis okna"
          footer={null}
        >
          <p>Treść</p>
        </Modal>
      </StrictMode>,
    );
    await act(async () => {});

    expect(getDialog().open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});
