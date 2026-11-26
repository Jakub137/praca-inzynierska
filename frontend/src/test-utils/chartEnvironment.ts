import { vi } from "vitest";

// jsdom has no layout and no ResizeObserver: this stub reports one fixed size of the chart box.
class FixedSizeResizeObserver implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const entry = { target, contentRect: { width: 600, height: 288 } };
    this.callback([entry as unknown as ResizeObserverEntry], this);
  }

  unobserve(): void {}

  disconnect(): void {}
}

// "auto" animation in Recharts follows prefers-reduced-motion; reporting it turns the animation off, so the chart is drawn at once.
function reducedMotionQuery(query: string): MediaQueryList {
  return {
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
}

// Undo with vi.unstubAllGlobals().
export function stubChartEnvironment(): void {
  vi.stubGlobal("ResizeObserver", FixedSizeResizeObserver);
  vi.stubGlobal("matchMedia", reducedMotionQuery);
}
