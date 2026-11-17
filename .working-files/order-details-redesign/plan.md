# Account order details: redesign + print

Page: `/[countryCode]/account/orders/details/[id]`, template `modules/order/templates/order-details-template.tsx`.
It is the only account page still on the Medusa starter. The order list (`account/components/order-list`) and the
confirmation page (`order-completed-template.tsx`) already use the BikeOne style and German copy.

## What is wrong today (read from the code)
- English copy: "Order details", "Back to overview", "Delivery", "Shipping Address", "Contact", "Method",
  "We have sent the order confirmation ...". Date is `toDateString()` ("Mon Nov 17 2026").
- Status shown as raw Medusa words ("Not fulfilled", "Awaiting"); the list page has a German `STATUS_LABEL` map,
  the details page does not use it. `sata-testid` typo on the payment status.
- No payment block (confirmation page has `PaymentDetails`, this page does not), no billing address, no VAT line,
  no phone/pickup info, no order timeline.
- Uses `bg-white`, `Heading`/`Table` starter UI, `text-ui-*` tokens: not the `bo-*` design tokens, so it ignores
  the theme. Layout is 3 fixed `w-1/3` columns, breaks on mobile.
- Items use the starter `Item` row: no grouping of Laufradsatz/configurator builds (`group-line-items`,
  `BuildGroupCard`), which the order list already does, so the same order looks different on the two pages.
- Bug that matters: `retrieveOrder` fetches with `cache: "force-cache"`, so status changes (TriCon order-state
  sync sets Geliefert etc.) may not show until the "orders" cache tag is revalidated. Check
  `getCacheOptions("orders")` and revalidation before promising a live status.
- Click & Collect: shipping block always prints a shipping address and method. For a pickup order it must show
  the store instead. Pickup orders do not exist yet (no pickup shipping option, see
  `.working-files/click-and-collect/plan.md` §1), so the pickup variant is built together with that plan, step 6.

## Target layout (mobile first, same card style as the confirmation page)
1. Header card: "Bestellung #1042", placed date `de-DE` long format, status pill (reuse `STATUS_LABEL`),
   payment status pill, back link "Zurück zur Übersicht" (chevron, not XMark), "Drucken" button.
2. Status timeline: Bestellt -> Bezahlt -> Versendet/Bereit zur Abholung -> Zugestellt/Abgeholt, current step
   highlighted, derived from `payment_status` + `fulfillment_status` (+ canceled). No fake dates: only show a
   date where the order has one.
3. Items card: grouped like the order list (`groupLineItemsByBuild`, `BuildGroupCard`), thumbnail, title,
   options, qty x unit price, line total, link to the product page when it still exists.
4. Two cards side by side on md+ (stacked on mobile): Lieferung (address + method, or the pickup block below) and
   Zahlung (reuse `PaymentDetails`, add Rechnungsadresse when it differs from shipping).
   **Pickup block** (instead of Lieferadresse + Versandart, no shipping address shown): title "Abholung in <Filiale>",
   address (street, PLZ city), phone, opening hours, "Abholung: 0,00 €", one line of what to bring / when it is ready
   (wording from the owner, click-and-collect plan decisions 2 and 5), link to `/standorte`. Pickup status in the
   timeline: "Bereit zur Abholung" / "Abgeholt" (Medusa pickup fulfillment: created -> "mark as picked up", or TriCon `Geliefert`).
   Data source: an order is a pickup order when `order.shipping_methods[0].shipping_option_id` is in the list returned by
   the planned public route `GET /store/custom/pickup-stores` (store name, address, phone, email, `opening_hours` from the
   stock location, plus its `shipping_option_id`). No custom order field, no customer-writable metadata (same rule
   as TriCon's `Filialname`). If the option id is unknown (option deleted later), fall back to the method name.
   Fetch the list in the page's server component, not cached for long (hours may change in the admin).
5. Totals: existing `CartTotals` (gross, discount, shipping, "inkl. MwSt.").
6. Help card: Widerrufsrecht link with the 14-day deadline computed from the delivery date if known, contact
   mailto/phone from `COMPANY`, "Frage zur Bestellung" prefilled with the order number.
7. Keep `data-testid`s that exist (`order-details-container`, `order-id`, `order-status`, ...); fix the typo.

## Print
- "Drucken" = `window.print()` in a small client component; no PDF library, no server rendering of PDFs.
- `@media print` via Tailwind `print:` variants (none used in the repo yet): hide header, footer, account nav,
  breadcrumb, buttons; single column; black on white; no card shadows/borders-radius needed; `break-inside-avoid`
  on cards and item rows; show the logo (dark variant `bikeone-logo.svg`) and the shop address block from
  `COMPANY` at the top of the printed page; page footer with order number and print date.
- The printout is an order overview, NOT an invoice (German tax rules: an invoice needs invoice number, supplier
  VAT id, delivery date etc.). Label it "Bestellübersicht" and add "Dies ist keine Rechnung." Real invoices are a
  separate topic (not in the repo, ask BikeOne whether TriBike issues them).
- Print only customer-own data already visible on the page (own order, own address). No internal ids beyond the
  order number. The page stays `robots: noindex`.

## Steps
1. Verify data: fetch one real order (guest-linked and account) via the store API, note the fields for billing
   address, payment status, cancel. The pickup rendering is decided (see item 4); build it only after click-and-collect
   steps 1, 2 and 6 exist, ship the shipping variant first. A pickup test order can only be placed once step 1 of that plan is done.
2. Fix `retrieveOrder` cache for the details page (no-store or revalidate tag on order-state sync), check
   `getCacheOptions`.
3. Extract shared pieces (status label map, status pill, date formatter) from `order-list` into
   `modules/order/` so list, details and print use one source. Do not change the list behavior.
4. Rebuild `order-details-template.tsx` and its sub-components per the layout above, remove the unused starter
   components (`order-details`, `shipping-details`, `items`, `item`) if nothing else imports them
   (check the confirmation/transfer pages first).
5. Print button + print styles; test with browser print preview on desktop (Chrome, Safari) and mobile Safari.
6. Check on mobile 360 px and desktop; dark mode tokens; keyboard focus; German copy review.
7. `legal-security-reviewer`: touches customer personal data (address, e-mail, phone) and prints it. Confirm the
   order is only retrievable by its owner (Store API enforces it), no extra fields leak, "keine Rechnung" wording.

## Open questions
- Resolved: pickup orders are not represented today (no pickup option exists, the local DB has an empty pickup fulfillment
  set only, `order-list/index.tsx:20-21` comment is still true). They will be a normal order whose shipping method points to a
  pickup shipping option; see the pickup block above and `.working-files/click-and-collect/plan.md`. Until that plan's
  step 1 is built, only the shipping variant ships.
- Open (owner, from the click-and-collect plan): hold time and "what to bring" wording for the pickup block; whether a
  "bereit zur Abholung" status/mail exists in v1 (without it the timeline goes Bestellt -> Bezahlt -> Abgeholt).
- Does BikeOne need a real invoice PDF (Rechnung) soon? If yes, it is its own plan (numbering, VAT id, TriBike).
- Cancel / return request from this page: out of scope here, only link to Widerrufsrecht + contact. For pickup orders the
  Widerruf deadline starts at pickup (possession), not at the order date: the help card must not compute it from the order date.
