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
