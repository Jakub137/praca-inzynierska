// jsdom has no HTMLDialogElement.showModal() and close(). This stub only toggles the "open"
// attribute and fires "close". It does not reproduce Esc, the focus trap or the inert page:
// those are checked in a real browser.
export function installDialogStub(): void {
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) {
      return;
    }
    this.removeAttribute("open");
    // Browsers fire "close" in a later task, not synchronously.
    queueMicrotask(() => this.dispatchEvent(new Event("close")));
  };
}
