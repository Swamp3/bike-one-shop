# Fix brief for the reviewer findings (2026-11-16)

Source: `review-2026-11-16.md` in this folder (finding numbers below refer to it). Plan: `plan.md`. A first agent was stopped mid-way (see `git diff`); every task below must be checked against the code and finished, not redone.

Rules for every agent:
- Do NOT commit. Do not touch `TODO.md`, `PLAN.md` or `review-2026-11-16.md`; report TODO items back instead, the main session writes them.
- German UI text, `bo-*` Tailwind tokens. Do not invent legal facts or business values; where a value is an owner decision, implement the safest neutral version, flag it with a code comment and in the report. Not legal advice.
- Local dev runs: backend :9000, storefront :8000. Never `make reset-db`/`make clean`; never `npm run build` while the dev server runs. Test orders and carts only with fake data; delete what you create or report it.
- Playwright is in the scratchpad `/private/tmp/claude-501/-Users-timo-alts-dev-bike-one-shop/94031646-a6c4-46bd-9412-f74cc7886faf/scratchpad` (see `lc-*` scripts). Prefix new files with `fx-`.
- Keep a progress file `.working-files/legal-compliance/progress-<your letter>.md`: after each task one line (done / partly / blocked, what you verified). Aim for 20 minutes per agent. If a command or request hangs, do not wait or loop: note it in the progress file and move on.

## Task 1: VAT (Critical, finding 1)  [agent A]
Idempotent migration script in `backend/apps/backend/src/migration-scripts/` whose file name sorts AFTER `initial-data-seed.ts` (Medusa orders scripts by `localeCompare`; `setup-german-vat.ts` was started). It must ensure: tax region `de` exists (create if missing, like the seed); a default rate `code: "DE-MWST-19"`, `name: "MwSt. 19 %"`, `rate: 19`, `is_default: true` (skip if a default exists); price preferences `is_tax_inclusive: true` for currency `eur` and for the DE region (skip what exists). Core workflows or module services, whichever the installed Medusa version provides. Run it twice locally; nothing may change on the second run. Verify with a fake cart: total = items + shipping, `tax_total` about total/1.19*0.19, shipping taxed, and non-zero "darin enthaltene MwSt." in storefront cart and checkout. Read-only: report what the TriCon order upload (`src/lib/tridata`) sends for amounts and tax (net or gross); do not change TriCon code.

## Task 2: AGB § 2 and § 3 (High, finding 2)  [agent B pages, agent C e-mail]
ONE consistent model: the contract is formed when BikeOne sends the order confirmation e-mail; receipt notice and confirmation are the same e-mail. Remove "Auftrags- oder Versandbestätigung" and "noch keine Annahme"; payment is due at contract formation. Align `agb/page.tsx` (B) and `workflows/order-confirmation/build-email.ts` line ~136 "bestätigt außerdem den Vertragsinhalt" (C). Flag as owner/lawyer decision (alternative: separate acceptance with a deadline).

