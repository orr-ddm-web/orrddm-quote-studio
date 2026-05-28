FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto \
    fonts-noto-color-emoji \
    python3 \
    make \
    g++ \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# ── Build frontend ─────────────────────────────────────────────────
FROM base AS frontend-builder
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── Final image ────────────────────────────────────────────────────
FROM base AS final
WORKDIR /app

# Backend deps (needs build tools for better-sqlite3)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Backend source
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create persistent data dir — Railway Volume will mount at /data
# This ensures the directory exists with correct permissions before the volume is mounted
RUN mkdir -p /data /data/uploads && chmod 777 /data /data/uploads

WORKDIR /app/backend

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "src/index.js"]
