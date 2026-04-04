# Build stage
FROM oven/bun:1.3.4-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./
COPY turbo.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/server ./apps/server

# Copy all workspace package.json files
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/telegram-bot/package.json ./apps/telegram-bot/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

# Install dependencies
RUN bun install --frozen-lockfile

# Production stage
FROM oven/bun:1.3.4-alpine

WORKDIR /app

# Copy built files and dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server ./apps/server

# Set working directory to server app
WORKDIR /app/apps/server

# Expose port (Railway/Fly.io will set PORT env var)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e 'fetch("http://localhost:4000/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

# Start the server
CMD ["bun", "run", "src/index.ts"]
