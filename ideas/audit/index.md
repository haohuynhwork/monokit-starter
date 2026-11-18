# Audit

An append-only log of who did what, and when: "who deleted this post?",
"who made this user an admin?", "who signed in from this IP?". It records
business actions, not HTTP requests or row diffs.

**First slice built**: the `AuditEvent` table
(`packages/db/src/prisma/contracts/audit.prisma`), the `apps/api/src/audit/`
context, `GET /audit-events`, the daily retention job and the panel's
Activity page. The actions marked "yes" in "What gets logged" are recorded;
the rest follow the same pattern (see "Adding an action").

Its own bounded context (`apps/api/src/audit/`). Other contexts don't call
it: they raise domain events on the `EventBus` (like `PostPublishedEvent`),
and audit event handlers turn them into rows. Audit never imports another
context's repository or entities.

## Table

The SQL below is the design. In the contract it follows the project
conventions: model `AuditEvent`, camelCase columns, `ip` as `Varchar(45)`
like `UserSession.ip` (not `INET`), and `data` without a database default
(the api always writes it). The three indexes are plain ascending btrees,
which Postgres scans backwards for newest first.

```sql
CREATE TABLE audit_events (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Who did it. NULL for the system (scheduler, seeders) and for
    -- anonymous attempts (failed login with an unknown email).
    -- No foreign key: the log must outlive the user row, and a hard
    -- delete must never cascade into it.
    actor_id     BIGINT,

    -- '<context>.<verb>', e.g. 'posts.published', 'users.role_changed',
    -- 'auth.login_failed'. Free text checked in code, not a CHECK: new
    -- actions shouldn't need a migration.
    action       VARCHAR(64) NOT NULL,

    -- What it was done to; both NULL for actions without a target
    -- (e.g. 'auth.login_failed' for an unknown email)
    entity_type  VARCHAR(32),
    -- Text, so non-bigint keys (asset uuids, emails) fit too
    entity_id    VARCHAR(64),

    -- Action-specific details, small and flat: { "from": "author",
    -- "to": "editor" }, { "title": "...", "path": "travel/paris" }.
    -- Never secrets, tokens, password hashes or full bodies.
    data         JSONB NOT NULL DEFAULT '{}',

    -- Request context, when there was a request
    ip           INET,
    user_agent   VARCHAR(512),

    CONSTRAINT audit_events_entity
        CHECK ((entity_type IS NULL) = (entity_id IS NULL))
);

-- "History of this post"
CREATE INDEX audit_events_entity_idx
    ON audit_events (entity_type, entity_id, occurred_at DESC);
-- "What did this user do"
CREATE INDEX audit_events_actor_idx
    ON audit_events (actor_id, occurred_at DESC);
-- Admin list, newest first, and retention cleanup
CREATE INDEX audit_events_occurred_idx
    ON audit_events (occurred_at DESC);
```

No `updated_at` / `deleted_at`: rows are never changed. Only the retention
job deletes them (see Retention).

## What gets logged

Start with actions someone will actually ask about:

| Action                       | Entity | `data`                               | Built | Delivery   |
| ---------------------------- | ------ | ------------------------------------ | ----- | ---------- |
| `auth.login`                 | user   | `{ provider }`                       | yes   | event      |
| `auth.login_failed`          | none   | `{ reason }` (no email, see Privacy) | yes   | event      |
| `auth.password_reset`        | user   | `{}`                                 |       |            |
| `auth.password_changed`      | user   | `{}`                                 |       |            |
| `users.created`              | user   | `{ role }`                           |       |            |
| `users.role_changed`         | user   | `{ from, to }`                       | yes   | guaranteed |
| `users.disabled` / `enabled` | user   | `{}`                                 |       |            |
| `users.deleted`              | user   | `{}`                                 | yes   | guaranteed |
| `posts.published`            | post   | `{ title, path }`                    | yes   | event      |
| `posts.unpublished`          | post   | `{}`                                 |       |            |
| `posts.deleted`              | post   | `{ title }`                          |       |            |
| `storage.asset_deleted`      | asset  | `{ filename }`                       |       |            |
| `orders.placed`              | order  | `{ total, currency }`                | yes   | event      |
| `orders.status_changed`      | order  | `{ from, to }`                       |       |            |
| `configs.updated`            | config | `{ key }`                            | yes   | event      |

`auth.login_failed` has no target for now: `VerifyCredentialsQuery` doesn't
say whether the email exists, so every failure is
`{ reason: 'invalid_credentials' }`. `orders.placed` stores the total in
minor units as text (JSON has no bigint).

Not logged: reads, ordinary content edits (title typo fixes), token
refreshes. Edit history is a separate feature (post revisions), not audit.

