# Brevo for transactional e-mail

Implementer: `expert-developer`. Gate before merge: `legal-security-reviewer` (customer e-mail address and order content go to a third-party processor, plus a secrets scan). Background and the provider comparison: `EMAIL_SETUP.md`. None of this is legal advice.

## Goal

Order confirmation e-mails go out through Brevo (France, data in France/Germany) on the dev server (`shop.bike-one.dev`, bee5) and later on production. Newsletters through the same account are a separate, later feature (see Out of scope).

## What exists

- `src/workflows/order-confirmation/` builds `{ subject, text, html }` and calls `sendNotificationsStep` with `channel: "email"`, retries 3 times, and stores `order.metadata.confirmation_email = { status, at }`. `src/subscribers/order-placed-confirmation.ts` triggers it; `src/api/admin/orders/[id]/resend-confirmation` resends.
- `medusa-config.ts` registers the notification module with the provider named in `NOTIFICATION_PROVIDER_RESOLVE` and options `{ channels: ["email"], api_key: NOTIFICATION_API_KEY, from: NOTIFICATION_FROM }`. Without all three, dev uses `notification-local` and production refuses to start (unless `NOTIFICATION_ALLOW_NONE=true`, which is set on bee5 today).
- Medusa ships a SendGrid provider only. There is no Brevo provider, so a small custom one is needed.

## Decision: Brevo HTTP API with `fetch`, not SMTP

Brevo offers an SMTP relay (`smtp-relay.brevo.com:587`) and a REST API (`POST https://api.brevo.com/v3/smtp/email`, header `api-key`). Use the REST API:

- Node 24 has `fetch`: **no new dependency** (SMTP would add `nodemailer`, which needs its own dependency review).
- The provider takes the same two options the config already passes (`api_key`, `from`): **`medusa-config.ts`, the subscriber guard and the production fail-fast checks stay as they are**. SMTP would need host, port and user options plus changes in all three places.
- The response gives a `messageId` we can log and store.

Trade-off: the API is Brevo-specific, so switching provider later means another small module (about 60 lines). Accepted.

## Tasks

### 1. Provider module `src/modules/brevo`

Files: `index.ts` (`ModuleProvider(Modules.NOTIFICATION, { services: [BrevoNotificationService] })`), `service.ts`. Model it on `node_modules/@medusajs/notification-sendgrid/dist/services/sendgrid.js`.

- `static identifier = "brevo"`; `static validateOptions(options)` throws unless `api_key` and `from` are non-empty strings.
- `send(notification)`:
  - Requires `notification.content` with `subject` and `html`; otherwise `MedusaError.Types.INVALID_DATA` (we never use Brevo templates; do not add template support).
  - Sender: parse `notification.from || options.from`. `"BikeOne <shop@mail.bike-one.dev>"` becomes `{ name, email }` (name at most 70 characters), a bare address becomes `{ email }`.
  - Body: `{ sender, to: [{ email: notification.to }], subject, htmlContent, textContent }`. The workflow already supplies `text`; send it (better spam score, plain-text clients).
  - `fetch` with `AbortSignal.timeout(15_000)`, header `api-key`, `content-type: application/json`.
  - 201: return `{ id: messageId }`.
  - Any other status or a network error: throw `MedusaError.Types.UNEXPECTED_STATE` with the HTTP status and Brevo's `code` and `message` (documented codes include `invalid_parameter`, `missing_parameter`, `unauthorized`, `not_enough_credits`). The message must never contain the recipient, the subject, the body or the API key (`src/lib/scrub.ts` is the existing helper; the workflow already scrubs what it logs).
- No attachments, no `cc`/`bcc`, no scheduling, no templates. Throw a clear error if `attachments` are passed instead of silently dropping them.

### 2. Reply-To (decided 2026-11-17: do it)

The From address lives on a sending sub-domain with no mailbox, and customers will answer order mails. Add `reply_to` to the provider options and send it as Brevo's `replyTo` object (`{ email, name? }`, parsed like the sender); wire `NOTIFICATION_REPLY_TO` into the options in `medusa-config.ts` (one line). Dev: `NOTIFICATION_FROM="BikeOne <bestellung@mail.bike-one.dev>"`, `NOTIFICATION_REPLY_TO=info@bike-one.dev` (Cloudflare Email Routing forwards that to `info@bike-one.de`). Production uses the same shape on the real domain (see `EMAIL_SETUP.md`).

### 3. Tests

`src/modules/brevo/__tests__/service.unit.spec.ts` (picked up by `npm run test:unit`), with a fake `fetch`:

- payload mapping (sender with and without a name, `to`, `htmlContent`, `textContent`),
- 201 returns the message id,
- 400 and `unauthorized` become an error that contains the code and does not contain the recipient or the API key,
- network error and timeout become an error,
- missing `content` and passed `attachments` are rejected,
- `validateOptions` rejects an empty key or `from`.

### 4. Wire and document

