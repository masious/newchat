interface ExchangeErrorProps {
  isPending: boolean;
  onRetry: () => void;
}

export function ExchangeError({ isPending, onRetry }: ExchangeErrorProps) {
  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-800">Sign-in failed</p>
      <p className="mt-1 text-sm text-red-600">
        Your identity was confirmed, but we couldn&apos;t complete sign-in.
      </p>
      <button
        onClick={onRetry}
        disabled={isPending}
        className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Retrying..." : "Retry sign-in"}
      </button>
    </div>
  );
}
