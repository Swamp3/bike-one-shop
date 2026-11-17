# TriCon sync review tasks

Findings from the code review of the TriCon/Tridata ERP sync (PLAN.md Task 14),
2026-11-02. Tick a task in the commit that fixes it.

## Must fix

- [x] **1. Paid flag and cancellation can never reach TriCon.**
  `steps/order-updates.ts`, `markOrderPaid` / `cancelOrder` only run once from
  their event. A failed call is never retried. Payment captured or order
  cancelled during an in-flight upload is also lost.
  Fix: re-check open orders in the order-state poll loop.
- [x] **2. Cancelling hides an order TriCon may already have.**
  `steps/order-updates.ts`, `cancelOrder` marks every non-`sent` order `skipped`,
  though a timed-out upload may have arrived, and it erases `conflict`.
  Fix: keep `conflict`, set `attention: "review"` when an attempt was made.

## Should fix

- [x] **3. TriCon outage over 4 hours stops order retries.**
  `helpers/backoff.ts`, 10 attempts add up to 243 minutes.
  Fix: `MAX_UPLOAD_ATTEMPTS = 48` (about 2 days).
- [x] **4. An order with no sync row is never uploaded.**
  The row is created by the `order.placed` handler; the event bus is in-memory,
  so a restart loses the event and the retry job only sees existing rows.
  Fix: retry job also uploads recent orders that have no row. A Redis event bus
  for production stays open: it is a hosting decision.
- [x] **5. New orders can stop being polled.**
  `steps/order-updates.ts`, sort by `state_checked_at ASC` puts empty values
  last, and failed polls never update the date.
  Fix: set the date on upload, on `mark_sent` and on failed polls.
- [x] **6. One empty TriCon list marks all bikes sold out.**
  `steps/link-products.ts`, the safety check needs both lists empty.
  Fix: also keep links when only the list feeding them is empty.
- [x] **7. The riskiest order paths have no test.**
  `cancelOrder`, `markOrderPaid`, the order-state loop.
  Fix: unit tests with a fake service and fake fetch, in
  `__tests__/order-updates.unit.spec.ts` (added with tasks 1, 2, 4, 5, 6).
  Still untested: the retry job's DB filter, which needs an integration test.

## Nice to have

- [x] **8. Messages that are no longer true.**
  `steps/upload-order.ts` conflict error, `steps/resolve-conflict.ts` lock comment.
- [x] **9. A DB error can look like a TriCon failure.**
  `helpers/tracked-call.ts`, a failed log write after a successful upload marks
  the order failed, and the retry then becomes a false conflict.
  Fix: a failed log write never changes the call's result.
- [x] **10. Unused code.**
  `TridataClient.downloadArtikel`, `downloadStockByArtikel`, the
  `TridataStockByArtikel` type, and `tridata_order_map.payload_hash`.

# Production readiness review (Strato CP4-18)

Second review, 2026-11-02, written for one netcup vServer (VPS 4000 G12.5), now
assumed to be one Strato CP4-18 dedicated server (Xeon E3-1230v6, 32 GB ECC, 2x480 GB
SSD RAID 1) running everything: Postgres, Redis, backend, storefront, reverse proxy.

- [x] **11. Postgres and Redis are open to the internet.**
  `docker-compose.yml` publishes 5432 (password `medusa`) and 6379 (no auth) on
  all interfaces, and Docker's published ports bypass ufw.
  Fix: bind to 127.0.0.1, take the Postgres password from the environment.
- [x] **12. Next.js has a critical remote code execution advisory.**
  next 15.5.26 is affected by GHSA-2464-fhr4-w9xw (image optimizer) and by
  cache-poisoning advisories for self-hosted sites. Fix: 15.5.28.
- [x] **13. Medusa pulls in vulnerable packages.**
  `npm audit` reported zod, body-parser, follow-redirects and multer as high.
  Fix: root `overrides` to fixed versions. The advisories on @medusajs packages
  come from these and other dependencies, so upgrading Medusa adds little. Staying
  on 2.21.1: 2.22.2 was tried and dropped, because npm split it between
  `node_modules` and `apps/backend/node_modules`, and the Store API then fails on
  `Cannot find module '@medusajs/medusa/link-modules'`. Retry only with a check
  that `@medusajs/framework` and `@medusajs/medusa` both land in the root.
- [x] **14. The template's `supersecret` passes as a production secret.**
  Medusa only rejects empty secrets, and anyone can forge admin tokens with a
  known JWT secret. Fix: refuse to start in production with the default.
- [x] **15. Redis is started but never used.**
  `medusa-config.ts` does not wire `REDIS_URL`, so events, workflows and sessions
  live in memory and a restart loses them.
  Fix: use Redis for those when `REDIS_URL` is set.
- [x] **16. Product images point at localhost on the server.**
  The local file provider defaults to `http://localhost:9000/static`, and
  `next.config.js` only allows localhost and S3 image hosts.
  Fix: build the URL from `MEDUSA_BACKEND_URL`, allow that host.
