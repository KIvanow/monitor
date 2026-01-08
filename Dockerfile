# ============================================
# Build Stage
# ============================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build all packages
RUN pnpm build

# ============================================
# Production Stage
# ============================================
FROM node:20-alpine AS production

# Install pnpm and wget for healthcheck only (no build tools needed!)
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate && \
    apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only (pure JS, no native compilation)
RUN pnpm install --prod --frozen-lockfile

# Copy built backend
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy built frontend to be served by backend
COPY --from=builder /app/apps/web/dist ./apps/api/public

# Copy shared package (if needed at runtime)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_HOST=localhost
ENV DB_PORT=6379
ENV DB_TYPE=auto
ENV DB_USERNAME=default
ENV STORAGE_TYPE=memory

# Expose port (can be overridden with -e PORT=<port> at runtime)
# Note: EXPOSE is documentation only - actual port binding happens via -p flag
EXPOSE 3001

# Health check - uses PORT environment variable
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Start the server
CMD ["node", "apps/api/dist/main.js"]
