import { nanoid } from "nanoid";
import { SSE_TICKET_TTL_SEC } from "../../lib/constants";
import { redisPublisher } from "../../lib/redis";
import { protectedProcedure, router } from "../init";

export const sseRouter = router({
  createTicket: protectedProcedure.mutation(async ({ ctx }) => {
    const ticket = nanoid(32);
    const key = `sse:ticket:${ticket}`;
    await redisPublisher.set(key, String(ctx.userId), "EX", SSE_TICKET_TTL_SEC);
    return { ticket };
  }),
});
