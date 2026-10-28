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
- **Webhook signature verification — unresolved security gap.** The installed `@sumup/medusa-plugin` (v0.1.0) does not verify the authenticity of incoming webhooks at `/hooks/payment/sumup_sumup` — it trusts `event_type`/`id` in the payload with no signature/HMAC check. Fine for sandbox testing in isolation, but **must be fixed (patch/fork the provider, or add a server-side re-check against SumUp's API) before any real/live credentials are ever used.** Route that fix through the `legal-security-reviewer` subagent.

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
