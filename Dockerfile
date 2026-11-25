# Production Runtime Dockerfile for PixelType (Sumapod Docker Architecture)
#
# Built directly from the immutable pre-built CI release artifact (dist/ + dist-server/index.cjs)
# using Sumapod's locally cached node:24-alpine base image (supports offline `docker build --pull=false`).
# Runtime secrets (P2R_CLIENT_ID, P2R_CLIENT_SECRET) MUST be injected via host --env-file at
# container startup, never baked into the image or build arguments.

FROM node:24-alpine

ARG RELEASE_SHA=unknown

LABEL org.opencontainers.image.title="pixeltype" \
      org.opencontainers.image.description="PixelType Typing Game & Authenticated P2R Express Runtime" \
      org.opencontainers.image.revision="${RELEASE_SHA}" \
      org.opencontainers.image.source="https://github.com/YuZann81/pixeltype"

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PIXELTYPE_RELEASE_SHA=${RELEASE_SHA}

COPY --chown=node:node dist ./dist
COPY --chown=node:node dist-server ./dist-server

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist-server/index.cjs"]
