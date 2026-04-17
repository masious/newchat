import type { Database } from "@newchat/db";
import { logger } from "../../lib/logger";
import { domainEvents } from "../emitter";
import { getConversationMemberUserIds } from "../../data/conversation-queries";
import { notifyUserOfMessage } from "../../services/notification-service";

export function registerNotificationHandlers(db: Database): void {
  domainEvents.on(
    "message.sent", data => {
      const { message, conversationId, senderId, conversationType, conversationName } = data;

      getConversationMemberUserIds(db, conversationId)
        .then((memberUserIds) => {
          const promises = memberUserIds
            .filter((id) => id !== senderId)
            .map((recipientUserId) =>
              notifyUserOfMessage(db, {
                recipientUserId,
                senderName: message.sender!.firstName,
                content: message.content || "[Attachment]",
                conversationId,
                conversationName:
                  conversationType === "group"
                    ? conversationName ?? undefined
                    : undefined,
              }),
            );

          return Promise.allSettled(promises);
        })
        .catch((error) => {
          logger.error({ error }, "Notification dispatch failed");
        });
    })
}
