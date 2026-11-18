# Password reset

"Forgot password?" for users with a `password` identity: they ask for a
link by email, open it, and set a new password. No schema change: the link
carries a signed token. A reset bumps `users.token_version`, signing out
every session (see Not built yet).
Builds on `index.md` (identities, sessions) and `../mail`.

## Flow

1. `/login` links "Forgot password?" to `(site)/(auth)/forgot-password`:
   one email field.
2. `POST /auth/password/forgot { email }` (public) always answers 204, so
   it never tells whether an account exists. When a live, active user with
   a `password` identity has that email (case-insensitive), it mails a link
   to `{PUBLIC_WEB_URL}/reset-password?token=...`.
3. `(site)/(auth)/reset-password` reads `token` and asks for the new
   password twice (the match is checked by the web app's action, not the
   api).
4. `POST /auth/password/reset { token, password, notify }` (public):
   checks the token, sets the new hash, answers 204.
   The page then sends the user to `/login` with "Password changed; sign
   in".

## Token

A JWT like the other session tokens (`index.md`, Sessions): its own HKDF
key, `typ: 'password_reset'`, `kid` rotation.
- Claims: `sub` (user id), `typ`, `exp` (1 hour), and `pwf`: the first 16
  hex characters of `sha256(passwordHash)` at the time it was issued.
- Single use without storing anything: once the password changes, the
  hash changes, so `pwf` no longer matches and every earlier link (including
  this one) stops working. A change through `PUT /users/me/password` voids
  open links the same way.
- `pwf` is a fingerprint of a hash, never the hash; the token says nothing
  useful about the password.
- The token travels in the link's query string; the reset page is
  `noindex` and sends `Referrer-Policy: no-referrer` so it doesn't leak to
  other sites.
- Trade-off: issued links can't be listed or cancelled one by one. If that
  is ever needed (an audit trail), switch to a `password_resets` table with
  a hashed token, `expires_at` and `used_at`.

## Rules

- Requesting:
  - Only users with `status = 'active'`, not deleted, and a `password`
    identity get mail. OAuth-only users get nothing: a reset would add a
    first password to someone's OAuth account.
  - The answer and its timing must not depend on the account: the email is
    sent after the response (not awaited), and mail errors
    (`mail_not_configured`, `mail_delivery_failed`) are only logged.
  - Rate limits: 5 per 15 minutes per IP, and one request per email address
    per 5 minutes (`@RateLimit` per account, in memory), so the form can't
    flood someone's inbox. The second answers 429 whether or not the account
    exists.
- Resetting:
  - The token must verify (signature, `exp`, `typ`) and its user must still
    be active with a `password` identity whose fingerprint equals `pwf`;
    otherwise `invalid_reset_token` (400), one code for every case.
  - The new password follows the usual rules (8 to 256 characters,
    `weak_password`).
  - Sets the hash and bumps `users.token_version`, so every existing
    session is signed out (`User.revokeSessions`). Doesn't sign the user in: they log in with the new password.
  - `notify` (boolean, required): `true` also mails "your password was
    changed" to the account's address, sent after the response and only
    logged on failure, like the link. The web app sends `true`; a script
    or another client says what it wants.
  - It also proves the user can read mail at that address, but doesn't set
    `email_verified_at`; that waits for real email verification.

## Changing a password (signed in)

`PUT /users/me/password { currentPassword, newPassword, notify }`: `notify`
(boolean, required) mails "your password was changed" as above when
`true`. Still 204; other sessions stay signed in. The web app sends `true`.
The change voids open reset links too (`pwf`).

## Code

- **users**: `ResetPasswordCommand(userId, newPassword, notify)` sets the hash and
  revokes sessions (`User.changePassword` + `User.revokeSessions`; no
  current password needed: the token proved it).
  `FindPasswordResetAccountQuery({ email } | { userId })` returns
  `{ userId, email, name, fingerprint }`, or null unless
  `User.canResetPassword` (active, not deleted, a password identity).
  `notify` on `ResetPasswordCommand` and `ChangePasswordCommand` sends the notice (`password-changed-notice.ts`).
- **auth**: `RequestPasswordResetCommand(email)` and
  `ResetPasswordWithTokenCommand(token, newPassword, notify)`; the token type in
  `TokenService` (`issuePasswordReset`, `verifyPasswordReset`). It reaches
  users and mail only through the buses (`ResetPasswordCommand`,
  `SendEmailCommand`), never their repositories.
- **Mail**: plain text plus a simple HTML version. Subject "Reset your
  password"; body: the link, that it expires in an hour, and "if you didn't
  ask for this, ignore this email; your password hasn't changed".
- **Config**: `PUBLIC_WEB_URL`, the web app's public URL with its base path
  (e.g. `https://example.com/my-cms`; dev `http://localhost:3002/my-cms`),
  the same value the web is built with (`webUrl()` in
  `common/infrastructure/web-path.ts`). Without an origin in it (unset, or
  just a path): reset requests are logged and no mail is sent.
- **Web**: the two pages and their server actions under `(site)/(auth)`,
  and the link on `login`.

## Routes

| Route                        | Who               | Does                                                     |
| ---------------------------- | ----------------- | -------------------------------------------------------- |
| `POST /auth/password/forgot` | public, 5/15 min  | mails a reset link if the account can reset (always 204) |
| `POST /auth/password/reset`  | public, 10/15 min | sets a new password from a token; `notify` (204)         |
| `PUT /users/me/password`     | signed in         | now takes `notify` (204)                                 |

Errors: `invalid_reset_token` (400), `weak_password` (400).

## Not built yet

- Signing out other sessions on a self-service password change. A reset (forgot link) bumps `users.token_version`, so every refresh
  token fails (access tokens last up to 15 minutes). Changing your own
  password doesn't, so sessions opened with the old password keep working
  until their refresh token expires (up to 30 days).
