# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

pnpm workspace (`apps/*`, `packages/*`):
- `apps/api` (`@apps/api`): NestJS 12, ESM (`"type": "module"`, imports end in `.js`), Vitest.
- `apps/web` (`@apps/web`): TanStack Start (Vite) + React 19 + Tailwind 4, file-based routes in `src/routes/`. Read `apps/web/node_modules/@tanstack/react-start/skills/react-start/SKILL.md` before writing web code.
  - Public site: `routes/_site.tsx` (header/footer) and `routes/_site/` (`index.tsx`, `$.tsx`), server-rendered. It reads the api through server functions (`src/lib/site/public-api.ts`, `API_URL`).
  - Admin panel: `routes/admin/` (`route.tsx` sets `ssr: false`; `_auth.tsx` requires a session). It calls the api from the browser at same-origin `/api` with HttpOnly cookies (`src/lib/api.ts`).
  - `/api`, `/serve`, `/assets`, `/storage` and `/socket.io` go to the api: the Vite proxy in dev (`vite.config.ts`), `src/start.ts` middleware in production.
  - Code private to one feature goes in its route folder under `-lib/` (e.g. `routes/admin/_auth/pages/-lib/`; the `-` keeps the router from treating it as a route), imported as `@/routes/admin/_auth/<feature>/-lib/...`; code shared across features goes in `src/components/` or `src/lib/` (`lib/site/` for the public site only, `lib/admin/` for the panel only, top-level `lib/` for both).
- `packages/db` (`@packages/db`): Prisma 8 contract, migrations and the `db` client. Built with tsdown to `dist/`; the api imports the built package, so rebuild after contract changes.
- `packages/nest` (`@packages/nest`): Nest modules shared by Nest apps (`DatabaseModule`, `@InjectDb()`). `@nestjs/*` is a peer dependency; never import Nest from `packages/db`.
- `packages/contracts` (`@packages/contracts`): types only (no runtime code, no zod), shared by api and web. `ResponseEnvelope<T>` is the body of every api response: `success` (`data`), `fail` (4xx, `code`/`message`, validation issues in `data.issues`) or `error` (5xx). The api wraps results with a global interceptor and exceptions with `ApiExceptionFilter`; controllers return plain data.
- `packages/ui` (`@packages/ui`): shadcn/ui components (style `radix-nova`, Tailwind 4), source only; `apps/web` bundles it and imports `@packages/ui/globals.css` once (`src/styles.css`). Add components with `pnpm dlx shadcn@latest add <name> -c packages/ui`; import as `@packages/ui/components/<name>`.
- `packages/editor` (`@packages/editor`): the media picker and rich-text editor (TinyMCE), source only, used by the admin panel. App specifics (media api calls, URLs, toasts, storage keys) come in through `configureEditor()`, called in `apps/web/src/components/editor-host.ts`; apps import them as `@/components/media-picker` / `@/components/rich-text-editor`, which re-export the package.
- `ideas/`: design notes (SQL + rationale) per domain (`pages`, `storage`, `users`, ...). Contracts follow these docs.

## Commands

`make` (no args) lists every target. The Makefile loads `.env`; `make env` creates it from `.env.example`.
- Docker dev services (db, valkey): `make up`, `make down`, `make logs s=api`, `make psql`.
- Run on the host instead: `make up` for the db, then `make dev:api` / `make dev:web` (or `make dev` for both) (or `./kit dev:api`).
- Build / lint / format: `make build`, `make lint` (oxlint in api), `make check` / `make fix` (Biome at the root).
- Rich-text content styles: edit `packages/editor/styles/content.css` (Tailwind `prose`, class `app_content`; and `editor-base.css`), then `make content-css` (or `make content-css-watch`); the package's `editor-css` script builds them into `apps/web/public/styles/`, also as part of web `dev` and `build`. `apps/web/scripts/copy-assets.mjs` also copies TinyMCE into `public/plugin/`. Never edit the outputs.
- Api tests: `make dev:api.sh c="pnpm test"`. Single file: `make dev:api.sh c="pnpm vitest run src/app.controller.spec.ts"`. E2E: `pnpm test:e2e`.
- Database shell with local `DATABASE_URL` and `prisma` on PATH: `make db.sh`, or `make db.sh c="prisma db verify"`.

## Database (Prisma 8)

Prisma 8 (formerly "Prisma Next") is not Prisma 7: no `schema.prisma` / `@prisma/client`. Its docs ship in the package; read them before editing: `packages/db/node_modules/@prisma/orm-postgres/skills/prisma-8/SKILL.md` and `references/` (contract, migrations, queries).
- Contract source: `packages/db/src/prisma/contract.prisma`. `contract.json` / `contract.d.ts` are emitted; never edit them.
- Workflow (inside `make db.sh`):
  1. edit the contract, then `prisma contract emit`;
  2. `prisma migration plan --name <slug>` (pass `--from <last migration dir>` when there is no `db` ref; destructive changes need `--delete` / `--rename` / `--convert`);
  3. fill any `placeholder(...)` in the generated `migration.ts`, then `node <dir>/migration.ts` to re-emit `ops.json`;
  4. `prisma db migrate --advance-ref db`.
