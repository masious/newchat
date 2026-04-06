type ProcedureRateLimit = {
  limit: number;
  windowSec: number;
};

/**
 * Per-procedure rate limits. Key is the tRPC path (e.g. "auth.createToken").
 * Procedures not listed here fall back to DEFAULT_RATE_LIMIT.
 */
export const PROCEDURE_RATE_LIMITS: Record<string, ProcedureRateLimit> = {
  // Public (auth) — keyed by IP
  "auth.createToken": { limit: 5, windowSec: 60 },
  "auth.pollToken": { limit: 30, windowSec: 60 },
  "auth.exchange": { limit: 10, windowSec: 60 },

  // Protected — keyed by userId
  "messages.send": { limit: 60, windowSec: 60 },
  "messages.typing": { limit: 20, windowSec: 60 },
  "users.search": { limit: 20, windowSec: 60 },
  "uploads.getPresignedUrl": { limit: 20, windowSec: 60 },
  "users.fetchTelegramAvatar": { limit: 5, windowSec: 60 },
  "conversations.create": { limit: 10, windowSec: 60 },
  "sse.createTicket": { limit: 10, windowSec: 60 },
};

export const DEFAULT_RATE_LIMIT: ProcedureRateLimit = {
  limit: 60,
  windowSec: 60,
};
