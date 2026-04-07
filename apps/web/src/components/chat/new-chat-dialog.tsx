"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Field } from "@base-ui/react/field";
import { trpc } from "@/lib/trpc";
import { BaseDialog } from "@/components/ui/base-dialog";
import type { SearchUser } from "@/lib/trpc-types";
import { TextInput } from "@/components/ui/text-input";
import { UserSearchCombobox } from "./user-search-combobox";

export function NewChatDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<"dm" | "group">("dm");
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const createConversation = trpc.conversations.create.useMutation({
    onSuccess: async (data) => {
      await utils.conversations.list.invalidate();
      onClose();
      setSelectedUser(null);
      setSelectedUsers([]);
      setName("");
      router.replace(`/chat?conversationId=${data.conversation.id}`);
    },
    onError: (err) => {
      setError(err.message ?? "Unable to create conversation");
    },
  });

  // Check if a DM already exists with the selected user
  const existingDmId = useMemo(() => {
    if (type !== "dm" || !selectedUser) return null;
    const conversations =
      utils.conversations.list.getData()?.conversations ?? [];
    const existing = conversations.find(
      (c) =>
        c.type === "dm" && c.members.some((m) => m.id === selectedUser.id),
    );
    return existing?.id ?? null;
  }, [type, selectedUser, utils.conversations.list]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Navigate to existing DM instead of creating a duplicate
    if (existingDmId) {
      onClose();
      setSelectedUser(null);
      router.replace(`/chat?conversationId=${existingDmId}`);
      return;
    }

    const ids =
      type === "dm"
        ? selectedUser
          ? [selectedUser.id]
          : []
        : selectedUsers.map((u) => u.id);

    if (ids.length === 0) {
      setError(
        type === "dm" ? "Select a teammate" : "Select at least one teammate",
      );
      return;
    }
    if (type === "group" && !name.trim()) {
      setError("Group conversations require a name");
      return;
    }
    createConversation.mutate({
      type,
      memberUserIds: ids,
      name: type === "group" ? name.trim() : undefined,
    });
  };

  return (
    <BaseDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title="New conversation"
      subtitle="Start a chat"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="mt-4 space-y-4">
          <ToggleGroup
            value={[type]}
            onValueChange={(values) => {
              if (values.length > 0) {
                const newType = values[values.length - 1] as "dm" | "group";
                setType(newType);
                setSelectedUser(null);
                setSelectedUsers([]);
                setError(null);
              }
            }}
            className="flex gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            <Toggle
              value="dm"
              className="rounded-full px-3 py-1 bg-slate-100 data-pressed:bg-indigo-600 data-pressed:text-white dark:bg-slate-700 data-pressed:dark:bg-indigo-600"
            >
              Direct message
            </Toggle>
            <Toggle
              value="group"
              className="rounded-full px-3 py-1 bg-slate-100 data-pressed:bg-indigo-600 data-pressed:text-white dark:bg-slate-700 data-pressed:dark:bg-indigo-600"
            >
              Group
            </Toggle>
          </ToggleGroup>
          {type === "group" && (
            <Field.Root className="block text-sm">
              <Field.Label className="text-slate-600 dark:text-slate-400">
                Group name
              </Field.Label>
              <Field.Control
                render={
                  <TextInput
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1"
                  />
                }
              />
            </Field.Root>
          )}
          <Field.Root className="block text-sm">
            <Field.Label className="text-slate-600 dark:text-slate-400">
              {type === "dm" ? "Search teammate" : "Add members"}
            </Field.Label>
            <div className="mt-1">
              {type === "dm" ? (
                <UserSearchCombobox
                  value={selectedUser}
                  onValueChange={setSelectedUser}
                  placeholder="Search by name or username…"
                />
              ) : (
                <UserSearchCombobox
                  multiple
                  value={selectedUsers}
                  onValueChange={setSelectedUsers}
                  placeholder="Search teammates…"
                />
              )}
            </div>
          </Field.Root>
          {existingDmId && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You already have a conversation with this person.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={createConversation.isPending}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {createConversation.isPending
              ? "Creating…"
              : existingDmId
                ? "Go to conversation"
                : "Create"}
          </button>
        </div>
      </form>
    </BaseDialog>
  );
}
