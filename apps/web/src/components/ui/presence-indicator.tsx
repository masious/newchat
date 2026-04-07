import { cn } from "@/lib/cn";
import type { PresenceSummary } from "@/lib/trpc-types";

type PresenceIndicatorProps = {
  presence?: PresenceSummary;
};

export function PresenceIndicator({ presence }: PresenceIndicatorProps) {
  const isOnline = presence?.status === "online";
  const label = isOnline
    ? "Online"
    : presence?.lastSeen
      ? `Last seen ${new Date(presence.lastSeen).toLocaleString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "Offline";
  return (
    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
      <span
        className={cn("h-2 w-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-slate-400")}
      />
      <span>{label}</span>
    </div>
  );
}
