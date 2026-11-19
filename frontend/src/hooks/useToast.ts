import { useContext } from "react";
import { ToastContext, type ToastContextValue } from "@/lib/toast/toastContext";

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
