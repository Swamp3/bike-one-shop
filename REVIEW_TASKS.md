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
  The client code is gone. Still open: dropping `payload_hash` needs
  `medusa db:generate` against a running database.

# Production readiness review (netcup VPS)

Second review, 2026-11-02, assuming one vServer (netcup VPS 4000 G12.5) running
everything: Postgres, Redis, backend, storefront, reverse proxy.

- [ ] **11. Postgres and Redis are open to the internet.**
  `docker-compose.yml` publishes 5432 (password `medusa`) and 6379 (no auth) on
  all interfaces, and Docker's published ports bypass ufw.
  Fix: bind to 127.0.0.1, take the Postgres password from the environment.
- [ ] **12. Next.js has a critical remote code execution advisory.**
  next 15.5.26 is affected by GHSA-2464-fhr4-w9xw (image optimizer) and by
  cache-poisoning advisories for self-hosted sites. Fix: 15.5.28.
- [ ] **13. Medusa 2.21.1 pulls in vulnerable packages.**
  `npm audit` reports @medusajs/framework and dashboard, zod and vite as high.
  Fix: upgrade to 2.22.2 and re-audit.
- [ ] **14. The template's `supersecret` passes as a production secret.**
  Medusa only rejects empty secrets, and anyone can forge admin tokens with a
  known JWT secret. Fix: refuse to start in production with the default.
- [ ] **15. Redis is started but never used.**
  `medusa-config.ts` does not wire `REDIS_URL`, so events, workflows and sessions
  live in memory and a restart loses them.
  Fix: use Redis for those when `REDIS_URL` is set.
- [ ] **16. Product images point at localhost on the server.**
  The local file provider defaults to `http://localhost:9000/static`, and
  `next.config.js` only allows localhost and S3 image hosts.
  Fix: build the URL from `MEDUSA_BACKEND_URL`, allow that host.
- [ ] **17. Missing storefront settings fail silently.**
  An unset `NEXT_PUBLIC_BASE_URL` gives canonical URLs and a sitemap on
  `https://localhost:8000`. Fix: fail the build, add a `.env.template`.
- [ ] **18. Leftover starter code.**
  Placeholder `/store/custom` and `/admin/custom` routes, unused `next-sitemap.js`.
