import { cn } from "@/lib/cn";
import { ContextMenu } from "@base-ui/react/context-menu";
import { VolumeX, Trash2 } from "lucide-react";
import type { ConversationSummary } from "@/lib/trpc-types";
import { ConversationAvatar } from "@/components/chat/conversation-avatar";

export function ConversationListItem({
  conversation,
  isSelected,
  name,
  lastMessagePreview,
  timestamp,
  onSelect,
  currentUserId,
  onMute,
  onDelete,
}: {
  conversation: ConversationSummary;
  isSelected: boolean;
  name: string;
  lastMessagePreview: string;
  timestamp: string;
  onSelect: (id: number) => void;
  currentUserId: number;
  onMute?: (id: number) => void;
  onDelete?: (id: number) => void;
}) {
  return (
    <li>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={
            <button
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                isSelected ? "bg-indigo-50 dark:bg-indigo-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-700",
              )}
            />
          }
        >
          <ConversationAvatar conversation={conversation} currentUserId={currentUserId} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {name}
              </span>
              <span className="ml-2 shrink-0 text-xs text-slate-400">{timestamp}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
                {lastMessagePreview}
              </p>
              {conversation.unreadCount > 0 && (
                <span className="ml-2 min-w-6 shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-center text-xs font-semibold text-white">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner>
            <ContextMenu.Popup className="min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {onMute && (
                <ContextMenu.Item
                  onClick={() => onMute(conversation.id)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <VolumeX className="h-4 w-4" />
                  Mute
                </ContextMenu.Item>
              )}
              {onDelete && (
                <ContextMenu.Item
                  onClick={() => onDelete(conversation.id)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </ContextMenu.Item>
              )}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </li>
  );
}
