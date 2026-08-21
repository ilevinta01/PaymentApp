FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @oplata/shared run build
RUN pnpm --filter @oplata/backend run prisma:generate
RUN pnpm --filter @oplata/backend run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/backend/dist ./dist
COPY --from=build /repo/apps/backend/prisma ./prisma
COPY --from=build /repo/apps/backend/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /repo/packages/shared ./packages/shared
EXPOSE 3001
CMD ["node", "dist/main.js"]
