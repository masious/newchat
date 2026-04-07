"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { trpc } from "@/lib/trpc";
import { Avatar } from "@/components/chat/conversation-avatar";
import { addToast } from "@/lib/providers/toast-context";
import { userDisplayName } from "@/lib/formatting";
import { UserSearchCombobox } from "./user-search-combobox";
import type { SearchUser, PresenceSummary } from "@/lib/trpc-types";
import { FeatureBoundary } from "@/components/ui/feature-boundary";

function MemberAvatar({
  user,
  presence,
}: {
  user: { firstName: string; avatarUrl: string | null };
  presence?: PresenceSummary;
}) {
  const isOnline = presence?.status === "online";
  return (
    <div className="relative shrink-0">
      <Avatar avatarUrl={user.avatarUrl} name={user.firstName} size="h-10 w-10" textSize="text-sm" />
      <span
        className={cn(
          "absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-800",
          isOnline ? "bg-emerald-500" : "bg-slate-400",
        )}
      />
    </div>
  );
}

export function GroupSettingsDialog({
  conversationId,
  createdBy,
  currentUserId,
  conversationName,
  open,
  onOpenChange,
}: {
  conversationId: number;
  createdBy: number | null;
  currentUserId: number;
  conversationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isOwner = createdBy === currentUserId || createdBy === null;

  const [nameInput, setNameInput] = useState(conversationName);
  const [nameError, setNameError] = useState<string | null>(null);

  const membersQuery = trpc.conversations.members.useQuery(
    { conversationId },
    { enabled: open },
  );
  const presenceQuery = trpc.users.presence.useQuery(
    {
      userIds: membersQuery.data?.members.map((m) => m.id) ?? [],
    },
    {
      enabled: open && (membersQuery.data?.members.length ?? 0) > 0,
      refetchInterval: 60_000,
    },
  );

  const utils = trpc.useUtils();

  const updateName = trpc.conversations.updateName.useMutation({
    onSuccess: () => {
      utils.conversations.list.invalidate();
      setNameError(null);
    },
    onError: (err) => {
      setNameError(err.message);
    },
  });

  const addMember = trpc.conversations.addMember.useMutation({
    onSuccess: () => {
      utils.conversations.members.invalidate({ conversationId });
      utils.conversations.list.invalidate();
    },
    onError: (err) => {
      addToast(err.message ?? "Failed to add member");
    },
  });

  const removeMember = trpc.conversations.removeMember.useMutation({
    onSuccess: () => {
      utils.conversations.members.invalidate({ conversationId });
      utils.conversations.list.invalidate();
    },
    onError: (err) => {
      addToast(err.message ?? "Failed to remove member");
    },
  });

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty");
      return;
    }
    if (trimmed === conversationName) return;
    updateName.mutate({ conversationId, name: trimmed });
  };

  const handleAddMember = (user: SearchUser | null) => {
    if (!user) return;
    addMember.mutate({ conversationId, memberUserId: user.id });
  };

  const handleRemoveMember = (userId: number) => {
    removeMember.mutate({ conversationId, memberUserId: userId });
  };

  const presenceMap = new Map(
    presenceQuery.data?.entries?.map((e) => [e.userId, e.presence]) ?? [],
  );

  return (
    <FeatureBoundary name="GroupSettingsDialog" fallback="hidden">
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Viewport className="fixed inset-0 z-60 flex items-center justify-center px-4">
            <Dialog.Popup className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="overflow-hidden">
                  <Dialog.Description className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Group settings
                  </Dialog.Description>
                  <Dialog.Title className="truncate text-xl font-bold text-slate-900 dark:text-slate-100">
                    {conversationName}
                  </Dialog.Title>
                </div>
                <Dialog.Close className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  Close
                </Dialog.Close>
              </div>

              <div className="mt-4 space-y-4">
                {isOwner && (
                  <Field.Root className="block text-sm">
                    <Field.Label className="text-slate-600 dark:text-slate-400">
                      Group name
                    </Field.Label>
                    <div className="mt-1 flex gap-2">
                      <Field.Control
                        render={
                          <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                        }
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        disabled={
                          updateName.isPending ||
                          nameInput.trim() === conversationName
                        }
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {updateName.isPending ? "Saving…" : "Save"}
                      </button>
                    </div>
                    {nameError && (
                      <p className="mt-1 text-xs text-red-600">{nameError}</p>
                    )}
                  </Field.Root>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      Members
                      {membersQuery.data && (
                        <span className="ml-1">
                          ({membersQuery.data.members.length})
                        </span>
                      )}
                    </h3>
                  </div>

                  {isOwner && (
                    <div className="mt-2">
                      <UserSearchCombobox
                        value={null}
                        onValueChange={handleAddMember}
                        placeholder="Add a member…"
                      />
                    </div>
                  )}

                  {membersQuery.isLoading ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading members…
                    </div>
                  ) : (
                    <ul className="mt-2 max-h-64 flex flex-col gap-1 overflow-y-auto">
                      {membersQuery.data?.members.map((member) => {
                        const presence = presenceMap.get(member.id);
                        const isSelf = member.id === currentUserId;
                        const isCreator = member.id === createdBy;
                        return (
                          <li
                            key={member.id}
                            className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <MemberAvatar user={member} presence={presence} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {userDisplayName(member)}
                                {isSelf && (
                                  <span className="ml-1 text-xs font-normal text-slate-400">
                                    (you)
                                  </span>
                                )}
                                {isCreator && (
                                  <span className="ml-1 text-xs font-normal text-indigo-500">
                                    Owner
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {member.username
                                  ? `@${member.username}`
                                  : "No username"}
                              </p>
                            </div>
                            {isOwner && !isSelf && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={removeMember.isPending}
                                className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 group-hover:opacity-100 dark:hover:bg-red-900/30"
                                title="Remove member"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </FeatureBoundary>
  );
}
