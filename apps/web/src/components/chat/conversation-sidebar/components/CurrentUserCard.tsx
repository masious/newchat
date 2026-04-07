import { userDisplayName } from "@/lib/formatting";
import { Avatar } from "@/components/ui/avatar";

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
      <Avatar avatarUrl={currentUser.avatarUrl ?? null} name={currentUser.firstName} />
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
