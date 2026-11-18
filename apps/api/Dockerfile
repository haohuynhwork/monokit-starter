# Pinned: node 26.12.1 segfaults with pnpm 12.15
FROM node:26.12.0-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN npm i -g pnpm@12.15.0
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/nest/package.json packages/nest/
COPY packages/contracts/package.json packages/contracts/
COPY packages/geo/package.json packages/geo/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @apps/api...
COPY packages/db packages/db
COPY packages/nest packages/nest
COPY packages/contracts packages/contracts
COPY packages/geo packages/geo
COPY apps/api apps/api
# api... builds @packages/db, @packages/nest, @packages/contracts and @packages/geo before the api
RUN pnpm --filter @apps/api... build \
	&& pnpm deploy --filter @apps/api --prod --legacy /out \
	&& cp -r apps/api/dist /out/dist

# Migrator deps: only @packages/db (prisma CLI is a devDependency), none of api's toolchain
FROM base AS migrate-build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json packages/db/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @packages/db
COPY packages/db packages/db
RUN pnpm deploy --filter @packages/db --legacy /out

# One-shot migrator: prisma CLI + config + migrations/, without pnpm or the build stage's layers
FROM node:26.12.0-slim AS migrate
WORKDIR /app
COPY --from=migrate-build --chown=node:node /out ./
USER node
CMD ["node_modules/.bin/prisma", "db", "migrate"]

FROM node:26.12.0-slim AS runtime
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3001
CMD ["node", "dist/main"]
