# SumUp sandbox setup

How to activate the already-built SumUp payment provider using your SumUp test account. Backend code is done and gated — this is only credentials + a few manual steps. Background: `PLAN.md` Task 5, `TODO.md`.

## 1. Get the credentials from your SumUp sandbox account

1. Log in at [me.sumup.com](https://me.sumup.com).
2. Confirm you're on a **sandbox** merchant account (SumUp shows a visible warning banner when you are; sandbox accounts never move real money). If you only have a live account, create a sandbox one under **Developer Settings → Sandboxes** in the dashboard.
3. **API key**: profile menu → **Settings** → **For Developers** → **Toolkit** → **API Keys** → **Create**. Give it a name, then copy/download it immediately — SumUp does not show it again. A sandbox/test key is prefixed `sk_test_` (vs `sk_live_` for production).
4. **Merchant code**: shown top-right of the dashboard below your company name, and also under **Settings → Business settings** (account name + Merchant ID).

Menu labels shift between SumUp dashboard versions — if you don't see these exact names, search Settings for "API" / "Developer" / "Merchant ID".

## 2. Fill in `.env`

File: `backend/apps/backend/.env` (gitignored, never commit it). The template already has the keys — just fill the two blank ones:

```bash
SUMUP_API_KEY=sk_test_...   # from step 1.3
SUMUP_MERCHANT_CODE=XXXXXXXX                      # from step 1.4
SUMUP_CHECKOUT_MODE=hosted                        # leave as-is, matches the storefront flow built so far
MEDUSA_BACKEND_URL=http://localhost:9000          # leave as-is for local dev
STOREFRONT_URL=http://localhost:8000              # leave as-is for local dev
```

That's it on the config side — `medusa-config.ts` only registers the `sumup` provider/plugin when both `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE` are non-empty, so nothing else needs to change to turn it on.

Restart the backend (`make backend` or `make dev`) after editing `.env`.

## 3. Enable the provider in Medusa Admin

Registering the provider in code does **not** auto-enable it for a region.

1. Open `http://localhost:9000/app` (admin dashboard).
2. **Settings → Regions** → your EUR region.
3. **Payment Providers** → enable `sumup`.
4. Verify it's live: `GET /admin/payments/payment-providers` should list `pp_sumup_sumup` as enabled.

## 4. What's still missing before this is actually usable end-to-end

These are not part of "drop in credentials" — they're separate follow-up work already tracked in `PLAN.md`/`TODO.md`:

- **Storefront return page.** The plugin redirects to `${STOREFRONT_URL}/checkout/sumup/return` after hosted checkout — that route doesn't exist in the storefront yet. Without it, a sandbox payment will complete on SumUp's side but the customer hits a 404 coming back.
- **Webhook authenticity.** SumUp signs no webhooks, so there is no signature to verify. The plugin ignores the payload and re-fetches the checkout from SumUp with our key, so a forged call cannot mark anything paid. Our provider wrapper (`src/modules/sumup-payment`) registers a per-session callback URL `.../hooks/payment/sumup_sumup?ref=<payment session id>&wh_token=<HMAC-SHA256(SUMUP_WEBHOOK_SECRET, session id)>`; the route answers 401 without a valid token (timing-safe, fail closed; secret at least 32 characters in production). The URL is echoed into the payment session data the shopper can read, but it carries only that session's token, never the shared secret, so a leaked token only allows re-checking that one session (it does not expire). Before the route queues an event it re-checks, for a paid checkout, that SumUp's session id and amount equal the Medusa payment session's and the URL's `ref` (otherwise nothing is captured, error logged), and the job `sumup-reconcile-sessions` completes carts whose paid checkout never reached us by webhook (and logs an error if a capture left no order). Sessions created before this change still carry the old `wh_secret` URL, readable by those shoppers: `SUMUP_WEBHOOK_SECRET` MUST be rotated in the same restart that deploys this code on every environment that created SumUp sessions before it (the dev server), because the old value is now the HMAC key; a secret that was ever stored in session data must never be reused as a live key (`REVIEW_TASKS.md`). Webhook calls are rate limited per `ref` (20 per minute), malformed checkout ids are dropped before any SumUp call, and a paid-but-mismatching checkout is logged (`webhookRejected`, `reconcilePaidMismatch`, `reconcileCapturedWithoutOrder`: alert on these). Everything in this paragraph is unit-tested only; not yet verified on a running server: provider boot registration, 401 without a valid token on dev (dev still runs the old code), whether SumUp preserves the `ref`/`wh_token` query on callbacks, and the type `query.graph` returns for `payment_session.amount`. Before live credentials: run the checklist below on the sandbox (including a paid checkout with the webhook suppressed, one delivered twice and one whose cart total changed after the checkout was created), use a different secret per environment, and get the `legal-security-reviewer` verdict. Details: `PLAN.md` Task 5.

## 5. Sandbox test checklist (once 2–4 are done)

Run these against the sandbox account before considering the integration verified:

- Hosted checkout happy path (card)
- Payment Widget flow, if used
- Webhook-driven order status update actually fires
- Full refund
- Partial refund
- **Deliberate failure test:** any checkout with amount `11` (in any currency) always fails by design — use it to verify your failure-handling path
- Expired / canceled checkout handling

## Sources

- [SumUp API Keys](https://developer.sumup.com/tools/authorization/api-keys/)
- [SumUp Authorization overview](https://developer.sumup.com/tools/authorization/authorization)
- [SumUp Online Payments guides](https://developer.sumup.com/online-payments/guides/)
