# Legal compliance before go-live

Implementer: `expert-developer`. Follow-up review: `legal-security-reviewer` (checkout and pricing are in scope, so it is required before merge). None of this is legal advice.

## Context

The 2026-11-16 analysis found that the storefront needs **no cookie banner today** but is not legally ready for go-live. Nothing here adds tracking; if analytics, pixels, embedded video or maps are added later, a consent banner with an equal-weight "Reject" button on the first layer becomes mandatory (§ 25 TDDDG, formerly TTDSG).

What the storefront stores today, all strictly necessary, so no consent is needed:
- Cookies: `_medusa_jwt` (login, 7 days, httpOnly), `_medusa_cart_id` (7 days), `_medusa_pending_customer` (1 day), `_medusa_cache_id` (read in `lib/data/cookies.ts`, set elsewhere).
- localStorage: `bikeone_preferred_store`, written only when the visitor picks a store.
- Third parties: none at runtime. OSM tiles load only after the 2-click notice on `/standorte`. Stripe loads only if `NEXT_PUBLIC_STRIPE_KEY` is set (empty today). Fonts come from `next/font`.

Already done as drafts (2026-11-16): `/agb`, `/widerrufsrecht`, `/kontakt`, Impressum link, company data in `lib/data/company.ts`.

## Part A: code fixes (expert-developer)

Rules: German UI text, `bo-*` Tailwind tokens, no new dependencies unless named here, do not commit. The working tree has uncommitted changes from other workstreams (category restructure, `/standorte` map, mobile header and search, legal pages); build on them, don't revert or reformat.

### A1. Price note next to prices (PAngV)
"inkl. MwSt., zzgl. Versand" is only shown in the cart totals today.
- Add a small muted line under the price on the product page (`modules/products/components/product-price`, used by `product-actions`) and on product cards (`modules/products/components/bikeone-product-card`, also `product-preview` if it is still rendered anywhere). Link "Versand" to the shipping section of the product page (add an `id` to that section).
- Accept: every place that shows a product price shows the note, at 360px and 1440px, without breaking card height uniformity.

### A2. Manufacturer and safety info on the product page (GPSR)
The EU product safety regulation requires manufacturer name, postal address and electronic contact, a product identifier (type, model, batch or serial) and safety information or warnings on the online offer. Nothing exists today.
- Data contract: brand = Medusa collection (`product.collection`). Manufacturer data lives in `collection.metadata`: `manufacturer_name`, `manufacturer_address`, `manufacturer_email`. Safety text lives in `product.metadata.safety_info`. Product identifier: show model (product title) and the SKU of the selected variant.
- New section "Herstellerinformationen" on the product page, below "Technische Daten". Render only the fields that exist. Make sure the product fetch includes `*collection` and `+metadata` (check `lib/data/products.ts` fields).
- Do NOT invent manufacturer addresses. The real data has to come from the owner per brand (Trek, Cervélo, Factor, Specialized, Wilier, Ridley, Pinarello). Add a `shortcut:` comment and the open data task to `TODO.md`. In the report, list which brands have no data yet.

### A3. Return claim: 30 days vs. 14 days
The product page ("Rückgabe im Store" card, and the line next to "Bikefitting") and the homepage `trust-strip` promise "30 Tage Rückgaberecht … im Store". The Widerruf page and AGB say 14 days. A voluntary right is allowed but must be defined in the AGB and kept separate from the statutory right; the owner has not decided that.
- Reword all three places to the statutory right: "14 Tage Widerrufsrecht bei Online-Bestellungen", linking to `/widerrufsrecht`. Search the storefront for every "30 Tage" and "Rückgabe" claim.
- Note in `TODO.md` that the 30-day promise was removed pending an owner decision (git history has the old text).

### A4. Claims about Click & Collect that don't exist yet
`/standorte` says "Bald verfügbar", but the product page says "oder online reservieren und in einem unserer Stores abholen" and a card "Click & Collect: Online reservieren, abholbereit … Zahlung wahlweise online oder direkt im Store", and the `trust-strip` says "innerhalb von 2 Stunden abholbereit". That is misleading advertising (UWG).
- Replace these with honest wording, for example "Click & Collect: bald verfügbar", consistent with `/standorte`. Remove the 2-hour and pay-in-store promises. Search the storefront for "Stores abholen", "abholbereit", "reservieren" and "2 Stunden".
- Keep the structure of the cards so the feature can be switched back on when it exists.

### A5. Checkout: button label and legal links (§ 312j BGB)
- Find the order-placing button in `modules/checkout` (payment step / review). The label must be "Zahlungspflichtig bestellen" (or equally clear). Check every payment provider path (SumUp, manual, Stripe if enabled).
- Above or beside the button, show: "Mit Klick auf „Zahlungspflichtig bestellen“ gibst du eine verbindliche Bestellung ab. Es gelten unsere AGB. Die Widerrufsbelehrung und Hinweise zur Datenverarbeitung findest du hier." with links to `/agb`, `/widerrufsrecht` and the Datenschutz page (`https://bike-one.org/datenschutz/`). Links open in a new tab so the cart and form state are kept.
- Check that the cart page and the checkout show total price including VAT and the shipping cost before the order is placed.

