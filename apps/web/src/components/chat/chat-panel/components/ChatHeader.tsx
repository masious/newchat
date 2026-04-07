import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatRelativeTime } from "@/lib/formatting";
import { Menu, Users } from "lucide-react";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import type { ConversationSummary } from "@/lib/trpc-types";
import { ConversationAvatar } from "@/components/chat/conversation-avatar";
import { GroupSettingsDialog } from "@/components/chat/group-settings-dialog";

function formatPresenceSubtitle(presence: { status: string; lastSeen: string }): string | null {
  if (presence.status === "online") return "online";
  const ts = new Date(presence.lastSeen).getTime();
  // Epoch fallback means the user has never connected
  if (ts <= 0) return null;
  return `last seen ${formatRelativeTime(presence.lastSeen)}`;
}

export function ChatHeader({
  conversation,
  currentUserId,
  conversationName,
  isTyping,
  typingUserName,
  onOpenSidebar,
  otherMemberId,
}: {
  conversation: ConversationSummary;
  currentUserId: number;
  conversationName: string;
  isTyping?: boolean;
  typingUserName: string | null;
  onOpenSidebar?: () => void;
  otherMemberId?: number;
}) {
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);

  const presenceQuery = trpc.users.presence.useQuery(
    { userIds: [otherMemberId!] },
    { enabled: Boolean(otherMemberId), refetchInterval: 60_000 },
  );

  const presenceEntry = presenceQuery.data?.entries?.find(
    (e) => e.userId === otherMemberId,
  );

  const subtitle = isTyping
    ? `${typingUserName || "Someone"} is typing...`
    : presenceEntry
      ? formatPresenceSubtitle(presenceEntry.presence)
      : null;

  return (
    <header className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <IconTooltip label="Open sidebar">
          <button
            onClick={onOpenSidebar}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <Menu className="h-6 w-6" />
          </button>
        </IconTooltip>
        <ConversationAvatar
          conversation={conversation}
          currentUserId={currentUserId}
          dmAvatarSize="h-11 w-11"
          dmTextSize="text-base"
          containerSize="h-11 w-11"
          avatarSize="h-8 w-8"
          avatarTextSize="text-xs"
        />
        <div className="flex-1 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
            {conversationName}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {conversation.type === "group" && (
          <>
            <IconTooltip label="Group info">
              <button
                onClick={() => setGroupSettingsOpen(true)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <Users className="h-5 w-5" />
              </button>
            </IconTooltip>
            <GroupSettingsDialog
              conversationId={conversation.id}
              createdBy={conversation.createdBy}
              currentUserId={currentUserId}
              conversationName={conversationName}
              open={groupSettingsOpen}
              onOpenChange={setGroupSettingsOpen}
            />
          </>
        )}
      </div>
    </header>
  );
}
