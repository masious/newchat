import Redis from "ioredis";

export const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export function createRedisSubscriber() {
  const sub = new Redis(redisUrl, { lazyConnect: true });
  sub.on("error", (err) => {
    console.error("[Redis subscriber] connection error:", err?.message ?? err);
  });
  return sub;
}

export const redisPublisher = new Redis(redisUrl);
redisPublisher.on("error", (err) => {
  console.error("[Redis publisher] connection error:", err?.message ?? err);
});
