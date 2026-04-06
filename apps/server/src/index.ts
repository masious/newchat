import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import { createTRPCContext } from "./trpc/init";
import { createDb, authTokens, and, eq, lt } from "@newchat/db";

import { createRateLimitMiddleware } from "./middleware/rate-limit";
import { createSSEHandler } from "./services/sse-handler";
import { logger } from "./lib/logger";
import { TOKEN_TTL_MS } from "./lib/constants";

const app = new Hono();
const db = createDb();

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
});

// Token expiration background job
async function expirePendingTokens() {
  const cutoff = new Date(Date.now() - TOKEN_TTL_MS);
  try {
    await db
      .update(authTokens)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(eq(authTokens.status, "pending"), lt(authTokens.createdAt, cutoff)),
      );
  } catch (error) {
    logger.error({ error }, "Failed to expire tokens");
  }
}
expirePendingTokens();
setInterval(expirePendingTokens, 60_000);

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:3001", "http://192.168.0.113:3001",
    "https://localhost:3000", "https://localhost:3001", "https://192.168.0.113:3001"
  ];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (allowedOrigins.includes(origin)) return origin;
      return null;
    },
    credentials: true,
    exposeHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
    ],
  }),
);

// Request logging
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(
    { method: c.req.method, path: new URL(c.req.url).pathname, status: c.res.status, ms },
    "request",
  );
});

// Health check
app.get(
  "/health",
  createRateLimitMiddleware({ limit: 60, windowSec: 60, prefix: "rl:health" }),
  (c) => c.json({ status: "ok" }),
);

// tRPC
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
  }),
);

// SSE endpoint for real-time events
app.get("/events", createSSEHandler(db));

const port = Number(process.env.PORT) || 4000;

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 255,
};

logger.info({ port }, "Server running");
