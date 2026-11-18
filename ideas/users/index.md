# Users

A user is a person. How they sign in (password, Google, GitHub, ...) lives in
`user_identities`, so one user can have several login methods.

`users` is plural like the other tables; the singular `user` is reserved in
Postgres and would need quoting everywhere.

## Tables

```sql
CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Stored as entered; uniqueness is case-insensitive (see index below)
    email         VARCHAR(320) NOT NULL,
    -- Set once the user proves they own the address
    email_verified_at TIMESTAMPTZ,

    -- Full name as the user writes it, e.g. 'Nguyễn Văn An'; always shown
    display_name  VARCHAR(255) NOT NULL,
    -- For greetings and compact UI ('An'); NULL means use display_name
    short_name    VARCHAR(100),
    -- Optional structured parts. Never joined to build display_name, since
    -- the order differs by culture (Vietnamese: family name first).
    given_name    VARCHAR(255),
    family_name   VARCHAR(255),
    -- Optional contact number: ISO 3166-1 alpha-2 country ('VN') plus the
    -- national number, digits only, no trunk 0 ('901234567'). Text, not a
    -- number: digits to match and show, never to compute. Both or neither.
    -- The calling code (+84) and E.164 are computed. Not unique, not used
    -- to sign in.
    phone_country VARCHAR(2),
    phone_number  VARCHAR(20),
    -- No avatar column: the avatar is an asset_usages row in
    -- ../storage (owner_type 'user', slot 'avatar', a single slot)

    status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'disabled')),
    -- One role per user; what it may do is in role_permissions ("Roles")
    role_id       BIGINT NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    -- In refresh tokens; bumping it signs the user out everywhere
    token_version INT NOT NULL DEFAULT 0,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Set by the ORM on every update (@onUpdate), not by a trigger
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Soft delete; NULL means the user exists. Normal queries filter on
    -- deleted_at IS NULL.
    deleted_at    TIMESTAMPTZ,

    CONSTRAINT users_phone_pair
        CHECK ((phone_country IS NULL) = (phone_number IS NULL))
);

-- "Paul@x.com" and "paul@x.com" are the same user. Partial, so a deleted
-- user's email can be used to sign up again.
CREATE UNIQUE INDEX users_email_unique
    ON users (lower(email))
    WHERE deleted_at IS NULL;

-- One row per login method. provider = 'password' stores a hash here;
-- OAuth providers store the provider's own user id instead.
CREATE TABLE user_identities (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    provider         VARCHAR(32) NOT NULL,
    -- For 'password' this is the user id as text; for OAuth, the 'sub' claim
    provider_user_id VARCHAR(255) NOT NULL,
    -- Argon2id hash; only for provider = 'password'
    password_hash    VARCHAR(255),

    -- OAuth only. Placeholders for now: nothing reads or writes them yet.
    -- Encrypt at rest before storing real tokens.
    access_token             TEXT,
    refresh_token            TEXT,
    id_token                 TEXT,
    access_token_expires_at  TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    -- Space-separated scopes granted
    scope                    TEXT,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at     TIMESTAMPTZ,

    -- A Google account can only be linked to one user
    CONSTRAINT user_identities_provider_unique
        UNIQUE (provider, provider_user_id),
    -- Only 'password' identities have a hash, and they always do
    CONSTRAINT user_identities_password_hash
        CHECK ((provider = 'password') = (password_hash IS NOT NULL))
);

-- "All login methods of this user"
CREATE INDEX user_identities_user_idx
    ON user_identities (user_id);
```

### Example rows

`users`

|  id | email      | display_name | status   | role   |
| --: | ---------- | ------------ | -------- | ------ |
| 123 | paul@x.com | Paul         | active   | admin  |
| 124 | anna@y.com | Anna         | disabled | author |

`user_identities`

|  id | user_id | provider | provider_user_id      | password_hash      |
| --: | ------: | -------- | --------------------- | ------------------ |
|   1 |     123 | password | 123                   | $argon2id$v=19$... |
|   2 |     123 | google   | 109876543210987654321 |                    |
|   3 |     124 | github   | 5821934               |                    |

## Rules (users/domain/user.ts)

- Passwords: Argon2id; 8 to 256 characters (`weak_password`). Never stored
  or logged in plain text (`Password.toJSON()` is `[redacted]`).
- Email: trimmed, max 320, simple `a@b.c` check (`invalid_email`); unique
  case-insensitively among non-deleted users (`email_taken`, 409). The
  handler checks first; the partial index catches races.
