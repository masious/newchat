"use client";

import { useMemo } from "react";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { formatRelativeTime, getConversationName } from "@/lib/formatting";
import { UserResultList } from "../user-result-list";
import { SidebarHeader } from "./components/SidebarHeader";
import { SearchInput } from "./components/SearchInput";
import { ConversationListItem } from "./components/ConversationListItem";
import { EmptyState } from "./components/EmptyState";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import type { ConversationSummary, SearchUser } from "@/lib/trpc-types";

export type { ConversationSummary, PresenceSummary } from "@/lib/trpc-types";

export function ConversationSidebar({
  conversations,
  selectedId,
  filter,
  onFilterChange,
  onSelect,
  onOpenNewChat,
  isLoading,
  userResults,
  showUserResults,
  isSearchingUsers,
  userSearchError,
  onViewProfile,
  currentUser,
  onEditProfile,
  onOpenSettings,
  onLogout,
}: {
  conversations: ConversationSummary[];
  selectedId: number | null;
  filter: string;
  onFilterChange: (value: string) => void;
  onSelect: (id: number) => void;
  onOpenNewChat: () => void;
  isLoading: boolean;
  userResults: SearchUser[];
  showUserResults: boolean;
  isSearchingUsers: boolean;
  userSearchError?: string | null;
  onViewProfile: (user: SearchUser) => void;
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
  const filtered = useMemo(() => {
    if (!filter) return conversations;
    const lower = filter.toLowerCase();
    return conversations.filter((conversation) => {
      const name = conversation.name ?? "Direct message";
      const snippet = conversation.lastMessage?.content ?? "";
      return (
        name.toLowerCase().includes(lower) ||
        snippet.toLowerCase().includes(lower)
      );
    });
  }, [conversations, filter]);

  return (
    <aside className="flex h-full w-80 max-w-full flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <SidebarHeader
        onOpenNewChat={onOpenNewChat}
        currentUser={currentUser}
        onEditProfile={onEditProfile}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
      />
      <SearchInput value={filter} onChange={onFilterChange} />
      {showUserResults && (
        <UserResultList
          results={userResults}
          isLoading={isSearchingUsers}
          error={userSearchError}
          filter={filter}
          onViewProfile={onViewProfile}
        />
      )}
      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full overscroll-contain">
          <ScrollArea.Content className="min-w-full!">
            {isLoading && <LoadingSkeleton />}
            {!isLoading && filtered.length === 0 && (
              <EmptyState onOpenNewChat={onOpenNewChat} />
            )}
            <ul>
              {filtered.map((conversation) => {
                const isSelected = conversation.id === selectedId;
                const name = getConversationName(conversation, currentUser?.id ?? 0);
                const lastMsg = conversation.lastMessage;
                let lastMessagePreview: string;
                if (conversation.isTyping) {
                  lastMessagePreview = "Typing...";
                } else if (!lastMsg) {
                  lastMessagePreview = "No messages yet";
                } else if (lastMsg.content) {
                  lastMessagePreview = lastMsg.content;
                } else if (lastMsg.attachments?.length) {
                  const count = lastMsg.attachments.length;
                  lastMessagePreview = count === 1
                    ? `Sent an attachment`
                    : `Sent ${count} attachments`;
                } else {
                  lastMessagePreview = "No messages yet";
                }
                const timestamp = formatRelativeTime(
                  conversation.lastMessage?.createdAt ?? conversation.createdAt,
                );

                return (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={isSelected}
                    name={name}
                    lastMessagePreview={lastMessagePreview}
                    timestamp={timestamp}
                    onSelect={onSelect}
                    currentUserId={currentUser?.id ?? 0}
                  />
                );
              })}
            </ul>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-1.5 touch-none select-none justify-center rounded-full bg-transparent transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">
          <ScrollArea.Thumb className="w-full rounded-full bg-slate-300 dark:bg-slate-600" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </aside>
  );
}
