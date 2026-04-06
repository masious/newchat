import type { PollStatus } from "../hooks/useAuthFlow";

const STATUS_TEXT: Record<PollStatus, string> = {
  idle: "Preparing login link...",
  pending: "Waiting for confirmation in Telegram...",
  confirmed: "Confirmed! Finalizing sign-in...",
  expired: "Link expired. Generate a new one below.",
};

interface StatusBannerProps {
  status: PollStatus;
}

export function StatusBanner({ status }: StatusBannerProps) {
  return (
    <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
      <p className="font-semibold">Status: {status}</p>
      <p className="text-indigo-700">{STATUS_TEXT[status]}</p>
    </div>
  );
}
