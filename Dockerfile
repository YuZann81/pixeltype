# Multi-stage production Dockerfile for PixelType (Sumapod Docker runtime)
# Runs a single Express process serving Vite dist/ + authenticated /api/bff/game-token.
# Runtime secrets (P2R_CLIENT_ID, P2R_CLIENT_SECRET) MUST be injected at container runtime,
# never baked into the image or build arguments.

FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/dist-server ./dist-server

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist-server/index.mjs"]
