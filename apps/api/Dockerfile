FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++
RUN corepack enable pnpm

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
WORKDIR /app
COPY . .
RUN pnpm --filter @alldata/shared build
RUN cd apps/api && pnpm db:generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 4000
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "tsx", "src/main.ts"]
