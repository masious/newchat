import { redisPublisher } from "../lib/redis";

export const toConversationChannel = (conversationId: number) =>
  `conversation:${conversationId}`;

export const toMembershipChannel = (userId: number) =>
  `user:${userId}:membership`;

export async function publishConversationEvent(
  conversationId: number,
  payload: Record<string, unknown>,
) {
  await redisPublisher.publish(
    toConversationChannel(conversationId),
    JSON.stringify(payload),
  );
}

export async function publishMembershipChange(
  userId: number,
  payload: Record<string, unknown>,
) {
  await redisPublisher.publish(
    toMembershipChannel(userId),
    JSON.stringify(payload),
  );
}