## Task 3: Widerrufsbelehrung (High, finding 4)  [B page, C e-mail]
Keep the Belehrung block verbatim from the model (Anlage 1 zu Art. 246a § 1 Abs. 2 S. 2 EGBGB). Move explanatory remarks ("Wann es kein Widerrufsrecht gibt" etc.) OUT of the block into a separate section "Hinweise" after the form. Remove the made-to-order paragraph. Add the seller phone to the Widerruf address ("Telefon") in Belehrung and form. `COMPANY.phone` = Oldenburg store number 0441 984 894 83 (already added in `lib/data/company.ts`; copy it into the COMPANY copy in `build-email.ts`; comment: owner confirms which number is the company's). Leave "Du trägst die unmittelbaren Kosten der Rücksendung" as it is (owner decision).

## Task 4: Newsletter (High, finding 5)  [agent B]
Show the footer newsletter block only when `NEXT_PUBLIC_NEWSLETTER_ENABLED === "true"`. Update `apps/storefront/.env.template` (default `false`), the comment in `newsletter-form` and any docs mentioning the flag. While it is a placeholder the form must never claim something was sent or promise unsubscribing ("Demnächst verfügbar." style).

## Task 5: Price and shipping wording (High, finding 6)  [agent A]
- Remove the static "Verfügbar — ab Lager" and "Lieferzeit 3–5 Werktage" claims from the product page (`modules/products/templates/index.tsx`, `product-actions`); neutral line instead, e.g. "Lieferzeit und Versandkosten werden im Warenkorb und vor Abgabe der Bestellung angezeigt." Do not invent delivery times. Show availability only if real stock data per variant reaches the page.
- Identical shipping-cost wording on the product page card, price note target, cart and checkout: shipping costs are shown in the cart and in checkout before the order is placed (`lib/util/shipping-note.ts` was started).
- Cart total "Gesamt inkl. MwSt." and VAT row "darin enthaltene MwSt." (`modules/common/components/cart-totals`, `modules/cart/templates/summary.tsx`, checkout summary).
- Read-only: report shipping option prices in the DB (reviewer saw 100 and 200; TODO.md says 10 EUR; check euros vs cents). Do not change them.
- Price note on `bikeone-product-card`: 12px, equal card heights.

## Task 6: Order list (Medium, finding 7)  [agent B]
`modules/account/components/order-list/index.tsx`: remove the order-date based return window ("Rückgabefrist abgelaufen", stale 30-day comment) and the "Rücksendung im Store starten" button; replace with a short note linking to `/widerrufsrecht` and the contact e-mail from `COMPANY`.

## Task 7: Impressum/Datenschutz links (Medium, finding 8)  [agent B]
`lib/data/legal-links.ts` exports the Impressum and Datenschutz URLs (now https://bike-one.org/impressum/ and /datenschutz/); use it everywhere those URLs are hardcoded (`rg bike-one.org` in `apps/storefront/src`: footer, register, review, newsletter-form, store-map notice, checkout), with a comment that they move into the shop if bike-one.org goes away. Slim footer in the checkout layout (`app/[countryCode]/(checkout)/layout.tsx`) with Impressum, Datenschutz, AGB, Widerrufsrecht, Kontakt.

## Task 8: Confirmation e-mail (Medium, findings 9 and 10)  [agent C]
- `medusa-config.ts`: in production without a notification provider fail at startup with a clear message unless `NOTIFICATION_ALLOW_NONE=true` (explicit opt-in for test servers); document both in `apps/backend/.env.template` and the server checklist in `REVIEW_TASKS.md`. Non-production keeps `notification-local`. Subscriber: on send failure log at error level with the order id only (no personal data); keep not throwing.
- `workflows/order-confirmation/index.ts`: in production fail clearly when `STOREFRONT_URL` is missing instead of falling back to localhost.
- `build-email.ts`: seller details in the footer (BikeOne GmbH, Rheinstrasse 16, 26135 Oldenburg (Oldb), phone from COMPANY, Amtsgericht Oldenburg HRB 220546, USt-IdNr. DE366536184, Geschäftsführer Marvin Wilczura), billing address, plain `text` fallback only if the notification module accepts it (the installed SendGrid provider drops it: say so, no hacks). AGB text in the mail: check whether `backend/` has a shared workspace package both apps can import; if yes keep legal texts in one source; if not do NOT create one, keep the AGB link and report it as an open question for the lawyer. Update `__tests__/build-email.unit.spec.ts` and run `npm run test:unit -- order-confirmation`.

## Task 9: Low (finding 11)  [agent B]
AGB § 9 says only "Wir sind nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen." (matches the Impressum); fix the code comment reference. Report the TODO items (do not edit TODO.md): withdrawal function (Art. 11a Directive 2011/83/EU as amended by 2023/2673, German § 356a BGB; ask the lawyer), Impressum wording "Geschäftsführer" and phone, retention of the notification table for the Datenschutzerklärung, shipping-price discrepancy.

## Verification (each agent for its files)
`npx tsc --noEmit -p .` in `apps/storefront` (judge only touched files); backend `tsc`/eslint for touched files (existing errors in admin widgets are known); `npm run test:unit`; Playwright screenshots at 360 and 1440px for what you changed. Leftover check: `rg -n "ab Lager|3–5 Werktage|Versandbestätigung|Rückgabefrist|Rücksendung im Store|Bestätigungsmail wurde"` in `apps/storefront/src` and the order-confirmation workflow.

Final report (concise, per task): files changed, what you verified and how, numbers where asked, what is blocked or needs an owner decision, deviations, test data left behind.
