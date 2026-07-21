FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @alldata/web... build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./node_modules/@alldata/shared
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/index.html ./index.html
EXPOSE 3000
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]