- Queries: `db.orm.public.<Model>`; `connectDatabase()` from `packages/db/src/prisma/db.ts`.
- Running `pnpm prisma ...` can fail with a permission error on `node_modules/.bin` (pnpm reinstalls first); use `make db.sh` or `./node_modules/.bin/prisma`.

### Schema conventions

- Names are camelCase in both the contract and Postgres, with no `@map` / `@@map`. Raw SQL in the contract (`sql\`...\``) must double-quote them.
- `BigInt` ids with `@default(autoincrement())`; `TimestamptzString` timestamps.
- Soft delete via nullable `deletedAt`.
- Enum-like columns use PSL `enum` with `@@type("pg/text@1")` (planner adds the CHECK).

## Api architecture (DDD + CQRS)

The api is split into bounded contexts (`users`, `auth`, `storage`, `pages`, `geo`, ..., matching `ideas/`), each a Nest module under `apps/api/src/<context>/` with these layers:

```
<context>/
  domain/          entities, value objects, domain errors, repository interfaces
  application/
    commands/      <verb>-<noun>.command.ts + .handler.ts (writes)
    queries/       get-<noun>.query.ts + .handler.ts (reads)
  infrastructure/  repository implementations (Prisma), external services
  http/            controllers + request/response DTOs
  graphql/         resolvers + @ObjectType models (optional; same buses as http/)
  <context>.module.ts
```

- **Dependencies point inwards**: `http` -> `application` -> `domain`; `infrastructure` implements `domain` interfaces. `domain/` imports nothing from Nest, Prisma or `@packages/*`.
- **Commands** (`@nestjs/cqrs` `CommandBus`) change state. A handler loads the aggregate through its repository, calls domain methods, saves it, and returns at most the new id. Business rules (e.g. "email unique among non-deleted users", "only `password` identities have a hash") live in the domain, not the controller or the handler.
- **Queries** (`QueryBus`) never change state. They may skip the domain and read with `db.orm` / `db.sql` straight into response shapes.
- **Repositories** exist per aggregate root (`User` owns its `UserIdentity` rows) and are bound by a token: `{ provide: USER_REPOSITORY, useClass: PrismaUserRepository }`. Only infrastructure touches `@InjectDb()`.
- **Transactions**: one command = one transaction, opened in the handler (or repository `save`) with `db.transaction`.
- **Cross-context**: contexts talk through commands/queries or domain events (`EventBus`), never by importing another context's repository or entities.
- Swagger: each controller has `@ApiTags('<context>')` (public website routes use `public`). A new tag also goes in `TAGS` in `apps/api/src/common/http/setup/swagger.ts`, with a one-line description, where it belongs in the UI order; tags missing there show last, undescribed. Document bodies, queries and responses with `ApiZodBody` / `ApiZodQuery` / `ApiZodResponse` (`common/http/setup/openapi.ts`), so the docs come from the same zod schemas that validate.
- Controllers stay thin: validate the DTO, `execute` a command or query, map the result. GraphQL resolvers follow the same rule (reuse the http DTO zod schemas); the schema is served at `/graphql` (setup in `common/graphql/`), and the global filter/interceptor/guards handle both kinds of request.
- Files and images (covers, avatars, galleries, external image URLs): strongly prefer the `storage` context, an asset (`file`, or `link` for an external URL) attached with an asset usage (`AttachAssetCommand`), over file, key or URL columns in another context's tables (`ideas/storage`).
- Asset URLs are resolved in the api: responses carry ready-to-use URLs for stored files, never raw storage keys, so clients (web, GraphQL, others) don't need to know the storage backend or build URLs themselves.
- Seeders and scripts go through the `CommandBus`, so seeded data follows the same rules.

where to put apirespone class?

Put it in a shared HTTP folder in the api, not inside a bounded context:

```
apps/api/src/
  common/
    http/
      api-response.ts             ← the response type/class
      response.interceptor.ts     ← wraps controller results in it
      http-exception.filter.ts    ← wraps errors in the same shape
  users/
  auth/
```

- Why common/http: it's how HTTP responses look, used by every context's http/ layer. Under the AGENTS.md layering, domain/ and application/ must never import it. Handlers return plain data and the HTTP layer wraps it.
- Why not packages/nest: only move it there when a second Nest app needs the same response format, same as the database module.
- Wrap with an interceptor, not by hand: a global interceptor turns return user into { data: user }, and an exception filter turns errors into { error: { code, message } }. Controllers then stay thin and every endpoint gets the same shape automatically.

Two cautions:
- Name clash: @nestjs/swagger exports an ApiResponse decorator. If you add Swagger later, the two names collide in imports. Call yours ApiResponseBody or ResponseEnvelope instead.
- Is an envelope needed at all? Many APIs return the resource directly and rely on HTTP status codes. An envelope only pays off if you need room for extra fields like meta (pagination) next to data. If list endpoints are the only ones that need meta, you could use a Paginated<T> type for those and return everything else unwrapped.
