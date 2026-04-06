"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-slate-700 dark:text-slate-400">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <button
        onClick={reset}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white"
      >
        Try again
      </button>
    </div>
  );
}