- Phone: optional; a country and a number as typed ('0901 234 567'). The
  handler parses them with `parsePhone(country, input)` from
  `@packages/geo` (libphonenumber-js rules per country; drops the trunk 0);
  invalid is `invalid_phone` (400). A blank number clears both. The domain
  only keeps both-or-neither (it can't import `@packages/*`). Not verified,
  not unique. Views return `phone: { country, code, number, e164 }`
  (`'+84'`, `'+84901234567'`, from `callingCode(country)`) or null.
- New users: `status = 'active'`, one `password` identity
  (`provider_user_id` = user id, filled on insert). Sign-up always gets
  `author`; admins may pick the role.
- Disabled or deleted users cannot sign in or refresh (`canSignIn`).
- Last admin: changing the role, disabling or deleting the last active admin
  fails with `last_admin` (409).
- Changes to a deleted user fail with `user_deleted` (409).
- Changing a password needs the current one (`wrong_password`, 400).
- Deleting sets `deleted_at` and keeps the row, so posts and assets keep an
  owner. It drops every `user_identities` row and scrubs personal data:
  `email = 'deleted-{id}@invalid'`, `email_verified_at`, `short_name`,
  `given_name`, `family_name`, `phone_country`, `phone_number` to NULL, `display_name = 'Deleted user'`.
  Then the handler detaches the avatar and deletes its image, and detaches
  every other `asset_usages` row of the user (no FK, nothing cascades).
- `ON DELETE CASCADE` on `user_identities` only matters for a hard delete,
  which normal code never does.
- No domain events are published.

## Routes

All need an access token unless marked public. Responses carry `avatarUrl`
(resolved by storage), never a storage key.

| Route                                  | Who                          | Does                                                                         |
| -------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `GET /users/me`                        | signed in                    | own profile                                                                  |
| `PATCH /users/me`                      | signed in                    | update own names                                                             |
| `PUT /users/me/password`               | signed in                    | change password; `notify` flag (see `password-reset.md`)                     |
| `PUT /users/me/avatar`                 | signed in                    | upload avatar (multipart `file`, png/jpeg/webp, 2 MB)                        |
| `DELETE /users/me/avatar`              | signed in                    | remove avatar                                                                |
| `GET /users/permissions`               | signed in                    | permission list per role                                                     |
| `GET /users`                           | admin                        | list; `role`, `status`, `q` (email/name ilike), `limit` 1-100 (20), `offset` |
| `POST /users`                          | admin                        | create (201)                                                                 |
| `GET /users/:id`                       | admin                        | one user                                                                     |
| `PATCH /users/:id`                     | admin                        | update names                                                                 |
| `PUT /users/:id/role`                  | admin                        | change role                                                                  |
| `GET /roles`                           | `user:manage`                | roles with their permissions and user counts                                 |
| `POST /roles`                          | `user:manage`                | `{ key, name, description?, permissions[] }`; 409 `role_key_taken`           |
| `PUT /roles/:id`                       | `user:manage`                | rename, set permissions; 403 `system_role` on built-ins                      |
| `DELETE /roles/:id`                    | `user:manage`                | 403 `system_role`; 409 `role_in_use` while users have it                     |
| `PUT /users/:id/status`                | admin                        | enable/disable                                                               |
| `DELETE /users/:id`                    | admin                        | soft delete (204)                                                            |
| `POST /auth/register`                  | public, 5/hour               | sign up, returns tokens + cookies (201)                                      |
| `POST /auth/login`                     | public, 10/min and 10/15 min | returns tokens + cookies                                                     |
| `POST /auth/refresh`                   | public, 30/min               | body `refreshToken` or refresh cookie                                        |
| `POST /auth/logout`                    | signed in                    | signs out every device (bumps `token_version`), clears cookies (204)         |
| `POST /auth/ws-ticket`                 | signed in                    | one-minute ticket for the realtime socket                                    |
| `POST /auth/password/forgot`, `/reset` | public                       | forgotten password; see `password-reset.md`                                  |

Errors: `invalid_credentials` and `invalid_token` (401), `user_not_found`
(404), 403 when `@Roles` does not match. Login answers the same for an
unknown email, a wrong password and a disabled user, and verifies against a
dummy hash so timing doesn't reveal which emails exist.

Web: `(site)/(auth)/login` and `register`; `(site)/account` (customer:
`profile` (names, avatar), `orders`, `addresses`, `security` (password)); `panel/account` (+
`addresses`, owned by shop); `panel/users` (admin list, create, rename,
role, status, delete).

## Sessions (JWT)

Stateless: no sessions table. Code in `auth/infrastructure/jwt-*.ts`.
- HS256, algorithm pinned on verify (rejects `alg: none`), `exp` checked.
- Three token types: `access` (15 min, claims `sub`, `typ`, `role`),
  `refresh` (30 days, `sub`, `typ`, `ver`), `ws` (60 s, `sub`, `typ`) and
  `password_reset` (1 hour; see `password-reset.md`).
- Each type has its own key, derived with HKDF from `JWT_SECRET`, so one
  type can never pass as another; `typ` is checked as well.
- `kid` in the header (derived from the secret) picks the key. Rotation:
  move `JWT_SECRET` to `JWT_SECRET_PREVIOUS`, set a new one; drop the old
  one after 30 days. Both must be at least 32 characters. (`APP_SECRET` is a
  different secret, for encrypted settings in `configs`.)
- Token responses: `accessToken`, `refreshToken`, `expiresIn`,
  `refreshExpiresIn` (seconds).
- Clients send `Authorization: Bearer ...` or the cookies. Cookies are
  `HttpOnly; SameSite=Lax`, `Secure` only when `NODE_ENV=production`:
  `access_token` on path `/`, `refresh_token` on `{API_PREFIX}/auth`.
  The web server holds them; the browser socket only gets a ws ticket.
- Refresh and ws tickets look the user up (`GET` view, so non-deleted) and
  reject unless `status = 'active'`; that is what makes disabling and
  deleting take effect. The role is re-read there too, so a role change
  applies within ~15 minutes.
- Revocation: `users.token_version` goes into the refresh token (`ver`).
  `POST /auth/refresh` verifies the JWT (key by `kid`, `typ`, `exp`), runs
  the user check above, rejects unless `ver` equals the current
  `token_version`, then issues a fresh pair and resets both cookies.
- The version is bumped (`RevokeSessionsCommand`, `User.revokeSessions`) on
  logout, which signs out every device, and on password reset
  (forgot link, `ResetPasswordCommand`). Changing your own password doesn't bump it, so the current
  session stays signed in.
- Access tokens are not checked against the version: after a bump they work
  until they expire (up to 15 minutes).
- Refresh tokens are not rotated: until a bump, an older refresh token
  stays valid alongside newer ones, and reuse isn't detected. Per-device
  sessions or reuse detection would need a `sessions` table with opaque
  refresh tokens.

## Roles

One role per user (`users.role_id`). Roles and permissions are tables, so
admins can add roles in the panel; the permissions themselves stay in code,
because only code can enforce them.

```sql
CREATE TABLE roles (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Stable handle: 'admin', 'moderator'. Unique case-insensitively among
    -- non-deleted roles (partial index), so a deleted key can be reused.
    key         VARCHAR(50) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    -- Built-in (admin, editor, author): seeded by the api, immutable
    system      BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

-- The catalog of enforceable permissions. Source of truth is code
-- (users/domain/permissions.ts); the api upserts these rows at start-up.
CREATE TABLE permissions (
    id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key    VARCHAR(100) NOT NULL UNIQUE,   -- 'post:publish'
    "group" VARCHAR(50) NOT NULL,          -- 'Posts'
    label  VARCHAR(255) NOT NULL
);

CREATE TABLE role_permissions (
    role_id       BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX ON role_permissions (permission_id);
```

Rules:
- Built-in roles (`system`) can't be edited, renamed or deleted. `admin`
  always has every permission: the start-up sync re-grants it any new one, so
  it can't be locked out.
- Custom roles: any admin creates, renames, edits permissions, deletes
  (`/roles`, permission `user:manage`). Deleting is refused (409) while a
  user has the role; reassign first.
- Permission keys come from the code catalog. The api refuses a key it does
  not know (`unknown_permission`), and a start-up sync removes rows whose key
  left the catalog.
- Last admin: the rule counts users whose role is `admin`.

Permissions today (the built-ins' grants; `users/domain/permissions.ts`):

| Permission          | admin | editor | author |
| ------------------- | :---: | :----: | :----: |
| `post:edit:own`     |   x   |   x    |   x    |
| `post:edit:any`     |   x   |   x    |        |
| `post:publish`      |   x   |   x    |        |
| `asset:upload`      |   x   |   x    |   x    |
| `asset:manage:any`  |   x   |   x    |        |
| `shop:manage`       |   x   |   x    |        |
| `product:edit:any`  |   x   |        |        |
| `rating:delete:any` |   x   |        |        |
| `contact:manage`    |   x   |   x    |        |
| `user:manage`       |   x   |        |        |
| `settings:manage`   |   x   |        |        |
| `page:manage`       |   x   |   x    |        |
| `geo:manage`        |   x   |   x    |        |
| `audit:read`        |   x   |        |        |

- Tags are managed with `post:publish`. Posts and the media library need
  `post:edit:own` or `post:edit:any`, resp. `asset:upload` or
  `asset:manage:any`, to open at all.
- Checks name a permission, not a role: `@RequirePermission('post:publish')`
  on controllers and resolvers, and the same key in each context's domain.
  `users/permissions.spec.ts` runs them against the catalog.
- The access token carries `roleId`. The api resolves it to a permission set
  through `RoleRegistry`, an in-memory cache dropped when a role changes, so
  most checks need no query and a role edit applies within seconds.
  `:own` checks compare the owner with `sub`.
- Several roles per user: not built; `user_roles` would replace
  `users.role_id`.

## Not built yet

- OAuth identities (Google, GitHub). Link to an existing user by email only
  when the provider says the email is verified.
- Email verification (`email_verified_at` is never set).
- Per-device sessions (a device list, signing out one device, refresh
  rotation with reuse detection): a `user_sessions` table with opaque
  refresh tokens, proposed in `sessions.md`. `token_version` only revokes
  everything at once.
- `last_used_at` on identities is never updated.

## Open questions

- Decide: `Secure` cookies only in production; fine for local http, but
  a staging box without `NODE_ENV=production` sends them in clear.

- Purge soft-deleted users after a retention period, or keep them forever?
