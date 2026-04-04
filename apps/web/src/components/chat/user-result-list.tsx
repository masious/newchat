import { userDisplayName } from "@/lib/formatting";
import { Avatar } from "@base-ui/react/avatar";
import { Collapsible } from "@base-ui/react/collapsible";
import { Search, ChevronDown } from "lucide-react";
import type { UserSearchResult, PresenceSummary } from "./conversation-sidebar";

export function UserResultList({
  results,
  isLoading,
  error,
  filter,
  onViewProfile,
}: {
  results: UserSearchResult[];
  isLoading: boolean;
  error?: string | null;
  filter: string;
  onViewProfile: (user: UserSearchResult) => void;
}) {
  return (
    <Collapsible.Root defaultOpen className="border-y border-slate-100 px-4 py-3 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <Collapsible.Trigger className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
          People
          <ChevronDown className="h-3 w-3 transition-transform in-data-panel-open:rotate-180" />
        </Collapsible.Trigger>
        {isLoading && <span className="text-xs text-slate-400">Searching…</span>}
      </div>
      <Collapsible.Panel>
        {isLoading ? (
          <p className="mt-2 text-sm text-slate-500">Searching directory…</p>
        ) : error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-slate-500">
              No people found for &ldquo;{filter}&rdquo;
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Try a different name or username.
            </p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {results.map((user) => (
              <li key={user.id}>
                <button
                  onClick={() => onViewProfile(user)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:bg-indigo-900/30"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {userDisplayName(user)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {user.username ? `@${user.username}` : "No username"}
                      </p>
                    </div>
                    <PresenceIndicator presence={user.presence} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

export function UserAvatar({ user }: { user: UserSearchResult }) {
  return (
    <Avatar.Root className="h-10 w-10 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <Avatar.Image
        src={user.avatarUrl ?? undefined}
        alt={userDisplayName(user)}
        className="h-full w-full object-cover"
      />
      <Avatar.Fallback className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        {user.firstName.slice(0, 1)}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}

export function PresenceIndicator({ presence }: { presence?: PresenceSummary }) {
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
        className={`h-2 w-2 rounded-full ${
          isOnline ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      <span>{label}</span>
    </div>
  );
}