Content tables keep their own `author_id` / `created_by_id` for "who owns
this"; audit answers "who changed it", which can be someone else (an
editor).

## Flow

1. A command carries the actor: `new DeleteUserCommand(id, actor)` where
   `actor = { userId, ip, userAgent }` (`Actor` in `common/domain/actor.ts`)
   comes from the controller's `@CurrentActor()` (auth guard + request).
   Seeders and the scheduler pass `SYSTEM_ACTOR` (`userId: null`), the
   default. Commands that already carry an actor id take an optional
   `meta: RequestMeta` (`metaOf(actor)`) instead.
2. The aggregate records the event; the handler publishes it on the
   `EventBus` after the commit, as `PublishPostHandler` already does.
3. `audit/application/events/*.handler.ts` maps each event to a
   `RecordAuditEventCommand`, whose handler inserts one row.

Events carry `actorId` already (`PostPublishedEvent.actorId`); add the
request context (`ip`, `userAgent`) as an optional `meta` on the event so
domain events stay free of HTTP types.

### Delivery

Hybrid: best effort by default, guaranteed for a few actions.

- **Event (default)**: the handler publishes a domain event after its
  commit; `audit/application/events/*.handler.ts` turns it into a
  `RecordAuditEventCommand`. A crash between commit and insert loses the
  row, and an audit failure is logged and swallowed: it never fails the
  user's action. Fine for a CMS.
- **Guaranteed**: `users.role_changed` and `users.deleted` (permissions).
  The users repository writes the row inside the same `db.transaction` as
  the change (`save(user, auditEntry)`), through the `AUDIT_WRITER` port
  (`common/infrastructure/audit-writer.ts`, implemented by audit's
  `PrismaAuditEventRepository`, provided globally by `AuditModule`). The
  change and its row commit together; if the audit insert fails, the
  action fails. These actions have no event handler, so they are never
  recorded twice.

To make another action guaranteed: build an `AuditEntry`
(`common/domain/audit-entry.ts`) in the command handler, pass it to the
aggregate's repository `save`, and have the repository call
`audit.record(tx, entry)` inside its transaction (inject `AUDIT_WRITER`).
Remove the action's audit event handler if it had one. Keep it to actions
where a missing row is worse than a failed action (money, permissions); an
outbox table is the next step if that list grows.

### Adding an action

Event delivery: add an event in the context's `domain/events/` (with
`actorId` and optional `meta`), publish it after the commit, then add
`audit/application/events/<event>.handler.ts` mapping it to an
`AuditEntry` and register it in `audit.module.ts`. Actions are
`<context>.<verb>` in lower snake case; `toAuditRow` rejects other shapes.

## Reading

- `GET /audit-events?entityType=&entityId=&actorId=&action=&from=&to=&cursor=`
  (`@ApiTags('audit')`), admin only. Cursor pagination on
  `(occurred_at, id)`, newest first.
- `GetAuditEventsQuery` reads with `db.orm` straight into response shapes,
  joining the actor's current `display_name` (or "Deleted user").
- Built: `GET /audit-events` (filters above plus `limit`, default 50; the
  cursor is the opaque `nextCursor` of the previous page), and the panel's
  "Activity" page (`apps/panel/src/routes/_auth/activity.tsx`, admins only)
  with filters and "Show older".
- Later: a "History" tab on post and user detail pages, using the same
  query with `entityType` / `entityId`.

## Privacy and retention

- `ip` and `user_agent` are personal data. Keep rows 1 year (env
  `AUDIT_RETENTION_DAYS`, default 365); a daily job deletes older rows.
  Built as `AuditRetentionJob` (`audit/infrastructure/`): the api has no
  scheduler, so it is a plain timer, first run a minute after boot, then
  every 24 hours, sending `PurgeAuditEventsCommand`. Every instance runs it;
  the DELETE is idempotent.
- Security rows (`auth.*`) could have a shorter retention if needed;
  start with one setting.
- When a user is hard-deleted (GDPR erasure), set `actor_id`, `ip` and
  `user_agent` to NULL on their rows; the actions themselves stay.
- `auth.login_failed` for an unknown email stores no email, only
  `{ reason: 'unknown_email' }`, so the log can't be used to collect
  addresses.

## Not built yet

- The other actions in "What gets logged".
- History tabs on post and user pages.
- GDPR erasure of a user's audit rows (actor, ip, user agent to NULL).
- GraphQL mutations pass no request meta yet (actor id only), except the
  users role/delete mutations.
- Outbox for guaranteed delivery.
- Export (CSV) for the admin page.
- Alerts on patterns (many failed logins per IP); the rate limiter covers
  the urgent case.
- Partitioning by month: only if the table grows to millions of rows.
