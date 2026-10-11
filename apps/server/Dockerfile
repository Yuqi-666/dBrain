FROM node:24.15.0-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter server build

FROM node:24.15.0-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates libfontconfig1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=builder --chown=node:node /app/apps/server/dist ./
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "index.mjs"]
