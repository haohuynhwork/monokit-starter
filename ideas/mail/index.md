# Mail

Outgoing email. No tables: the transport is the `mail` setting
(`ideas/configs`), read on every send so a change applies without a restart.
A null `mail` means email is off.

## Drivers

`DriverMailer` (`mail/infrastructure`) switches on `mail.driver`:

| driver   | how                                                                  | fields                                           |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| `smtp`   | nodemailer; `secure` = TLS from the start (465), else STARTTLS (587) | `host`, `port`, `secure`, `username`, `password` |
| `resend` | `POST https://api.resend.com/emails`, 20 s timeout                   | `apiKey`                                         |
| `log`    | writes From/To/Subject/text to the api log                           | none                                             |

All drivers send from `fromName <fromEmail>`.

## Sending

- `SendEmailCommand({ to, subject, text, html? })` is the only way to send.
  It checks `to` and that `mail` is set (so callers still get
  `invalid_recipient` / `mail_not_configured` at once), then queues the
  email (see Queue) and returns. Delivery happens in the worker.
- Other contexts execute it through the `CommandBus` (e.g. pages'
  `SendContactMessageHandler` for contact-form blocks), never the mailer.
- `POST /mail/test` `{ to?, sync }` (admin): `SendTestEmailCommand` sends a
  fixed test email; `to` defaults to the admin's own email. `sync`
  (boolean, default `true`) picks the path:
  - `true`: skips the queue and delivers in the request, so a wrong setting
    shows as `mail_delivery_failed` right away instead of in the logs after
    retries.
  - `false`: goes the way real mail does (`SendEmailCommand`: checked now,
    delivered by the worker), to test the queue too.
    Returns `{ to, queued }`; `queued` is false when it was delivered already
    (`sync`, or no Valkey). The panel's Settings shows "Through the queue" as
    a checkbox, off by default.

## Queue

BullMQ on Valkey (the open-source Redis fork; same protocol), so a provider outage or an api restart doesn't lose mail.
- One queue, `mail`; a job is the `EmailMessage` only. The transport
  (and its secrets) is read when the job runs, never stored in Valkey, so a
  settings change also applies to queued mail.
- Worker: in the api process (`@nestjs/bullmq` processor), concurrency 5.
  It re-reads `mail`, then calls the `MAILER`.
- Retries: 6 attempts, exponential backoff from 30 s (about 30 minutes in
  all). `mail_delivery_failed` retries; `invalid_recipient` and
  `mail_not_configured` (mail turned off after queueing) fail at once
  (BullMQ `UnrecoverableError`).
- Kept: completed jobs 1 hour (at most 1000), failed jobs 7 days, for
  debugging with any BullMQ dashboard. Jobs hold message bodies (reset
  links, contact messages), so they don't linger longer than that; a reset
  link has expired after an hour anyway.
- While Valkey is down, queueing fails at once (the queue's connection has
  `enableOfflineQueue: false`, so nothing is buffered and sent later) and
  `SendEmailCommand` throws `mail_delivery_failed`; a slow Valkey is capped
  at 5 s. The worker's own connection waits and reconnects.
- Failures are logged by the worker (job id, recipient, attempt, reason);
  never the body.
- Config: `VALKEY_URL`, e.g. `valkey://localhost:6379`; `valkeys://` for
  TLS. `redis://` / `rediss://` are accepted too (hosted services often
  hand those out); any other scheme stops the api at start. Valkey speaks
  the Redis protocol, so ioredis connects unchanged. Prod compose defaults
  it to its own service (`valkey://valkey:6379`); a value in `.env` wins.
  `BULLMQ_PREFIX` starts every key (`<prefix>:mail:...`; default `bull`,
  `.env.example` sets `my-cms`; letters, digits, `_ . -` only, else the api
  stops at start), so apps sharing a Valkey stay apart.
  Changing it orphans jobs still queued under the old prefix.
  Unset: no queue; `SendEmailCommand` delivers in the request as before and
  logs once at start that mail isn't queued. Tests and a minimal setup need
  no Valkey.
- Client: iovalkey (Valkey's maintained fork of ioredis), plugged into
  BullMQ with `RedisConnection.clientFactory`; BullMQ still opens and
  closes every connection. No ioredis dependency.
- Compose: a `valkey` service (`valkey/valkey:8-alpine`) on the backend
  network, set from `.env` like `db`: `VALKEY_PASSWORD` (`--requirepass`;
  required in prod, optional in dev), `VALKEY_MAXMEMORY` (0 = no cap). AOF
  on, so queued jobs survive a restart; `maxmemory-policy noeviction`, which
  BullMQ requires (at the cap, queueing fails rather than jobs vanishing).
  Dev publishes `VALKEY_PORT`; prod publishes nothing, like `db` (inspect
  with `docker compose -f compose.prod.yaml exec valkey valkey-cli`).

## Errors

| code                   | kind           | when                            |
| ---------------------- | -------------- | ------------------------------- |
| `invalid_recipient`    | invalid (400)  | `to` isn't an email address     |
| `mail_not_configured`  | conflict (409) | `mail` setting is null          |
| `mail_delivery_failed` | conflict (409) | provider refused or unreachable |

## Notes

- With `VALKEY_URL`, callers never wait on the provider; without it, sending
  is synchronous inside the caller's request. There's no sent-mail log.
- Secrets (`password`, `apiKey`) are sealed in configs and unsealed only in
  the api; mail never stores them.

## Not built yet

- Templates, a sent-mail log, an admin view of failed jobs.
- A separate worker process (`MAIL_WORKER=false` on api instances) when
  sending should scale apart from the api.
