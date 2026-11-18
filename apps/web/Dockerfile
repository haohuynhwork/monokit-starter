# Pinned: node 26.12.1 segfaults with pnpm 12.15
FROM node:26.12.0-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN npm i -g pnpm@12.15.0
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
# postinstall copies TinyMCE into public/plugin and builds the content styles
COPY apps/web/scripts apps/web/scripts
COPY packages/contracts/package.json packages/contracts/
COPY packages/editor/package.json packages/editor/
COPY packages/editor/scripts packages/editor/scripts
COPY packages/geo/package.json packages/geo/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @apps/web...
COPY packages/contracts packages/contracts
COPY packages/editor packages/editor
COPY packages/geo packages/geo
COPY packages/ui packages/ui
COPY apps/web apps/web
# web... also builds @packages/contracts and @packages/geo (@packages/ui and
# @packages/editor are source, bundled by Vite)
RUN pnpm --filter @apps/web... build \
	&& pnpm deploy --filter @apps/web --prod --legacy /out \
	&& cp -r apps/web/dist /out/dist

FROM node:26.12.0-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
CMD ["node_modules/.bin/srvx", "--prod", "--static", "../client", "dist/server/server.js"]
