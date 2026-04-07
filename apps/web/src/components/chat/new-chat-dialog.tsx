"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { trpc } from "@/lib/trpc";
import { BaseDialog } from "@/components/ui/base-dialog";
import type { SearchUser } from "@/lib/trpc-types";
import { TextInput } from "@/components/ui/text-input";
import { FormField } from "@/components/ui/form-field";
import { UserSearchCombobox } from "./user-search-combobox";
import { ErrorMessage } from "@/components/ui/error-message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function useTabTransition(selected: string) {
  const [displayed, setDisplayed] = useState(selected);
  const [phase, setPhase] = useState<"idle" | "exiting" | "entering">("idle");
  const [direction, setDirection] = useState<"left" | "right">("left");
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (selected === displayed) return;
    setDirection(selected === "group" ? "left" : "right");
    setPhase("exiting");
  }, [selected, displayed]);

  useEffect(() => {
    if (phase === "exiting") {
      const t = setTimeout(() => {
        setDisplayed(selectedRef.current);
        setPhase("entering");
      }, 150);
      return () => clearTimeout(t);
    }
    if (phase === "entering") {
      const t = setTimeout(() => setPhase("idle"), 150);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return { displayed, phase, direction };
}

export function NewChatDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<"dm" | "group">("dm");
  const { displayed: displayedType, phase, direction } = useTabTransition(type);
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
          <div
            className={cn(
              phase === "exiting" && direction === "left" && "animate-content-exit-left",
              phase === "exiting" && direction === "right" && "animate-content-exit-right",
              phase === "entering" && direction === "left" && "animate-content-enter-from-right",
              phase === "entering" && direction === "right" && "animate-content-enter-from-left",
            )}
          >
            <div className="space-y-4">
              {displayedType === "group" && (
                <FormField label="Group name">
                  <TextInput
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </FormField>
              )}
              <FormField label={displayedType === "dm" ? "Search teammate" : "Add members"}>
                {displayedType === "dm" ? (
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
              </FormField>
              {existingDmId && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You already have a conversation with this person.
                </p>
              )}
              <ErrorMessage>{error}</ErrorMessage>
              <Button type="submit" disabled={createConversation.isPending} className="w-full">
                {createConversation.isPending
                  ? "Creating…"
                  : existingDmId
                    ? "Go to conversation"
                    : "Create"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </BaseDialog>
  );
}
