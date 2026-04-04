"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Field } from "@base-ui/react/field";
import { trpc } from "@/lib/trpc";

export function NewChatDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<"dm" | "group">("dm");
  const [memberIds, setMemberIds] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const createConversation = trpc.conversations.create.useMutation({
    onSuccess: async (data) => {
      await utils.conversations.list.invalidate();
      onClose();
      setMemberIds("");
      setName("");
      router.replace(`/chat?conversationId=${data.conversation.id}`);
    },
    onError: (err) => {
      setError(err.message ?? "Unable to create conversation");
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const ids = memberIds
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));
    if (ids.length === 0) {
      setError("Provide at least one teammate ID");
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
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Viewport className="fixed inset-0 z-60 flex items-center justify-center px-4">
          <Dialog.Popup
            render={<form onSubmit={handleSubmit} />}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Description className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Start a chat
                </Dialog.Description>
                <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  New conversation
                </Dialog.Title>
              </div>
              <Dialog.Close className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Close
              </Dialog.Close>
            </div>
            <div className="mt-4 space-y-4">
              <ToggleGroup
                value={[type]}
                onValueChange={(values) => {
                  if (values.length > 0) {
                    setType(values[values.length - 1] as "dm" | "group");
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
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                    }
                  />
                </Field.Root>
              )}
              <Field.Root className="block text-sm">
                <Field.Label className="text-slate-600 dark:text-slate-400">
                  Teammate IDs (comma separated)
                </Field.Label>
                <Field.Control
                  render={
                    <input
                      type="text"
                      value={memberIds}
                      onChange={(event) => setMemberIds(event.target.value)}
                      placeholder="2, 5, 9"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  }
                />
              </Field.Root>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={createConversation.isPending}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {createConversation.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
