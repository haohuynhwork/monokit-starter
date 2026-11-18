# Sessions (proposal, not built)

Status: under consideration. Today sessions are stateless JWTs with
`users.token_version` for revocation (`index.md` "Sessions"). Build this
only when one of these is needed:
- signing out one device (today logout signs out every device);
- a device list ("Chrome on Mac, last active 2h ago") with revoke per row;
- refresh rotation with reuse detection (a stolen refresh token is caught
  the next time either party uses it);
- an audit trail of sign-ins (IP, user agent, time).

Cost: a write on every login and refresh, a cleanup job, and opaque
refresh tokens instead of JWTs. Access tokens stay stateless JWTs (15 min).
Only auth infrastructure and `IssueTokensQuery` change; clients don't.

## Option A: one row per device (preferred to start)

```sql
CREATE TABLE user_sessions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- SHA-256 of the opaque refresh token (32 random bytes, base64url);
    -- never the token itself, so a db leak yields no usable tokens
    token_hash          BYTEA NOT NULL UNIQUE,
    -- The token before the last rotation: grace window and reuse detection
    previous_token_hash BYTEA,
    rotated_at          TIMESTAMPTZ,
    -- For the device list
    user_agent          VARCHAR(512),
    ip                  INET,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ
);

CREATE INDEX user_sessions_user_active ON user_sessions (user_id)
    WHERE revoked_at IS NULL;
CREATE INDEX user_sessions_expires ON user_sessions (expires_at);
```

A refresh presenting `previous_token_hash` within the grace window gets the
current successor; after it, it counts as reuse and the row is revoked.

## Option B: one row per rotation (token families)

Exact history and reuse detection, more rows.

```sql
CREATE TABLE user_sessions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- Every rotation of one login shares a family; reuse of an old token
    -- revokes the whole family
    family_id     UUID NOT NULL,
    token_hash    BYTEA NOT NULL,
    -- Set when rotated; points at the successor
    replaced_by   BIGINT REFERENCES user_sessions (id),
    user_agent    VARCHAR(512),
    ip            INET,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Sliding window, capped by family_expires_at
    expires_at    TIMESTAMPTZ NOT NULL,
    -- Hard limit for the whole login (e.g. 90 days), copied on rotation
    family_expires_at TIMESTAMPTZ NOT NULL,
    revoked_at    TIMESTAMPTZ,
    revoked_reason TEXT CHECK (revoked_reason IN
        ('logout', 'logout_all', 'reuse', 'password_reset', 'admin'))
);

CREATE UNIQUE INDEX user_sessions_token_hash_unique ON user_sessions (token_hash);
CREATE INDEX user_sessions_user_active ON user_sessions (user_id)
    WHERE revoked_at IS NULL AND replaced_by IS NULL;
CREATE INDEX user_sessions_family ON user_sessions (family_id);
CREATE INDEX user_sessions_expires ON user_sessions (expires_at);
```

## Flows

- Login: random token, insert a row (B: new `family_id`), return the token
  plus an access JWT carrying `sid` (the session id).
- Refresh: find by `sha256(token)`.
  - Missing, expired or revoked: 401.
  - Already rotated (A: matches `previous_token_hash` past the grace
    window; B: `replaced_by` set): reuse, so revoke (B: the whole family)
    with reason `reuse`, 401.
  - Else rotate in one transaction and return the new pair.
- Logout: revoke this session only. "Log out everywhere" and password
  reset revoke all of the user's sessions.
- Device list: the user's active rows; the current one matches `sid`.
- Cleanup: a daily job deletes rows expired more than 7 days ago (the
  extra week lets late reuse still be detected).

## Decisions

- Grace window (~30 s) after rotation: two tabs refreshing at once must
  not look like reuse.
- `sid` in the access token marks "this device" only; access tokens are not
  checked against the table per request (would add a lookup per request).
- `users.token_version` becomes redundant (revoking rows does its job);
  drop it once this ships.
