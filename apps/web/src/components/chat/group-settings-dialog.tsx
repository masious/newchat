"use client";

import { useState } from "react";
import { BaseDialog } from "@/components/ui/base-dialog";
import { X, Loader2, Plus } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { TextInput } from "@/components/ui/text-input";
import { FormField } from "@/components/ui/form-field";
import { Avatar } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { useDebouncedCallback } from "@/lib/hooks";
import { addToast } from "@/lib/providers/toast-context";
import { userDisplayName } from "@/lib/formatting";
import { UserSearchCombobox } from "./user-search-combobox";
import type { SearchUser } from "@/lib/trpc-types";
import { FeatureBoundary } from "@/components/ui/feature-boundary";

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
  const [showAddMember, setShowAddMember] = useState(false);

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

  const debouncedSaveName = useDebouncedCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty");
      return;
    }
    if (trimmed === conversationName) return;
    updateName.mutate({ conversationId, name: trimmed });
  }, 500);

  const handleNameChange = (value: string) => {
    setNameInput(value);
    setNameError(null);
    debouncedSaveName(value);
  };

  const handleAddMember = (user: SearchUser | null) => {
    if (!user) return;
    addMember.mutate({ conversationId, memberUserId: user.id });
    setShowAddMember(false);
  };

  const handleRemoveMember = (userId: number) => {
    removeMember.mutate({ conversationId, memberUserId: userId });
  };

  const presenceMap = new Map(
    presenceQuery.data?.entries?.map((e) => [e.userId, e.presence]) ?? [],
  );

  return (
    <FeatureBoundary name="GroupSettingsDialog" fallback="hidden">
      <BaseDialog
        open={open}
        onOpenChange={onOpenChange}
        title={conversationName}
        subtitle="Group settings"
        size="md"
      >
        <div className="mt-4 space-y-4">
                {isOwner && (
                  <FormField label="Group name" error={nameError}>
                    <div className="relative">
                      <TextInput
                        type="text"
                        value={nameInput}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="pr-8"
                      />
                      {updateName.isPending && (
                        <Loader2 className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                      )}
                    </div>
                  </FormField>
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
                    {isOwner && (
                      <IconButton
                        type="button"
                        onClick={() => setShowAddMember((v) => !v)}
                        size="sm"
                        title="Add member"
                      >
                        <Plus className="h-4 w-4" />
                      </IconButton>
                    )}
                  </div>

                  {membersQuery.isLoading ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading members…
                    </div>
                  ) : (
                    <>
                      {showAddMember && (
                        <div className="mt-2">
                          <UserSearchCombobox
                            value={null}
                            onValueChange={handleAddMember}
                            placeholder="Search for a user…"
                          />
                        </div>
                      )}

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
                              <Avatar
                                avatarUrl={member.avatarUrl}
                                name={member.firstName}
                                status={presence?.status === "online" ? "online" : "offline"}
                              />
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
                                <IconButton
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id)}
                                  disabled={removeMember.isPending}
                                  className="opacity-0 group-hover:opacity-100"
                                  title="Remove member"
                                >
                                  <X className="h-4 w-4" />
                                </IconButton>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              </div>
      </BaseDialog>
    </FeatureBoundary>
  );
}