- [x] **17. Missing storefront settings fail silently.**
  An unset `NEXT_PUBLIC_BASE_URL` gives canonical URLs and a sitemap on
  `https://localhost:8000`. Fix: fail the build, add a `.env.template`.
- [x] **18. Leftover starter code.**
  Placeholder `/store/custom` and `/admin/custom` routes, unused `next-sitemap.js`.
- [x] **19. Redis loses its data when the container is recreated.**
  `docker-compose.yml` has no volume or persistence, so pending events still
  vanish after task 15. Fix: append-only file on a named volume.
- [x] **20. The production start path was undocumented.**
  Medusa's docs say to run `npm install` in `.medusa/server`. Here that fails with a
  peer conflict, and it would skip the lockfile and overrides anyway.
  Fix: start from `.medusa/server` on the workspace install, steps below.

## Server checklist (not code, do when setting up the server)

Backend deploy, in this order:

1. `npm ci` in `backend/`, which applies the lockfile and overrides.
2. `npx medusa build` in `backend/apps/backend`. It deletes `.medusa/server`.
   `medusa start` in `apps/backend` itself exits with "Could not find index.html".
3. Link `.medusa/server/static` to a directory outside the build, or uploaded
   product images are deleted by step 2.
4. `npx medusa db:migrate`, then `npx medusa start`, both from `.medusa/server`.
   Pass settings through the service environment (systemd `EnvironmentFile`):
   `.env` is read from the current directory, and the build does not copy it.
   The migration `setup-german-vat.ts` runs here too (19 % default rate
   `DE-MWST-19` and tax-inclusive price preferences). After the first migrate
   check Admin > Settings > Tax Regions > Deutschland: without the rate the
   shop shows MwSt. 0,00 €.

Run **exactly one** backend process, under systemd, with no cluster mode. Upload
locks are per process (`lib/tridata/run-guard.ts`). In a test, six leftover
processes each re-sent the same order at once.

- Build the storefront with the backend running and public `NEXT_PUBLIC_*` values.
- Set real `JWT_SECRET`, `COOKIE_SECRET`, `POSTGRES_PASSWORD`, plus `STORE_CORS`,
  `ADMIN_CORS`, `AUTH_CORS`, `MEDUSA_BACKEND_URL`, `STOREFRONT_URL`. Changing
  `POSTGRES_PASSWORD` does not affect an existing Postgres volume.
- Set `TRIDATA_STOCK_SYNC_CRON=*/10 * * * *`.
- Order confirmation e-mail: set `NOTIFICATION_PROVIDER_RESOLVE`
  (`./src/modules/brevo`), `NOTIFICATION_API_KEY`, `NOTIFICATION_FROM` and, recommended,
  `NOTIFICATION_REPLY_TO` (setup: `BREVO_SETUP.md`; Brevo's authorised-IP
  list must allow the server, or sends fail with `unauthorized`). In production the backend refuses to start without them.
  A test server that takes no real orders can set `NOTIFICATION_ALLOW_NONE=true`
  instead; it then sends nothing, so it must never take real orders.
  `STOREFRONT_URL` is required too (the confirmation workflow fails without it).
  Check the backend log for `[notification] order confirmation ... failed`.
  The send is tried 3 times (2 s and 10 s backoff); the result is stored on the
  order as `metadata.confirmation_email = { status: "sent" | "failed", at }`.
  Monitor the log prefix `[notification] order confirmation` (also
  `... SKIPPED` when `NOTIFICATION_ALLOW_NONE=true` is set, which must not be on
  a real server) and orders with `confirmation_email.status = "failed"`. Under
  the AGB the contract is formed when the confirmation e-mail is sent, so a
  failed confirmation means there is no contract yet: send it again with
  `POST /admin/orders/<order_id>/resend-confirmation` (admin auth, empty body
  `{}`; answers `{ "status": "sent" | "failed" }`) or contact the customer.
- Set `NODE_ENV=production` for the backend. All production guards depend on it:
  `JWT_SECRET`/`COOKIE_SECRET` not the public default, TriCon endpoint, mail
  provider, `STOREFRONT_URL`. The mail and SumUp `STOREFRONT_URL` checks run only
  at `medusa start`; `medusa build`, `db:migrate` (including
  `setup-german-vat.ts`) and `medusa exec` do not need the mail variables.
