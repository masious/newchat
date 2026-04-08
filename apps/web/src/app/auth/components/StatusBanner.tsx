import { Loader, Radio, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PollStatus } from "../hooks/useAuthFlow";

const STATUS_CONFIG: Record<
  PollStatus,
  { icon: React.ElementType; text: string; classes: string; pulse?: boolean }
> = {
  idle: {
    icon: Loader,
    text: "Preparing login link...",
    classes:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300",
  },
  pending: {
    icon: Radio,
    text: "Waiting for confirmation in Telegram...",
    classes:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    pulse: true,
  },
  confirmed: {
    icon: CheckCircle2,
    text: "Confirmed! Finalizing sign-in...",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  expired: {
    icon: AlertCircle,
    text: "Link expired. Generate a new one below.",
    classes:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
};

interface StatusBannerProps {
  status: PollStatus;
}

export function StatusBanner({ status }: StatusBannerProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-4 text-sm transition-colors",
        config.classes,
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", config.pulse && "animate-pulse")}
      />
      <p className="font-semibold">{config.text}</p>
    </div>
  );
}
