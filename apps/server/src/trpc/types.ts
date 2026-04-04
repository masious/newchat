import { Attachment } from "@newchat/db";

export type MessageSender = {
  id: number;
  username: string | null;
  firstName: string;
  avatarUrl: string | null;
};

export type MessageWithSender = {
  id: number;
  conversationId: number;
  content: string;
  attachments: Attachment[] | null;
  createdAt: Date;
  senderId: number;
};

type Member = {
  id: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
}

export type ConversationSummary = {
  id: number;
  type: "dm" | "group";
  name: string | null;
  createdAt: Date;
  lastMessage: MessageWithSender | null;
  unreadCount: number;
  isTyping?: boolean;
  typingUserId?: number;
  members: Member[];
};
