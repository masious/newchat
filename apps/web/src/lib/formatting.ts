import { ConversationSummary } from "@/components/chat/conversation-sidebar";

export function formatTimestamp(value: string | Date | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatPresence(
  presence?: { status: string; lastSeen: string },
): string {
  if (!presence) return "Offline";
  if (presence.status === "online") return "Online now";
  if (presence.lastSeen) {
    return `Last seen ${new Date(presence.lastSeen).toLocaleString()}`;
  }
  return "Offline";
}

export function userDisplayName(
  user: { firstName: string; lastName?: string | null } | null,
): string {
  if (!user) return "";
  return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "narrow" });

export function formatRelativeTime(value: string | Date | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (diffMs < 0 || diffMs < 60_000) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return rtf.format(-minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");

  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatAbsoluteTime(value: string | Date | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateSeparator(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) return "Today";
  if (messageDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  const dateA = a instanceof Date ? a : new Date(a);
  const dateB = b instanceof Date ? b : new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function getConversationName(conversation: ConversationSummary, userId: number) {
  if (conversation.type === "group") {
    if (conversation.name) return conversation.name;
    return conversation.members.map((m) => m.firstName).join(", ");
  } else {
    const otherMember = conversation.members.find((m) => m.id !== userId);
    return otherMember ? userDisplayName(otherMember) : "Direct message";
  }
}