- `medusa-config.ts`: no change, except task 2 if taken. Add a comment next to `NOTIFICATION_PROVIDER_RESOLVE` naming `./src/modules/brevo`.
- `.env.template`: set the example to `NOTIFICATION_PROVIDER_RESOLVE=./src/modules/brevo` and say the key is a Brevo v3 API key (not an SMTP key).
- `EMAIL_SETUP.md`: replace the "SMTP" and "Resend" wiring sections with the Brevo API wiring; keep the comparison.
- `REVIEW_TASKS.md` server checklist: the mail variables line points at Brevo and at the authorised-IP step below.
- `PLAN.md`: add a Task entry and link this folder; `TODO.md`: open items (Brevo account, DNS, key, test order, production plan upgrade).
- When the feature is done and verified, move what is still true into `EMAIL_SETUP.md` and `planning/3-Architecture_Tech_Stack/decisions.md`, then delete this folder (repo rule).

### 5. Account setup (the owner, not code)

1. Create the Brevo account (the owner's own login; never share the password or the key in chat or git). Brevo may review new accounts before sending is allowed; start early. Accept the DPA (GDPR Art. 28) in the account settings.
2. Authenticate the sending domain. Dev and production both use a `mail.` sub-domain (dev: `mail.bike-one.dev`; it keeps the apex records of Cloudflare Email Routing for `info@bike-one.dev` untouched): Brevo, Senders, Domains & dedicated IPs, Domains, Add a domain; add the records it shows (Brevo code TXT, DKIM, DMARC) in Cloudflare DNS with the proxy off ("DNS only"). Add a sender on that domain.
3. Create an **API key** (v3), not an SMTP key. Put it only in the server's `.env`.
4. **Authorised IPs:** Brevo can block API calls from IP addresses that are not on the account's authorised list ("Block unknown IP addresses" under Settings, Security, Authorised IPs; separate switches for API and SMTP keys; I could not confirm the default for new accounts). bee5's outbound IP changes, so on the dev account leave API-key blocking **off** (or use the automatic-authorisation mode, if the account offers it), and rely on the key staying secret (root-only `.env`, never in git). Production gets a fixed outbound IP, that IP on the list, and blocking **on**. A blocked call fails with `unauthorized`; check the switch before the first test.
5. Later newsletters will use a separate `news.` sub-domain; nothing to do now.

### 6. Deploy and verify on bee5

1. On bee5 in `backend/apps/backend/.env`: set `NOTIFICATION_PROVIDER_RESOLVE=./src/modules/brevo`, `NOTIFICATION_API_KEY`, `NOTIFICATION_FROM="BikeOne <shop@mail.bike-one.dev>"`, and remove `NOTIFICATION_ALLOW_NONE`. Then `make deploy-dev` (code) and, for later env-only changes, `sudo systemctl restart bikeone-backend`.
2. The log shows no `No e-mail provider configured` and no `SKIPPED`.
3. Place a test order on `https://shop.bike-one.dev` with an address the owner controls (never real customer data). The mail arrives, is not in spam, and "Show original" shows DKIM, SPF and DMARC pass for the `mail.` domain.
4. `order.metadata.confirmation_email.status` is `sent`; Brevo's Transactional, Logs shows the message as delivered.
5. Failure path: set a wrong API key, place an order, confirm status `failed` after 3 attempts, the order itself is unaffected, and the log line contains the Brevo error code but no address. Restore the key, then `POST /admin/orders/<id>/resend-confirmation` with body `{}` returns `sent`.
6. Run the secrets scan (`legal-security-reviewer`) over the commits before pushing.

## Out of scope

- Newsletters: needs double opt-in, consent records, unsubscribe handling, the Datenschutz text and a `news.` sub-domain, and the free plan's 300 mails/day cap is shared with transactional mail, so move to a paid plan first. The storefront form stays off (`NEXT_PUBLIC_NEWSLETTER_ENABLED=false`).
- Bounce and complaint handling. A `sent` status means Brevo accepted the message, not that it was delivered. Under the AGB the contract is formed when the confirmation is sent, so a later hard bounce matters. A Brevo webhook (hard bounce, blocked) that flags the order is the follow-up; record it in `TODO.md`.
- Other mail types (shipping, pickup ready, password reset) and Brevo templates.
- Delivery-time dashboards or monitoring beyond the log prefix `[notification] order confirmation`.

## Open questions

1. ~~From and Reply-To mailbox~~ Decided: dev Reply-To `info@bike-one.dev`, forwarded to `info@bike-one.de` by Cloudflare Email Routing.
2. **Production domain.** Which domain will production send from (the real shop domain's `mail.` sub-domain)? Brevo's domain records must be added for it when production exists.
3. **Plan.** The owner will leave the free plan before go-live (decided 2026-11-17). Until then 300 mails/day is plenty for test orders.
4. **Free-plan footer.** Whether Brevo's "Sent with Brevo" footer is added to API transactional mail on the free plan is unverified; check the first test mail.

## Done when

- Unit tests pass, `tsc` and lint are clean, no new dependency in `package.json`.
- Steps 6.3 to 6.5 pass on bee5.
- `legal-security-reviewer` returns Pass or non-blocking notes only.
- Docs updated as in task 4 and this folder is removed once its facts live there.
