import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExchangeErrorProps {
  isPending: boolean;
  onRetry: () => void;
}

export function ExchangeError({ isPending, onRetry }: ExchangeErrorProps) {
  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Sign-in failed
          </p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            Your identity was confirmed, but we couldn&apos;t complete sign-in.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Button variant="danger" onClick={onRetry} disabled={isPending}>
          {isPending ? "Retrying..." : "Retry sign-in"}
        </Button>
      </div>
    </div>
  );
}
