# Build stage
FROM oven/bun:1.2.5-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./
COPY turbo.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/telegram-bot ./apps/telegram-bot

# Install dependencies
RUN bun install --frozen-lockfile

# Production stage
FROM oven/bun:1.2.5-alpine

WORKDIR /app

# Copy built files and dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/telegram-bot ./apps/telegram-bot

# Set working directory to telegram-bot app
WORKDIR /app/apps/telegram-bot

# Health check (bot should stay running)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD pgrep -f "bun run" > /dev/null || exit 1

# Start the bot
CMD ["bun", "run", "src/index.ts"]