- Reverse proxy with TLS. Session and auth cookies need https in production.
- Rate limit `/auth/*`: Medusa has none. The storefront server makes all customer
  auth calls, so the backend only sees the storefront's address. Built accordingly:
  the storefront limits per visitor address in its server actions
  (`apps/storefront/src/lib/util/rate-limit.ts`: login 10/min, signup 5/min,
  activate 10/min, resend 5/min), and the backend limits per account or login
  (`src/lib/rate-limit.ts`: login and register per e-mail 10 and 5 per 15 min,
  verification request/confirm/customer create per auth identity, reset-password
  per identifier). The admin login (browser to backend) is limited per address:
  set `TRUST_CF_CONNECTING_IP=true` only when the backend port is reachable
  through Cloudflare alone, otherwise the header can be forged and the limit
  uses the socket address. Both read the address from `CF-Connecting-IP`
  (storefront) or the proxy address, so the storefront and backend ports must
  not be open to the internet. Add the same per-address limits at the edge:
  Cloudflare, Security, WAF, Rate limiting rules on `/auth/*`,
  `/*/account` and `/api` paths, 429 over the limit; on the Strato proxy nginx
  `limit_req_zone` keyed on `$http_cf_connecting_ip` (or `$binary_remote_addr`
  without Cloudflare).
- SumUp webhook token: each checkout's callback URL is
  `/hooks/payment/sumup_sumup?ref=<session id>&wh_token=<HMAC of the session id>`.
  The shared `SUMUP_WEBHOOK_SECRET` is never in a URL, so it is not in
  `payment_session.data`, access logs or the backend's http log; a logged URL only
  yields that one session's token: a leaked token only allows re-checking that
  one session (it does not expire). Medusa's HTTP logger cannot be told to skip `/hooks/payment/`, so the
  token still shows at log level `http`; redacting the query in the proxy log
  (nginx: log `$uri`) is optional now. Use a different random secret per
  environment (`openssl rand -hex 32`, at least 32 characters: production refuses
  to start otherwise).
  MANDATORY on every server that created SumUp sessions before this change (the
  dev server): rotate `SUMUP_WEBHOOK_SECRET` in the SAME restart that deploys this
  code. Earlier sessions and SumUp checkouts hold the OLD URL
  `...?wh_secret=<secret>` in `payment_session.data.raw_checkout.return_url`,
  readable by those shoppers, and the old value is now the HMAC key for the new
  tokens. A secret that was ever stored in session data must never be reused as a
  live key (use a fresh one per environment). After rotating, the old checkouts'
  callbacks get 401 (no token), so the reconciliation job
  (`sumup-reconcile-sessions`) completes the paid ones within about 20 minutes
  (10 min minimum session age plus the 10 min cron). Only after rotating may
  you clear the stale data of open sessions
  (`UPDATE payment_session SET data = data #- '{raw_checkout,return_url}' WHERE
  provider_id = 'pp_sumup_sumup'`; check the row count first). Rotate also after
  any suspected leak, outside business hours. Not yet verified on a server: that
  the dev route answers 401 without a valid token (dev still runs the old code),
  that the wrapper registers at boot, and that SumUp keeps the `ref`/`wh_token`
  query on callbacks.
- SumUp webhook flood: the backend limits `/hooks/payment/sumup_sumup` to 20
  calls per minute per `ref` (memory-backed, single process). Also limit at the
  proxy, e.g. nginx `limit_req_zone $binary_remote_addr zone=hooks:10m rate=30r/m;`
  and `limit_req zone=hooks burst=20 nodelay;` in `location /hooks/payment/`
  (or `$http_cf_connecting_ip` behind Cloudflare).
- SumUp payment mismatch runbook. Alert on these backend log keys (prefix
  `[sumup]`, error level): `webhookRejected` (SumUp says paid, but session id or
  amount differ from the payment session, or the URL's `ref`; a malformed
  checkout id is logged at warn level with the same key), `reconcilePaidMismatch`
  (same, found by the job; repeats every 10 minutes for 24 h) and
  `reconcileCapturedWithoutOrder` (captured, cart did not complete). Each carries
  the payment session id only. Steps: find the session and its cart/order in the
  admin or DB; if the customer was charged and no order exists, either create the
  order manually or refund the SumUp transaction (SumUp dashboard) and tell the
  customer; if the cart total changed after the checkout was created, refund and
  ask the customer to pay again.
- Firewall: only 22, 80, 443. Keep the TriCon mock on loopback.
- Off-server backups of Postgres and the uploads directory, with a tested restore.
  RAID 1 only covers a dead disk, not deletion, corruption or a lost server, and
  there are no hypervisor snapshots on a dedicated server, so the backup is the
  only way back.
- Log rotation for backend, storefront and proxy.
- Sign Strato's AVV (GDPR Art. 28). Have `legal-security-reviewer` run before
  going live, and keep test orders to fake data.
- Seeding: `db:migrate` from `.medusa/server` looks for
  `example-product-images` five levels up, which is `backend/apps/` there and does
  not exist. Not run in this review. Decide whether production gets the demo
  catalog at all before first migrating an empty database.

Remaining `npm audit` highs: `vite`, `postcss`, `source-map-js` (build tools) and
Medusa's `graphql-codegen`/`lodash` chain. The SumUp webhook item (TODO.md)
is closed in code pending sandbox confirmation; its sandbox run and review are open.
