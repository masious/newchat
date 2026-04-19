// Test environment setup — preloaded before every test file via bunfig.toml.
// Sets required env vars so modules that validate at import time (r2.ts, jwt.ts)
// don't crash. Must run before any app code is imported.

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";

// Auth
process.env.JWT_SECRET = "test-jwt-secret-do-not-use-in-production";

// Redis (default is fine for unit tests that mock Redis)
process.env.REDIS_URL ??= "redis://localhost:6379";

// Database (dummy — unit tests mock the db, integration tests override this)
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5433/newchat_test";

// R2 — modules validate these at import time
process.env.R2_ACCOUNT_ID = "test-account-id";
process.env.R2_ACCESS_KEY_ID = "test-access-key-id";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-access-key";
process.env.R2_BUCKET_NAME = "test-bucket";
process.env.R2_PUBLIC_URL = "https://test.r2.dev";

// Telegram
process.env.TELEGRAM_BOT_TOKEN = "123456:TEST-TOKEN";
process.env.WEB_APP_URL = "http://localhost:3001";

// Web Push — intentionally unset so web-push.ts takes the
// "not configured" path and skips VAPID key validation.
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
