# SumUp webhook: close the "no signature verification" item

## Where we really are (checked 2026-11-17, not the docs)
PLAN.md Task 5, TODO.md, SUMUP_SETUP.md and CLAUDE.md say the plugin "decides the webhook action purely from the
payload". That is outdated. Installed `@sumup/medusa-plugin` 0.1.0, `getWebhookActionAndData`
(`providers/sumup/service.js`):
1. only accepts `event_type === "CHECKOUT_STATUS_CHANGED"` with an `id`
2. calls `retrieveCheckout(id)` against SumUp's API with OUR key
3. derives the action from the API's checkout (`PAID` or a `SUCCESSFUL` transaction -> SUCCESSFUL, `PENDING`,
   `FAILED`, `EXPIRED` -> CANCELED) and takes `session_id` (checkout_reference) and amount from it, never from the body
So a forged body cannot mark an order paid: worst case it triggers a status re-check. A checkout id of another
merchant is not retrievable with our key. SumUp itself documents no webhook signature; its docs say to confirm by
calling the API (https://developer.sumup.com/online-payments/webhooks/). Cannot be fixed "by signing".

On top of that, `src/api/middlewares.ts` `verifySumupWebhookSecret` rejects every POST to
`/hooks/payment/sumup_sumup` without `?wh_secret=<SUMUP_WEBHOOK_SECRET>` (timing-safe, fails closed when unset;
the URL is registered as the checkout `return_url` in medusa-config.ts). The storefront return route
(`api/payment-return/sumup`) trusts only our own cart_id and runs `placeOrder`, which re-checks via the same path.

## What is still open (residual risk, none is "forgeable payment")
1. Secret travels in the query string: lands in reverse-proxy access logs and SumUp-side logs. Leak = anyone can
   trigger status re-checks (still no state forgery). Fix: redact `wh_secret` in the nginx/Caddy log format,
   rotate per environment, different secret for dev and live.
2. Never tested end to end with forged inputs (TODO says "route answers 401 without secret", nothing more).
3. No reconciliation: a lost webhook (retries stop after ~2 h: 1 min, 5 min, 20 min, 2 h) leaves a paid checkout
   with no order unless the customer returns through the redirect. Needs a job that re-checks pending sessions.
4. Replay/duplicate webhooks (SumUp retries, forged replays): must be idempotent, capture exactly once.
5. Amount/currency: confirm Medusa compares the captured amount to the session amount and the checkout's
   `checkout_reference` to the session id, not only "status is PAID".
6. Key hygiene: SumUp keys on this repo's server start `sup_sk`, no `sk_test_`/`sk_live_` marker, so nothing in
   code prevents a live key on dev. Add a startup log/guard that names the account mode if the API exposes it.
7. Docs say "unresolved security gap": wrong, and it blocks the go-live checklist for the wrong reason.

## Plan
1. Verify the claims by test (sandbox, dev server), results into this file:
   a. no/wrong `wh_secret` -> 401, nothing logged as payment event
   b. right secret + body with random checkout id -> SumUp 404, order/session unchanged
   c. right secret + real PENDING checkout id -> no capture
   d. real paid sandbox checkout, webhook delivered twice -> captured once, one order
   e. paid sandbox checkout with webhook suppressed -> shows item 3 (expected: stays unpaid today)
   f. checkout `amount: 11` (always fails) -> FAILED path, no order
2. Reconciliation job (`src/jobs/sumup-reconcile-sessions.ts`): payment sessions of provider `pp_sumup_sumup`
   pending for >10 min and <24 h, re-run the same status check, complete the cart through the existing workflow.
   Reuse `retrieveProviderCheckout` from the plugin service, do not call SumUp directly.
3. Unit test for `verifySumupWebhookSecret` (missing, wrong, equal-length wrong, right, unset env).
4. Log redaction for `wh_secret` (server config on the box, note in REVIEW_TASKS.md) and secret rotation step.
5. Config guard: refuse `NODE_ENV=production` start when SumUp is configured and `SUMUP_WEBHOOK_SECRET` is shorter
   than 32 chars; log (not print) which account the key belongs to if the API shows sandbox vs live.
6. Rewrite the four docs: state "payload is never trusted, status is re-fetched from SumUp; shared secret protects
   the route; reconciliation covers lost webhooks"; keep SUMUP_SETUP.md's go-live checklist (live key only after
   steps 1-5 and the reviewer verdict).
