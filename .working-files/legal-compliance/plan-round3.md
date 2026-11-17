# Round 3: findings of the second legal review (2026-11-16)

Implementer: `expert-developer`, as two parallel packages (A backend, B storefront). Afterwards `legal-security-reviewer` runs a third time. Not legal advice.

## Context

The fix round of the first review (`review-2026-11-16.md`, `fix-brief.md`) is done and uncommitted. The second review verdict is still **needs changes**. 8 of the 11 first findings are resolved in code; the rest are owner decisions. The second review found these new problems, mostly consequences of the fixes. Everything below is code, no owner decision needed, unless marked.

The AGB model now says: the contract is formed when BikeOne sends the order confirmation e-mail. That makes the e-mail legally important, which is the root of R1 and R3.

Rules for both packages: do not commit; German UI text and `bo-*` tokens; no invented legal or business facts; local dev stack runs (backend :9000, storefront :8000), never `make reset-db`/`make clean`, never `npm run build` while the dev server runs; fake data only, and delete or report every test cart, order and promotion you create; Playwright scripts and PNGs go to the scratchpad `/private/tmp/claude-501/-Users-timo-alts-dev-bike-one-shop/94031646-a6c4-46bd-9412-f74cc7886faf/scratchpad` with prefix `r3-`. Keep a progress file `.working-files/legal-compliance/progress-r3-<A|B>.md` (one line per task), aim for 15 minutes, and if a command or request hangs, note it and move on. Do not edit `TODO.md`, `PLAN.md` or `review-2026-11-16.md`; report items back.

## Package A: backend (`apps/backend`)

### R1b. Failed confirmation e-mail must not pass silently (High)
Files: `src/subscribers/order-placed-confirmation.ts`, `src/workflows/order-confirmation/`.
- Retry the send (for example 3 attempts with backoff) using the workflow step retry options the installed Medusa version provides.
- After the last attempt record the result on the order: `metadata.confirmation_email = { status: "sent" | "failed", at: ISO date }` (no personal data, no error text with addresses), so a failed confirmation can be found with one query.
- Keep the error log with the fixed prefix `[notification] order confirmation ... failed` and the order id only.
- Add an admin API route to send it again (for example `POST /admin/orders/:id/resend-confirmation`, validate the body like the other `admin/tridata` routes, new idempotency key so the resend is not swallowed by the first one). If the installed Medusa version makes this larger than about 40 lines, skip it and report why.
- Document in `REVIEW_TASKS.md` (server checklist): what to monitor (the log prefix, orders with `confirmation_email.status = "failed"`), and that a failed confirmation means the contract does not exist under the AGB until it is sent.

### R3. E-mail totals with a discount (Medium)
`build-email.ts` shows "Zwischensumme" as `item_total` (already after discount) and a separate "Rabatt" row. Show the items sum before discount (`item_total` plus the item-level discount) or drop the Rabatt row, so the rows add up to the total. Use the same discount definition as R2 (package B); the reviewer suggested the gross item-level discount (`item_discount_total` or `discount_total - shipping_discount_total`); check the field names in the installed `@medusajs/utils` totals code. Add a unit test with a discount and one with a free-shipping discount in `__tests__/build-email.unit.spec.ts`; run `npm run test:unit -- order-confirmation`.

### R5. Fail-fast only at server start (Medium)
`medusa-config.ts` throws on every config load with `NODE_ENV=production`, so `medusa build`, `db:migrate` (including `setup-german-vat.ts`) and `medusa exec` on a build or CI host without mail variables abort. Make the notification check run only when the server starts (for example check `process.argv` for `start`, or move the check into a loader that only runs at start; pick the least hacky option the installed version supports and say which). Keep the behavior: in production at start without a provider the backend refuses to start unless `NOTIFICATION_ALLOW_NONE=true`. Document in `REVIEW_TASKS.md`: `NODE_ENV=production` must be set (all production guards depend on it: JWT/COOKIE_SECRET, TriCon endpoint, mail), and that build and migrate do not need the mail variables.

### R6. SumUp redirect URL fallback (Low)
`medusa-config.ts` (around the SumUp options): the `redirectUrl` still falls back to `http://localhost:8000` when `STOREFRONT_URL` is unset. In production, when SumUp is configured, fail clearly instead (same pattern as the e-mail workflow). Leave the SumUp webhook-secret handling as it is.

