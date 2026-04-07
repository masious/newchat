import { useState } from "react";
import { Plus, UserPen, Settings, LogOut } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { IconButton } from "@/components/ui/icon-button";
import { Avatar } from "@/components/ui/avatar";
import { userDisplayName } from "@/lib/formatting";

export function SidebarHeader({
  onOpenNewChat,
  currentUser,
  onEditProfile,
  onOpenSettings,
  onLogout,
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
  onOpenSettings?: () => void;
  onLogout?: () => void;
}) {
  const displayName = currentUser ? userDisplayName(currentUser) : null;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-1.5 justify-between px-4 py-4">
      {currentUser ? (
        <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Popover.Trigger className="flex flex-1 items-center gap-2.5 rounded-lg p-1 -m-1 transition hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
            <Avatar avatarUrl={currentUser.avatarUrl ?? null} name={currentUser.firstName} size="sm" />
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {displayName}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {currentUser.username
                  ? `@${currentUser.username}`
                  : "Set username"}
              </p>
            </div>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner side="bottom" align="start" sideOffset={8}>
              <Popover.Popup className="z-50 min-w-56 origin-top rounded-lg border border-slate-200 bg-white p-1 shadow-lg transition-[scale,opacity] duration-150 ease-out data-starting-style:scale-y-40 data-starting-style:opacity-40 data-ending-style:scale-y-40 data-ending-style:opacity-40 dark:border-slate-700 dark:bg-slate-800">
                <div className="transition-[opacity,translate] duration-150 delay-150 ease-out in-data-starting-style:opacity-0 in-data-starting-style:-translate-x-4 in-data-ending-style:opacity-0 in-data-ending-style:-translate-x-4 in-data-ending-style:delay-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditProfile?.();
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                      <UserPen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Edit Profile
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Photo, name, username
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings?.();
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Settings
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Theme, sounds, notifications
                      </p>
                    </div>
                  </button>
                  <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-red-600 dark:bg-slate-700 dark:text-red-400">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Log out
                    </p>
                  </button>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <div />
      )}
      <IconButton
        onClick={onOpenNewChat}
        variant="primary"
        size="lg"
        label="New chat"
      >
        <Plus className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
