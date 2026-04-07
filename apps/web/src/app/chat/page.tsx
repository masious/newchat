"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SearchUser } from "@/lib/trpc-types";
import { Drawer } from "@base-ui/react/drawer";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { NewChatDialog } from "@/components/chat/new-chat-dialog";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ProfileDialog } from "@/components/users/profile-dialog";
import { EditProfileDialog } from "@/components/users/edit-profile-dialog";
import { SettingsDialog } from "@/components/users/settings-dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/providers/auth-context";
import { getConversationName } from "@/lib/formatting";
import { useNotificationSound } from "@/lib/hooks/use-notification-sound";
import { useDarkMode } from "@/lib/hooks/use-dark-mode";
import { MessagesSquare } from "lucide-react";
import { FeatureBoundary } from "@/components/ui/feature-boundary";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { cn } from "@/lib/cn";

const emptyArray: never[] = [];

function useConversationTransition(selectedId: number | null) {
  const [displayedId, setDisplayedId] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "exiting" | "entering">("idle");
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    if (selectedId === displayedId) return;
    if (displayedId != null && selectedId != null) {
      setPhase("exiting");
    } else {
      setDisplayedId(selectedId);
    }
  }, [selectedId, displayedId]);

  useEffect(() => {
    if (phase === "exiting") {
      const t = setTimeout(() => {
        setDisplayedId(selectedIdRef.current);
        setPhase("entering");
      }, 150);
      return () => clearTimeout(t);
    }
    if (phase === "entering") {
      const t = setTimeout(() => setPhase("idle"), 150);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return { displayedId, phase };
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<SearchUser | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { muted, toggleMute } = useNotificationSound();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const conversationsQuery = trpc.conversations.list.useQuery();
  const conversations = conversationsQuery.data?.conversations ?? emptyArray;
  const conversationIdParam = searchParams.get("conversationId");
  const selectedId = conversationIdParam ? Number(conversationIdParam) : null;
  const selectedConversation = useMemo(() => {
    if (selectedId) {
      return conversations.find(
        (conversation) => conversation.id === selectedId,
      );
    }
    return conversations[0];
  }, [conversations, selectedId]);

  const { displayedId, phase } = useConversationTransition(
    selectedConversation?.id ?? null,
  );

  const displayedConversation = useMemo(() => {
    if (!displayedId) return selectedConversation;
    return conversations.find((c) => c.id === displayedId) ?? selectedConversation;
  }, [conversations, displayedId, selectedConversation]);

  const isTyping = Boolean(displayedConversation?.isTyping);

  const typingUserId = displayedConversation?.typingUserId;

  const typingUserName = useMemo(() => {
    if (!displayedConversation || !typingUserId) return null;
    const member = displayedConversation.members.find(
      (m) => m.id === typingUserId,
    );
    return member ? member.firstName : null;
  }, [displayedConversation, typingUserId]);

  useEffect(() => {
    if (isTyping && typingUserName) {
      document.title = `${typingUserName} is typing...`;
    } else {
      document.title = "NewChat";
    }
  }, [isTyping, typingUserName]);

  const trimmedFilter = filter.trim();
  const shouldSearchUsers = trimmedFilter.length >= 2;
  const userSearchQuery = trpc.users.search.useQuery(
    { query: trimmedFilter },
    {
      enabled: shouldSearchUsers,
      staleTime: 60 * 1000,
    },
  );
  const userResults = shouldSearchUsers
    ? (userSearchQuery.data?.users ?? [])
    : [];
  const userSearchError = userSearchQuery.error?.message ?? null;
  const isSearchingUsers = userSearchQuery.isFetching && shouldSearchUsers;

  useEffect(() => {
    if (!conversationIdParam && selectedConversation) {
      router.replace(`/chat?conversationId=${selectedConversation.id}`);
    }
  }, [conversationIdParam, router, selectedConversation]);

  const handleSelect = (id: number) => {
    router.replace(`/chat?conversationId=${id}`);
    setSidebarOpen(false);
  };

  return (
    <main className="flex h-dvh flex-col bg-slate-50 dark:bg-slate-900">
      <OfflineBanner />
      <div className="flex min-h-0 flex-1">
      {/* Sidebar: static on md+, drawer on mobile */}
      <div className="hidden md:block">
        <FeatureBoundary name="ConversationSidebar">
          <ConversationSidebar
            conversations={conversations}
            selectedId={selectedConversation?.id ?? null}
            filter={filter}
            onFilterChange={setFilter}
            onSelect={handleSelect}
            onOpenNewChat={() => setDialogOpen(true)}
            isLoading={conversationsQuery.isLoading}
            userResults={userResults}
            showUserResults={shouldSearchUsers}
            isSearchingUsers={isSearchingUsers}
            userSearchError={userSearchError}
            onViewProfile={(result) => setProfileUser(result)}
            currentUser={user}
            onEditProfile={() => setEditProfileOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onLogout={logout}
          />
        </FeatureBoundary>
      </div>
      <Drawer.Root
        modal
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        swipeDirection="left"
      >
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 bg-black/40 md:hidden transition-opacity duration-450 data-starting-style:opacity-0 data-ending-style:opacity-0" />
          <Drawer.Viewport className="[--viewport-padding:0px] supports-[-webkit-touch-callout:none]:[--viewport-padding:0.625rem] fixed inset-0 flex items-stretch justify-start p-(--viewport-padding)">
            <Drawer.Popup
              className="fixed top-0 bottom-0 left-0 z-50 w-80 outline-none md:hidden touch-auto transform-[translateX(var(--drawer-swipe-movement-x))] transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-ending-style:transform-[translateX(calc(-100%-var(--viewport-padding)-2px))] data-starting-style:transform-[translateX(calc(-100%-var(--viewport-padding)-2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]"
              aria-describedby={undefined}
            >
              <Drawer.Title className="sr-only">Conversations</Drawer.Title>
              <FeatureBoundary name="ConversationSidebar">
                <ConversationSidebar
                  conversations={conversations}
                  selectedId={selectedConversation?.id ?? null}
                  filter={filter}
                  onFilterChange={setFilter}
                  onSelect={handleSelect}
                  onOpenNewChat={() => setDialogOpen(true)}
                  isLoading={conversationsQuery.isLoading}
                  userResults={userResults}
                  showUserResults={shouldSearchUsers}
                  isSearchingUsers={isSearchingUsers}
                  userSearchError={userSearchError}
                  onViewProfile={(result) => setProfileUser(result)}
                  currentUser={user}
                  onEditProfile={() => {
                    setSidebarOpen(false);
                    setTimeout(() => {
                      setEditProfileOpen(true);
                    }, 200);
                  }}
                  onOpenSettings={() => {
                    setSidebarOpen(false);
                    setTimeout(() => {
                      setSettingsOpen(true);
                    }, 200);
                  }}
                  onLogout={logout}
                />
              </FeatureBoundary>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
      <div className={cn(
        "flex min-w-0 flex-1 flex-col",
        phase === "exiting" && "animate-content-exit-right",
        phase === "entering" && "animate-content-enter-from-left",
      )}>
        {displayedConversation ? (
          <FeatureBoundary name="ChatPanel">
            <ChatPanel
              key={displayedConversation.id}
              conversationId={displayedConversation.id}
              conversation={displayedConversation}
              typingUserName={typingUserName}
              conversationName={getConversationName(
                displayedConversation,
                user?.id ?? 0,
              )}
              isTyping={isTyping}
              onOpenSidebar={() => setSidebarOpen(true)}
              otherMemberId={
                displayedConversation.type === "dm"
                  ? displayedConversation.members.find((m) => m.id !== user?.id)
                      ?.id
                  : undefined
              }
            />
          </FeatureBoundary>
        ) : (
          <section className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center text-center text-slate-500 dark:text-slate-400">
              <MessagesSquare
                className="h-16 w-16 text-slate-300 dark:text-slate-600"
                strokeWidth={1}
              />
              <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
                Welcome back, {user?.firstName}
              </p>
              <p className="mt-2 text-sm">
                Select a conversation from the sidebar to get started.
              </p>
              <button
                onClick={() => setSidebarOpen(true)}
                className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white md:hidden"
              >
                Open conversations
              </button>
            </div>
          </section>
        )}
      </div>
      <FeatureBoundary name="NewChatDialog" fallback="hidden">
        <NewChatDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </FeatureBoundary>
      <FeatureBoundary name="ProfileDialog" fallback="hidden">
        <ProfileDialog
          userId={profileUser?.id ?? null}
          initialUser={profileUser}
          open={Boolean(profileUser)}
          onClose={() => setProfileUser(null)}
        />
      </FeatureBoundary>
      <FeatureBoundary name="EditProfileDialog" fallback="hidden">
        <EditProfileDialog
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
        />
      </FeatureBoundary>
      <FeatureBoundary name="SettingsDialog" fallback="hidden">
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          isDark={isDark}
          onToggleDarkMode={toggleDarkMode}
          muted={muted}
          onToggleMute={toggleMute}
        />
      </FeatureBoundary>
      </div>
    </main>
  );
}
