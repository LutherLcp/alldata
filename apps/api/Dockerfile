FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++ openssl
RUN corepack enable pnpm
RUN npm install -g tsx

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --no-frozen-lockfile

FROM dependencies AS builder
WORKDIR /app
COPY . .
RUN pnpm --filter @alldata/shared build
RUN cd apps/api && pnpm db:generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=development
RUN apk add --no-cache dumb-init openssl
COPY --from=dependencies /app /app
COPY --from=builder /app/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist
COPY --from=builder /app/apps/api/src /app/apps/api/src
COPY --from=builder /app/apps/api/prisma /app/apps/api/prisma
COPY --from=builder /app/apps/api/tsconfig.json /app/apps/api/tsconfig.json
COPY --from=builder /app/apps/api/package.json /app/apps/api/package.json
WORKDIR /app/apps/api
EXPOSE 4000
ENTRYPOINT ["dumb-init", "--"]
CMD ["tsx", "src/main.ts"]