### R7. VAT script warnings (Low)
`src/migration-scripts/setup-german-vat.ts`: log a warning when an existing default rate is not 19, and when no DE region is found so the region price preference is skipped. No behavior change beyond the logs. Do not touch the 19 % default.

### R8. Visible marker for `NOTIFICATION_ALLOW_NONE` (Low)
When no provider is configured and `NOTIFICATION_ALLOW_NONE=true`, the subscriber must log one warning per order (order id only) saying the confirmation e-mail was skipped, so a test `.env` copied to a real server is noticeable in the logs. Mention it in `.env.template`.

Verification A: backend `npx tsc --noEmit` and eslint for touched files (existing errors in admin widgets are known), `npm run test:unit`, load `medusa-config.ts` in production mode with and without the mail variables and with a `build`-like argv (show the three outcomes), run `setup-german-vat.ts` once more (no change), place one fake order locally and show the `confirmation_email` metadata and the e-mail totals.

## Package B: storefront (`apps/storefront`)

### R1a. Confirmation page must not claim delivery (High)
`src/modules/order/templates/order-completed-template.tsx:51` and `src/modules/order/components/confirmation-hero/index.tsx:34` say "Bestellbestätigung wurde ... geschickt / gesendet an". Reword so it does not state that the e-mail was delivered, for example "Wir senden dir eine Bestellbestätigung an <e-mail>. Mit dieser E-Mail kommt der Vertrag zustande." Keep the wording consistent with AGB § 2. Do not touch the AGB page (owner and lawyer decide the model); if the wording clashes with § 2, say so.

### R4. Remove the unfulfilled shipping-mail promise (Medium)
`order-completed-template.tsx:45` promises "eine Versandbestätigung mit Sendungsverfolgung". No such mail exists. Replace it with something true that does not promise a mail, for example a line pointing to the contact page and the account order list.

### R2. Discount rows in the cart totals (Medium)
`src/modules/common/components/cart-totals/index.tsx:36-37`: `discount = discount_total + discount_tax_total` counts the VAT share twice (item `discount_total` is already gross), so Zwischensumme and Rabatt are too high by about 19/119 of the discount; total, shipping and the item sum still reconcile. A free-shipping discount is folded into `cart.discount_total` while `item_total` excludes shipping. Use only the gross item-level discount (`item_discount_total` or `discount_total - shipping_discount_total`, check the installed `@medusajs/utils` totals code), and show a free-shipping discount on the shipping row, not in Rabatt. The component feeds the cart page, the checkout summary and the order-completed page.
Verify with fake carts in the local stack: no discount, a percentage code, and a free-shipping code (create the promotions with the core workflow or the admin API, name them `R3TEST...`, delete them afterwards). In every case Zwischensumme minus Rabatt plus Versand must equal Gesamt, and "darin enthaltene MwSt." must stay about total/1.19*0.19. Check cart page, checkout summary and, if you can complete a fake order, the order page. Report the numbers.

### R9. PDP price note size (Low)
`src/modules/products/components/price-note`: the PDP note is 11 px; make it 12 px like the card, check that the sticky mobile bar still fits at 360px.

Verification B: `npx tsc --noEmit -p .` in `apps/storefront` (judge only touched files), Playwright screenshots at 360 and 1440px of cart (with and without code), checkout summary, order page text, product page price note; `rg -n "wurde.*geschickt|gesendet an|Versandbestätigung" apps/storefront/src` must find nothing that states delivery or promises a shipping mail.

## For the main session after both packages

- Update statuses in `review-2026-11-16.md`, add the third review result, add to `TODO.md`: the du/Sie question for the lawyer (the model in Anlage 1 zu Art. 246a § 1 Abs. 2 S. 2 EGBGB is in "Sie", ours is in "du"; "das unten stehende" instead of "beigefügte" Muster-Widerrufsformular), and R1b monitoring. Update the Task 16 entry in `PLAN.md`.
- Run `legal-security-reviewer` a third time on the diff, then commit in themed commits (as the first batch).

## Still open, not code

Owner and lawyer: du or Sie in the Belehrung; AGB § 2 model; AGB text in the confirmation mail; return costs for bikes; real shipping prices and delivery times; company phone number; withdrawal button; manufacturer data; Datenschutzerklärung and processing agreements; tax advisor on 19 % for all products and shipping. TriCon receives gross amounts only: clarify with the TriCon owner.

## Out of scope

Redesigning the confirmation e-mail, a shipping-notification mail, any change of the AGB or Widerruf texts, provider choice for the mail, the SumUp webhook signature gap (tracked separately, blocks real payments).
