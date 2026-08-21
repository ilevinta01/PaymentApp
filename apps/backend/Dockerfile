FROM node:20-alpine AS build
WORKDIR /repo
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @oplata/backend run prisma:generate
RUN pnpm --filter @oplata/backend run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
COPY --from=build /repo/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /repo/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /repo/apps/backend/node_modules ./apps/backend/node_modules
EXPOSE 3001
CMD ["node", "apps/backend/dist/main.js"]
