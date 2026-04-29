FROM node:20-slim AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/dashboard/package.json packages/dashboard/

RUN pnpm install --frozen-lockfile
RUN pnpm approve-builds --all

COPY packages/ packages/
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# --- Production image ---
FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/server/package.json ./packages/server/
COPY --from=build /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=build /app/packages/dashboard/dist ./packages/dashboard/dist
COPY --from=build /app/packages/dashboard/package.json ./packages/dashboard/

# Default directories
RUN mkdir -p /app/assets /app/photos

ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