### A6. Registration and newsletter wording
- `modules/account/components/register`: replace "Mit der Kontoerstellung akzeptierst du unsere Datenschutzerklärung und AGB" with "Es gelten unsere AGB. Hinweise zur Datenverarbeitung findest du in der Datenschutzerklärung." (information, not acceptance).
- `modules/layout/components/newsletter-form`: add a short line under the form linking to the Datenschutzerklärung and stating that the subscription can be cancelled at any time. The form stays a placeholder; double opt-in comes with the real provider.

### A7. Order confirmation e-mail (§ 312i and § 312f BGB)
The shop must confirm the order's receipt electronically, and confirm the contract on a durable medium including the Widerrufsbelehrung. `medusa-config.ts` has no notification module.
- Follow `backend/AGENTS.md` conventions (subscriber plus workflow/service, module config). Register `@medusajs/medusa/notification` with the `notification-local` provider for dev (logs to the console) and, only when an env var for a real provider is set, that provider, like the SumUp pattern in `medusa-config.ts`. Do not pick or hard-code a provider; list the options (Resend and SendGrid have official Medusa providers; SMTP needs a community plugin) in the report.
- A subscriber on `order.placed` sends a German e-mail: order number, items, totals including VAT and shipping, delivery address, plus the Widerrufsbelehrung text and the Muster-Widerrufsformular, and a link to the AGB. Take the wording from `storefront/src/app/[countryCode]/(main)/widerrufsrecht/page.tsx` and put a comment at both places: "keep in sync with the other copy".
- Never log customer personal data beyond what `lib/integration-logger.ts` allows.
- If this needs a decision or credentials that don't exist, build everything up to the provider switch, verify with the local provider, and report what is missing.

### A8. Sale prices (PAngV § 11)
`product-price`, `product-preview/price.tsx`, `line-item-price` and `line-item-unit-price` render a crossed-out original price when a price list is active. A reduction needs the lowest price of the previous 30 days next to it.
- Do not change behavior. Add a one-line `shortcut:` comment at each crossed-out price: reductions need the 30-day lowest price (PAngV § 11), implement before price lists are used. Add the item to `TODO.md`.

### A9. Docs
- `TODO.md`: replace the "German legal pages" item with a pointer to `.working-files/legal-compliance/plan.md`, keeping the owner decisions below as open items.
- `CLAUDE.md`: "TTDSG" is now "TDDDG" (renamed May 2024).
- `.working-files/legal-compliance/cookie-inventory.md` (new): ready-to-paste text for the Datenschutzerklärung covering the cookies, the localStorage entry, the OSM map notice and the Stripe case, with purpose and duration each. Verify `_medusa_cache_id` (where it is set, how long it lives) before writing it down. German, neutral wording, marked as a draft. No secrets or personal data.

## Part B: owner decisions (not code; keep in TODO.md)

1. **bike-one.org and the shutdown.** Impressum, Datenschutz and Terminbuchung link there. If those pages live on the WordPress instance that is being stopped, the links die. Keep the domain, or move Impressum and Datenschutz into the shop first.
2. **Datenschutzerklärung.** Probably written for the old site. Needs shop content: accounts, orders, SumUp, freight forwarder, hosting at Strato (data processing agreement), cookies (see A9), OSM map, retention, supervisory authority.
3. **Real Impressum data** (register number, VAT ID, managing director) and a check of `lib/data/company.ts` against it.
4. **Voluntary 30-day return**: keep it (then define it in the AGB) or drop it.
5. **Return costs for bikes** (estimate needed in the Widerrufsbelehrung), made-to-order exception for configured builds, consumer arbitration choice: see the existing "German legal pages" notes.
6. **Manufacturer data per brand** for A2.
7. **E-mail provider** for A7.
8. **BFSG** (accessibility, since June 2025): exempt only if the company is a micro-enterprise (under 10 employees and up to €2M turnover). Owner checks; otherwise an accessibility statement and a WCAG 2.1 AA audit are needed.
9. **Before the first shipment:** LUCID registration and packaging licensing (VerpackG); WEEE and battery registration if e-bikes, lights or batteries are sold.
10. **Newsletter:** double opt-in and provider, when built.

## Out of scope
- Moving Impressum or Datenschutz into the shop (owner decision 1).
- A cookie banner (not needed today).
- A full Datenschutzerklärung.
- Implementing the 30-day lowest-price logic (A8 only marks the places).

## Verification
1. `npx tsc --noEmit -p .` in `apps/storefront` (judge only touched files); `npx tsc --noEmit` and eslint for touched backend files.
2. Playwright screenshots (scratchpad, prefix `lc-`) at 360 and 1440px: product page with price note, manufacturer section (with and without metadata), reworded return and Click & Collect cards, trust strip, checkout button area, registration form, footer newsletter.
3. `rg` for leftovers: "30 Tage", "2 Stunden", "abholbereit", "reservieren", "Stores abholen", `href="#"`.
4. Backend: place a test order against the local backend with the local notification provider and confirm the e-mail content in the log (use fake data only).
5. Do not run `npm run build` while the dev server runs.
