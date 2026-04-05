import Redis from "ioredis";
import { logger } from "./logger";

export const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export function createRedisSubscriber() {
  const sub = new Redis(redisUrl, { lazyConnect: true });
  sub.on("error", (err) => {
    logger.error({ err }, "Redis subscriber connection error");
  });
  return sub;
}

export const redisPublisher = new Redis(redisUrl);
redisPublisher.on("error", (err) => {
  logger.error({ err }, "Redis publisher connection error");
});
