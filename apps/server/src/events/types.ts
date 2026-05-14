import type { fetchMessageWithSender } from "../data/message-queries";

export type EventMessage = NonNullable<Awaited<ReturnType<typeof fetchMessageWithSender>>>;

export type DomainEvents = {
  "message.sent": {
    message: EventMessage;
    conversationId: number;
    senderId: number;
    conversationType: "dm" | "group";
    conversationName: string | null;
  };
  "message.read": {
    conversationId: number;
    messageIds: number[];
    userId: number;
  };
  "message.typing": {
    conversationId: number;
    userId: number;
  };
  "conversation.created": {
    conversationId: number;
    memberIds: number[];
    creatorId: number;
  };
  "conversation.renamed": {
    conversationId: number;
    name: string;
  };
  "member.added": {
    conversationId: number;
    userId: number;
  };
  "member.removed": {
    conversationId: number;
    userId: number;
  };
  "user.online": {
    userId: number;
    lastSeen: string;
  };
  "user.offline": {
    userId: number;
    lastSeen: string;
  };
};
