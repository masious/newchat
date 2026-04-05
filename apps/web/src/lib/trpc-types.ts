import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@newchat/server/trpc";

type RouterOutputs = inferRouterOutputs<AppRouter>;

// Users
export type CurrentUser = RouterOutputs["users"]["me"]["user"];
export type SearchUser = RouterOutputs["users"]["search"]["users"][number];
export type ProfileUser = RouterOutputs["users"]["profile"]["user"];
export type PresenceSummary = SearchUser["presence"];

// Conversations
export type ConversationSummary =
  RouterOutputs["conversations"]["list"]["conversations"][number];
export type ConversationMember = ConversationSummary["members"][number];

// Messages
export type Message = RouterOutputs["messages"]["list"]["messages"][number];
export type Attachment = NonNullable<Message["attachments"]>[number];

// Optimistic messages (client-only, pending send confirmation)
export type OptimisticMessage = Message & {
  _optimisticId: string;
  _status: "pending" | "failed";
};

export function isOptimisticMessage(
  msg: Message,
): msg is OptimisticMessage {
  return "_optimisticId" in msg;
}
