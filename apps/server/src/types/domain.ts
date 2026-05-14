import type { Attachment } from "@newchat/db";

export type LastMessage = {
  id: number;
  conversationId: number;
  content: string;
  attachments: Attachment[] | null;
  createdAt: Date;
  senderId: number | null;
};

export type Member = {
  id: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
};

export type ConversationSummary = {
  id: number;
  type: "dm" | "group";
  name: string | null;
  createdBy: number | null;
  createdAt: Date;
  lastMessage: LastMessage | null;
  unreadCount: number;
  isTyping?: boolean;
  typingUserId?: number;
  members: Member[];
};
