// Auth
export const TOKEN_TTL_MS = 5 * 60 * 1000;
export const AUTH_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{32}$/;
export const JWT_EXPIRY = "7d" as const;

// SSE
export const MAX_SSE_CONNECTIONS = process.env.NODE_ENV === "development" ? 50 : 5;
export const SSE_CONN_TTL_SEC = 300;
export const SSE_MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const SSE_KEEPALIVE_MS = 30_000;
export const SSE_TICKET_TTL_SEC = 30;

// Presence
export const PRESENCE_HEARTBEAT_MS = 60_000;
export const PRESENCE_TTL_SEC = 60 * 5;

// Pagination
export const MESSAGES_DEFAULT_LIMIT = 25;
export const MESSAGES_MAX_LIMIT = 50;
export const USER_SEARCH_DEFAULT_LIMIT = 10;
export const USER_SEARCH_MAX_LIMIT = 25;

// Idempotency
export const IDEMPOTENCY_TTL_SEC = 60 * 60;
export const EXCHANGE_CACHE_TTL_SEC = 60;
