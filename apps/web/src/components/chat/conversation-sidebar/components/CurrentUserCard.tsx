import { userDisplayName } from "@/lib/formatting";
import { Avatar } from "@base-ui/react/avatar";

export function CurrentUserCard({
  currentUser,
  onEditProfile,
}: {
  currentUser: {
    id: number;
    firstName: string;
    lastName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  };
  onEditProfile: () => void;
}) {
  const currentUserName = userDisplayName(currentUser);

  return (
    <button
      onClick={onEditProfile}
      className="mb-3 flex items-center gap-3 border-y border-slate-200 px-3 py-2 text-left transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/30"
    >
      <Avatar.Root className="h-10 w-10 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <Avatar.Image
          src={currentUser.avatarUrl ?? undefined}
          alt={currentUserName}
          className="h-full w-full object-cover"
        />
        <Avatar.Fallback className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
          {currentUser.firstName.slice(0, 1)}
        </Avatar.Fallback>
      </Avatar.Root>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {currentUserName}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {currentUser.username ? `@${currentUser.username}` : "Set username"}
        </p>
      </div>
      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
        Edit
      </span>
    </button>
  );
}
