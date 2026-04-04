import Redis from "ioredis";

export const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export function createRedisSubscriber() {
  return new Redis(redisUrl, { lazyConnect: true });
}

export const redisPublisher = new Redis(redisUrl);
