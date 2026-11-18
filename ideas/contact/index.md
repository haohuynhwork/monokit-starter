# Contact

Messages sent through the `contactForm` page block. Pages owns the form
(which block, which fields, the checks; `../pages/index.md` "Contact
form"); this context stores each message and mails it, and the panel has an
inbox. Section 1 is built; 2 to 6 are under consideration.

## 1. Inbox: `contact_messages` (built)

Store every submission first, then mail it. Nothing is lost, and editors
read and triage messages in the panel.

```sql
CREATE TABLE contact_messages (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Only the fields the block listed; email or phone is required
    name        VARCHAR(255),
    email       VARCHAR(320),
    -- The block's limit
    phone       VARCHAR(50),
    -- Optional block field (one line)
    subject     VARCHAR(255),
    message     TEXT,
    -- 'text': typed by a visitor; 'html': added in the panel (sanitized)
    message_format TEXT NOT NULL DEFAULT 'text' CHECK (message_format IN ('text', 'html')),
    -- IPv4 or IPv6 text
    ip          VARCHAR(45),
    user_agent  VARCHAR(512),
    status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'read', 'replied', 'spam', 'archived')),
    -- NULL: mail off or failed; the message is still in the inbox
    mailed_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Soft delete
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX contact_messages_inbox ON contact_messages (status, created_at)
    WHERE deleted_at IS NULL;
```

In the contract: `ContactMessage` (`packages/db/src/prisma/contracts/
contact.prisma`), camelCase like the rest. No link to the page or block
for now.
- Context `contact` (`apps/api/src/contact/`). Pages'
  `SendContactMessageHandler` checks the message against the block, then
  runs `SubmitContactMessageCommand`: insert the row, then queue the mail
  (`SendEmailCommand`, to the block's `to`, else the site's sender address)
  and set `mailedAt`. Mail off or failing is logged and leaves `mailedAt`
  NULL; the visitor still gets 204, so `contact_unavailable` is gone.
- `subject`: on by default in new blocks; optional, one line, at most 255 characters;
  the mail subject is `Contact: <subject>`, else
  `Message from "<page title>"`.
- `ip` is `req.ip` (the web forwards the visitor's address); `userAgent` is
  the visitor's browser, forwarded by the web contact action.
- Honeypot hits are not stored (answered as if sent).
- Api (admin, editor; `contact:manage`):
  - `GET /contact/messages?status=&limit=&offset=` newest first, paginated;
  - `GET /contact/messages/counts` per status, for the tabs;
  - `GET /contact/messages/:id` with `ip` and `userAgent`;
  - `POST /contact/messages/:id/open`: `new` becomes `read`, others stay;
  - `PATCH /contact/messages/:id { status }` any status;
  - `DELETE /contact/messages/:id` soft delete.
- Panel `panel/contact` ("Messages" under Content): status tabs with counts
  (default `new`, plus All), table, pager. The detail page marks a new
  message read from the browser (not while rendering, so link prefetches
  don't count), shows the details, and has Reply by email (a `mailto:`
  link that also marks it `replied`), Mark read / replied / spam /
  archived, and Delete.

### Added by hand (built)

Staff can record a message that came in another way (a phone call, an
email to someone) at `/panel/contact/new`: `POST /contact/messages`
(admins, editors). Same rule as the form (an email or a phone), any
status (default `read`), nothing mailed. The message is written in the
rich-text editor (standard variant), sanitized like post bodies and stored
with `message_format = 'html'`; the panel renders those as HTML and
visitors' messages as plain text.

## 2. Editor notification

Each new message notifies users with `contact:manage` through
`../notification` (an event from the contact context; the panel shows the
unread count). Pairs with the inbox.

## 3. Auto-reply to the visitor

Per-block toggle (`autoReply: boolean`, optional text): "we got your
message". Only when the visitor gave an email. Risk: anyone can type
someone else's address and make the site mail them, so keep the text fixed
by the editor (never echo the visitor's message) and keep the rate limit.

## 4. Stronger spam protection

Only if the honeypot and rate limit stop being enough:
- timing check: reject forms submitted under ~3 s after render (a signed
  timestamp in a hidden field);
- Cloudflare Turnstile or hCaptcha, keys in `../configs`;
- the `spam` status from the inbox gives data to judge it.

## 5. Privacy

Messages hold personal data (name, email, phone, IP).
- Retention job: hard-delete messages older than a configurable period
  (e.g. 12 months; `../configs`), and soft-deleted ones after 30 days.
- Optional consent checkbox on the block (`consentText?`), stored as
  `consented_at` when shown.

## 6. Custom fields (later)

Dropdown, checkbox, etc. turn the block into a form builder
(fields as JSON on the block and a `data JSONB` column instead of fixed
columns). Hold off until there is a real need.

## Recommendation

Next: 2 if editors work in the panel (also a sidebar badge for `new`).
The rest when asked.
