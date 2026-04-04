import { Plus, Pencil } from "lucide-react";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { userDisplayName } from "@/lib/formatting";

export function SidebarHeader({
  onOpenNewChat,
  currentUser,
  onEditProfile,
}: {
  onOpenNewChat: () => void;
  currentUser?: {
    id: number;
    firstName: string;
    lastName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  } | null;
  onEditProfile?: () => void;
}) {
  const displayName = currentUser ? userDisplayName(currentUser) : null;

  return (
    <div className="flex items-center gap-1.5 justify-between px-4 py-4">
      {currentUser ? (
        <div className="flex flex-1 items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            {currentUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatarUrl}
                alt={displayName!}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                {currentUser.firstName.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {displayName}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {currentUser.username
                ? `@${currentUser.username}`
                : "Set username"}
            </p>
          </div>
        </div>
      ) : (
        <div />
      )}
      {onEditProfile && (
        <IconTooltip label="Edit profile">
          <button
            onClick={onEditProfile}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </IconTooltip>
      )}
      <IconTooltip label="New chat">
        <button
          onClick={onOpenNewChat}
          className="rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
        </button>
      </IconTooltip>
    </div>
  );
}
