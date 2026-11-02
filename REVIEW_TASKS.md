# TriCon sync review tasks

Findings from the code review of the TriCon/Tridata ERP sync (PLAN.md Task 14),
2026-11-02. Tick a task in the commit that fixes it.

## Must fix

- [x] **1. Paid flag and cancellation can never reach TriCon.**
  `steps/order-updates.ts`, `markOrderPaid` / `cancelOrder` only run once from
  their event. A failed call is never retried. Payment captured or order
  cancelled during an in-flight upload is also lost.
  Fix: re-check open orders in the order-state poll loop.
- [ ] **2. Cancelling hides an order TriCon may already have.**
  `steps/order-updates.ts`, `cancelOrder` marks every non-`sent` order `skipped`,
  though a timed-out upload may have arrived, and it erases `conflict`.
  Fix: keep `conflict`, set `attention: "review"` when an attempt was made.

## Should fix

- [ ] **3. TriCon outage over 4 hours stops order retries.**
  `helpers/backoff.ts`, 10 attempts add up to 243 minutes.
  Fix: `MAX_UPLOAD_ATTEMPTS = 48` (about 2 days).
- [ ] **4. An order with no sync row is never uploaded.**
  The row is created by the `order.placed` handler; the event bus is in-memory,
  so a restart loses the event and the retry job only sees existing rows.
  Fix: retry job also uploads recent orders that have no row. A Redis event bus
  for production stays open: it is a hosting decision.
- [ ] **5. New orders can stop being polled.**
  `steps/order-updates.ts`, sort by `state_checked_at ASC` puts empty values
  last, and failed polls never update the date.
  Fix: set the date on upload, on `mark_sent` and on failed polls.
- [ ] **6. One empty TriCon list marks all bikes sold out.**
  `steps/link-products.ts`, the safety check needs both lists empty.
  Fix: also keep links when only the list feeding them is empty.
- [ ] **7. The riskiest order paths have no test.**
  `cancelOrder`, `markOrderPaid`, the order-state loop.
  Fix: unit tests with a fake service and fake fetch.

## Nice to have

- [ ] **8. Messages that are no longer true.**
  `steps/upload-order.ts` conflict error, `steps/resolve-conflict.ts` lock comment.
- [ ] **9. A DB error can look like a TriCon failure.**
  `helpers/tracked-call.ts`, a failed log write after a successful upload marks
  the order failed, and the retry then becomes a false conflict.
  Fix: a failed log write never changes the call's result.
- [ ] **10. Unused code.**
  `TridataClient.downloadArtikel`, `downloadStockByArtikel`, the
  `TridataStockByArtikel` type, and `tridata_order_map.payload_hash`.