7. `legal-security-reviewer` before any live credential (payments, per CLAUDE.md).

## Not doing
Patching/forking the plugin (nothing to patch: it already re-fetches), custom HMAC (SumUp does not sign),
IP allow-listing SumUp (no published ranges found).

## Status 2026-11-17 (implementation pass)
Done in the working tree (not committed): steps 2-6.
- Step 2: `src/lib/sumup-reconcile.ts` + `src/jobs/sumup-reconcile-sessions.ts` (every 10 min, `SUMUP_RECONCILE_CRON`;
  no-op unless SUMUP_API_KEY, SUMUP_MERCHANT_CODE and SUMUP_WEBHOOK_SECRET are set). Uses the payment module's
  `getWebhookActionAndData` (the plugin's own re-fetch via `retrieveProviderCheckout`) and, only for SUCCESSFUL with
  matching session id and amount, `processPaymentWorkflow` (capture + completeCartWorkflow), same as the webhook subscriber.
- Step 3: `verifySumupWebhookSecret` moved to `src/lib/sumup-webhook-secret.ts` (so it is testable); unit spec added.
- Step 4: REVIEW_TASKS.md has log redaction and rotation steps.
- Step 5: medusa-config.ts refuses a production start with a webhook secret under 32 chars. The "log which account
  (sandbox/live)" part is NOT done: no API field known to us that shows it; key prefix `sup_sk` carries no marker.
- Step 6: PLAN.md Task 5, TODO.md, SUMUP_SETUP.md, CLAUDE.md, REVIEW_TASKS.md rewritten.

Step 1 results (automated, mocked SumUp client; no call to SumUp was made):
- 1a wrong/missing secret -> 401: unit spec; also live against local backend: POST without secret 401, with wrong secret 401.
- 1b random checkout id: `sumup-plugin-webhook` spec, SumUp error propagates, no action (so no capture, no state change).
- 1c body claims PAID but checkout PENDING -> action `pending`, no capture (spec); session id and amount come from the checkout, not the body (spec).
- 1d replay: not tested with real SumUp. Reconcile: a handled session is no longer `pending`, and Medusa's capture returns early when the payment is already captured (read in core source). Needs sandbox confirmation.
- 5 (amount/currency): the job compares SumUp's amount to the session amount; currency is not compared (the plugin does not expose it in the webhook result). Medusa's capture guards against over-capture.
Not run: 1c/1d/1e/1f against real SumUp. The local key has no sandbox marker, so no live API call was made from here.
Still open: those sandbox runs, the legal-security-reviewer verdict (step 7).

## Reviewer findings (legal-security-reviewer, 2026-11-17), open before live credentials
1. HIGH, confirmed in the local DB: `payment_session.data.raw_checkout.return_url` contains `?wh_secret=...` and the
   Store API returns payment session data to the cart owner. The shared secret is therefore readable by shoppers.
   Fix: strip `raw_checkout.return_url` from what is stored/returned, or derive a per-session token (HMAC of the
   session id) so a leaked URL is valid for one session only. Needs the plugin's `return_url` handling checked.
2. MEDIUM: Medusa's HTTP logger writes the full URL (with the secret) at log level `http`: keep it off or skip
   `/hooks/payment/`. (Added to REVIEW_TASKS.md.)
3. MEDIUM: the existing webhook path (core subscriber) never compares SumUp's amount/currency to the session
   amount; only the new job does. Follow-up: wrap the handling with the same check; test "change cart total, pay
   the old checkout" in the sandbox.
4. LOW: the job logs "completed" even if cart completion fails after the capture (`continueOnPermanentFailure`):
   money taken, no order, no alert. Add an order-exists re-check or an alert.
5. LOW: `scrubError` does not mask `SUMUP_API_KEY` / `SUMUP_WEBHOOK_SECRET`.
6. Sandbox run still needed: replay, webhook suppressed, `payment_session.amount` type from `query.graph`,
   duplicate `checkout_reference` when the plugin replaces a checkout. Key-mode guard (sandbox vs live) open.
Dev deploy judged not blocking: the change only adds a job that completes SumUp-confirmed PAID sessions.

## Fixes of the reviewer findings (2026-11-17, working tree, unit-tested only; no sandbox/live run)
1. FIXED (code). Per-session token: `src/modules/sumup-payment` wraps the plugin's provider (same id) and registers
   `return_url = <hook>?ref=<session id>&wh_token=HMAC-SHA256(SUMUP_WEBHOOK_SECRET, session id)`; the shared secret is
   in no URL. `verifySumupWebhookSecret` checks the token for the `ref`. The plugin lets `return_url` differ per
   checkout (`data.return_url ?? options.returnUrl`), so no stripping of stored data was needed; the wrapper also pins
   `redirect_url` and `checkout_reference` (a shopper could set them through the session `data`). Old sessions still hold
   the old URL: one-time secret rotation, steps in REVIEW_TASKS.md. Not run: a real checkout through the wrapper
   (the dev server was not touched; `medusa build` compiles it, the provider registration at boot is unverified).
2. NOT FIXED, mitigated. The framework's http logger skip list is hard-coded, no config. With finding 1 the logged URL
   holds only a per-session token. Proxy-log redaction is optional (REVIEW_TASKS.md).
3. FIXED (code). `verifySumupWebhookEvent` (src/lib/sumup-webhook-check.ts) runs before Medusa queues the event: paid
   checkout -> session id and amount must equal the payment session and the URL's `ref`, else 200 without queueing and an
   error log (session id only); lookup failure -> 503 (SumUp retries). Shares `sumupEventMatchesSession` with the job.
   Cost: one extra SumUp GET per webhook. Currency still not compared. Sandbox test "cart total changed, old checkout
   paid" still to run.
4. FIXED (code). The job re-queries cart_payment_collection / order_cart after the workflow; no order -> error log
   `reconcileCapturedWithoutOrder` (session id) and not counted. A session without a linked cart counts as completed.
5. FIXED (code). `scrubError` masks `SUMUP_API_KEY` and `SUMUP_WEBHOOK_SECRET` (values of 8+ characters).
Still open: sandbox run (replay, webhook suppressed, amount change, duplicate checkout_reference on replacement),
key-mode guard, reviewer re-check of this change.

## Second review round (2026-11-17, working tree, unit-tested only)
- Rate limit: `/hooks/payment/sumup_sumup` limited to 20/min per token-checked `ref` (repo's `rateLimit`, memory-backed);
  nginx `limit_req` note in REVIEW_TASKS.md. FIXED.
- Id validation: `body.id` must match `/^[A-Za-z0-9_-]{1,64}$/`, else 200 (no SumUp retry for a request that can never be
  valid), warn log `webhookRejected`, no SumUp call. FIXED.
- Silent mismatch: job logs error `reconcilePaidMismatch`; middleware already logs `webhookRejected`; runbook and alert
  keys in REVIEW_TASKS.md. FIXED.
- Wrapper: only allow-listed `data` keys reach the plugin (`checkout_mode`; on update the stored checkout keys); top-level
  `return_url` is stripped from stored data. DEVIATION: top-level `redirect_url` is kept, validated against the configured page
  and origin, because the storefront's return route needs the cart_id/country_code it carries (my first version pinned it to
  the bare URL, which would have broken the return flow; the storefront sends `data.redirect_url` only). Core stores the
  caller's original `data` at top level on create regardless of the wrapper (`{...input.data, ...provider data}`), so a shopper's
  junk keys persist in the row but are never passed to the plugin and are dropped on the next update. FIXED.
- Scrub test fixture no longer key-shaped. FIXED.
- Docs: rotation is MANDATORY in the same restart that deploys this code (old secret was readable and is now the HMAC key;
  never reuse a secret that was in session data); wording "a leaked token only allows re-checking that one session (it does
  not expire)". Still unverified: wrapper boot registration, 401 on dev after deploy, whether SumUp keeps the `ref`/`wh_token`
  query on callbacks, `query.graph` amount type, whether SumUp echoes `redirect_url`.
