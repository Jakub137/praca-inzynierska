import { Alert } from "@/components/ui/Alert";
import { FOCUS_RING } from "@/lib/focusRing";

type RetryErrorProps = {
  // Short sentence for the alert, e.g. "Nie udało się wczytać celów."
  message: string;
  onRetry: () => void;
};

// A list that failed to load: the message and a button that requests the list again.
export function RetryError({ message, onRetry }: RetryErrorProps) {
  return (
    <div className="flex max-w-md flex-col items-start gap-3">
      <Alert variant="error">{message}</Alert>
      <button
        type="button"
        onClick={onRetry}
        className={`min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`}
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
