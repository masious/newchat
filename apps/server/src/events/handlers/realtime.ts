import type { Database } from "@newchat/db";
import { domainEvents } from "../emitter";
import {
  publishConversationEvent,
  publishMembershipChange,
} from "../../services/realtime-events";
import { fetchConversationSummary } from "../../data/conversation-queries";
import { redisPublisher } from "../../lib/redis";
import { PRESENCE_CHANNEL } from "../../lib/presence";

// Handlers registered here publish domain events to Redis pub/sub
// so that SSE-connected clients receive real-time updates.
export function registerRealtimeHandlers(db: Database): void {
  domainEvents.on("message.sent", async ({ message, conversationId }) => {
    await publishConversationEvent(conversationId, {
      type: "new_message",
      conversationId,
      message,
    });
  });

  domainEvents.on(
    "message.read",
    async ({ conversationId, messageIds, userId }) => {
      await publishConversationEvent(conversationId, {
        type: "message_read",
        conversationId,
        messageIds,
        userId,
      });
    },
  );

  domainEvents.on("message.typing", async ({ conversationId, userId }) => {
    await publishConversationEvent(conversationId, {
      type: "typing",
      conversationId,
      userId,
    });
  });

  domainEvents.on(
    "conversation.created",
    async ({ conversationId, memberIds }) => {
      for (const memberId of memberIds) {
        const summary = await fetchConversationSummary(
          db,
          memberId,
          conversationId,
        );
        if (summary) {
          await publishMembershipChange(memberId, {
            type: "join",
            conversationId,
            conversation: summary,
          });
        }
      }
    },
  );

  domainEvents.on(
    "conversation.renamed",
    async ({ conversationId, name }) => {
      await publishConversationEvent(conversationId, {
        type: "conversation_updated",
        conversationId,
        name,
      });
    },
  );

  domainEvents.on(
    "member.added",
    async ({ conversationId, userId }) => {
      const summary = await fetchConversationSummary(
        db,
        userId,
        conversationId,
      );
      if (summary) {
        await publishMembershipChange(userId, {
          type: "join",
          conversationId,
          conversation: summary,
        });
      }
      await publishConversationEvent(conversationId, {
        type: "member_added",
        conversationId,
        userId,
      });
    },
  );

  domainEvents.on(
    "member.removed",
    async ({ conversationId, userId }) => {
      await publishConversationEvent(conversationId, {
        type: "member_removed",
        conversationId,
        userId,
      });
      await publishMembershipChange(userId, {
        type: "leave",
        conversationId,
      });
    },
  );

  domainEvents.on("user.online", async ({ userId, lastSeen }) => {
    await redisPublisher.publish(
      PRESENCE_CHANNEL,
      JSON.stringify({ userId, status: "online", lastSeen }),
    );
  });

  domainEvents.on("user.offline", async ({ userId, lastSeen }) => {
    await redisPublisher.publish(
      PRESENCE_CHANNEL,
      JSON.stringify({ userId, status: "offline", lastSeen }),
    );
  });
}
