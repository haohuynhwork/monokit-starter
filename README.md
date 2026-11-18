# Monokit starter

A pnpm monorepo for starting new projects:

- **`apps/api`**: NestJS 12 api (DDD + CQRS, REST + GraphQL). It ships with
  users, auth, storage (media library), pages, geo, configs, mail,
  notifications and audit.
- **`apps/web`**: a TanStack Start app with the public site (SSR pages built
  from blocks) and the admin panel at `/admin`.
- **`packages/*`**: the Prisma 8 database contract (`db`), shared Nest
  modules (`nest`), api response types (`contracts`), shadcn/ui (`ui`), the
  TinyMCE editor and media picker (`editor`), and ISO country/region data
  (`geo`).

## Start

```sh
make env            # .env from .env.example; set the secrets
pnpm install
make up             # Postgres + Valkey in Docker
make db.sh c="prisma db migrate"   # apply packages/db/migrations
make seed           # admin@, editor@, author@example.com (SEED_PASSWORD)
make dev            # packages (watch) + api + web
```

- Site: http://localhost:3002
- Admin: http://localhost:3002/admin
- API docs: http://localhost:3000/docs

`make` with no arguments lists every target. See `AGENTS.md` for the
architecture and conventions, and `ideas/` for each domain's design notes.

## New project from this starter

1. Copy the repo, or mark it as a GitHub template and use "Use this
   template". Start a fresh git history.
2. Rename `monokit` in `package.json`, `.env.example` (`PROJECT_NAME`),
   `compose*.yaml`, `apps/web/src/lib/app-prefix.ts` and the titles in
   `apps/web/src/routes/`.
3. Add bounded contexts under `apps/api/src/<context>/` and their routes
   under `apps/web/src/routes/`.
