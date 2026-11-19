import { createContext } from "react";

export type ToastContextValue = {
  // Shows one toast at a time: a new message replaces the current one.
  readonly showToast: (message: string) => void;
};

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined,
);
