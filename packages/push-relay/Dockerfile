# =============================================================================
# WAIaaS Push Relay Docker Image -- Multi-stage build
# Stage 1 (builder):   Install deps + build core + push-relay via turbo
# Stage 2 (prod-deps): Production-only deps with build tools for native addons
# Stage 3 (runner):    Slim image with pre-built deps + dist artifacts
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: builder
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder

# Native addon build dependencies (better-sqlite3)
RUN apt-get update \
    && apt-get install -y python3 make g++ --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# 1) Copy workspace config + lock file (layer caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

# 2) Copy each package's package.json only (push-relay + its dependency core)
COPY packages/core/package.json packages/core/package.json
COPY packages/push-relay/package.json packages/push-relay/package.json

# 3) Install all dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# 4) Copy full source
COPY . .

# 5) Build push-relay and its dependencies
RUN pnpm turbo build --filter=@waiaas/push-relay...


# ---------------------------------------------------------------------------
# Stage 2: prod-deps
# Build tools (python3/make/g++) are inherited from builder, so native addon
# compilation always succeeds even when prebuilt binary download fails.
# ---------------------------------------------------------------------------
FROM builder AS prod-deps

WORKDIR /prod

RUN cp /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/turbo.json ./ && \
    for dir in core push-relay; do \
      mkdir -p "packages/$dir" && \
      cp "/app/packages/$dir/package.json" "packages/$dir/"; \
    done

RUN pnpm install --frozen-lockfile --prod


# ---------------------------------------------------------------------------
# Stage 3: runner
# ---------------------------------------------------------------------------
FROM node:22-slim AS runner

LABEL org.opencontainers.image.title="WAIaaS Push Relay" \
      org.opencontainers.image.description="Bridge ntfy topics to push notification services (Pushwoosh, FCM)" \
      org.opencontainers.image.url="https://github.com/waiaas/WAIaaS" \
      org.opencontainers.image.source="https://github.com/waiaas/WAIaaS" \
      org.opencontainers.image.vendor="WAIaaS" \
      org.opencontainers.image.licenses="MIT"

LABEL com.centurylinklabs.watchtower.enable="true"

# Runtime dependencies: curl for HEALTHCHECK
RUN apt-get update \
    && apt-get install -y curl --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Non-root user (UID 1001)
RUN groupadd -g 1001 waiaas && useradd -u 1001 -g waiaas -m -s /bin/sh waiaas

WORKDIR /app

# 1) Copy production dependencies (pre-compiled native addons from prod-deps stage)
COPY --from=prod-deps /prod/ ./

# 2) Copy build artifacts (dist directories)
COPY --from=builder /app/packages/core/dist packages/core/dist
COPY --from=builder /app/packages/push-relay/dist packages/push-relay/dist

# 3) Copy example config
COPY --from=builder /app/packages/push-relay/config.example.toml /app/config.example.toml

# 4) Create data directory with correct ownership
RUN mkdir -p /data && chown -R waiaas:waiaas /data /app

# 5) Environment configuration
ENV NODE_ENV=production
ENV RELAY_CONFIG=/data/config.toml
ENV RELAY_DB=/data/relay.db

EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3200/health || exit 1

USER waiaas

CMD ["node", "packages/push-relay/dist/bin.js"]
