import { nanoid } from "nanoid";
import { router, protectedProcedure } from "../init";
import { redisPublisher } from "../../lib/redis";
import { SSE_TICKET_TTL_SEC } from "../../lib/constants";

export const sseRouter = router({
  createTicket: protectedProcedure.mutation(async ({ ctx }) => {
    const ticket = nanoid(32);
    const key = `sse:ticket:${ticket}`;
    await redisPublisher.set(key, String(ctx.userId), "EX", SSE_TICKET_TTL_SEC);
    return { ticket };
  }),
});
