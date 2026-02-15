FROM node:22-alpine AS base
RUN corepack enable

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm --filter @nextgame/api build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/server.js"]
