"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import type { SearchUser, ProfileUser, PresenceSummary } from "@/lib/trpc-types";
import { BaseDialog } from "@/components/ui/base-dialog";
import { Avatar } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { formatPresence, userDisplayName } from "@/lib/formatting";
import { ErrorMessage } from "@/components/ui/error-message";
import { Button } from "@/components/ui/button";

type DisplayUser = (SearchUser | ProfileUser) & {
  presence?: PresenceSummary;
};

export function ProfileDialog({
  userId,
  initialUser,
  open,
  onClose,
}: {
  userId: number | null;
  initialUser?: SearchUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const profileQuery = trpc.users.profile.useQuery(
    { userId: userId ?? 0 },
    { enabled: Boolean(open && userId), staleTime: 0, retry: false },
  );
  const createConversation = trpc.conversations.create.useMutation({
    onSuccess: async (data) => {
      await utils.conversations.list.invalidate();
      onClose();
      router.replace(`/chat?conversationId=${data.conversation.id}`);
    },
  });

  const user: DisplayUser | null =
    profileQuery.data?.user ?? initialUser ?? null;

  const displayName = useMemo(() => userDisplayName(user), [user]);

  const presenceText = formatPresence(user?.presence);
  const errorMessage = profileQuery.error?.message;

  return (
    <BaseDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={displayName}
      subtitle={
        user?.username ? <>User Profile · @{user.username}</> : "User Profile"
      }
      size="lg"
      stacked
    >
      {!user && profileQuery.isLoading && (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Loading profile…
        </p>
      )}
      <ErrorMessage className="mt-6">{!user && errorMessage}</ErrorMessage>

      {user && (
        <div className="mt-6 flex gap-6">
          <Avatar avatarUrl={user.avatarUrl} name={user.firstName} size="xl" />
          <div className="flex-1 space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Presence
              </p>
              <p>{presenceText}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Dialog.Close render={<Button variant="secondary" />}>
          Cancel
        </Dialog.Close>
        <Button
          size="lg"
          onClick={() =>
            user &&
            createConversation.mutate({
              type: "dm",
              memberUserIds: [user.id],
            })
          }
          disabled={!user || createConversation.isPending}
        >
          {createConversation.isPending ? "Inviting…" : "Send message"}
        </Button>
      </div>
    </BaseDialog>
  );
}
