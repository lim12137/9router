FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency files
COPY package*.json ./
# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# Copy source code (separate layer for better caching)
COPY open-sse ./open-sse
COPY src ./src
COPY public ./public
COPY cloud ./cloud
COPY next.config.mjs ./
COPY eslint.config.mjs ./
COPY postcss.config.mjs ./
COPY jsconfig.json ./

# Build
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="9router"

ENV NODE_ENV=production
ENV PORT=20128
ENV HOSTNAME=0.0.0.0

# Runtime writable location for localDb when DATA_DIR is configured to /app/data
RUN mkdir -p /app/data

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

EXPOSE 20128

CMD ["node", "server.js"]
