import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

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
      <Button variant="secondary" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}
