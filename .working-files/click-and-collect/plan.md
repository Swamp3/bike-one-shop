# Click & Collect (pickup in Oldenburg / Osnabrück, per-store stock)

Status: plan only, nothing built. Prepared 2026-11-17 from the code and the local dev DB (read-only queries).
Paths are relative to `backend/apps/backend/src` (BE) or `backend/apps/storefront/src` (SF) unless noted.
Related: `PLAN.md` Task 10/11/14, `TODO.md` "Real Click & Collect order fulfillment", "store-profile",
`.working-files/order-details-redesign/plan.md` (pickup block on the order page),
`.working-files/legal-compliance/rueckfragen-rueckgabe-widerruf.md` §9 (open pickup questions to the owner).

Rule from the owner: a variant is offered for pickup at a store only if that store's location has
`stocked - reserved > 0` (for the cart quantity, see edge cases).

## 1. Current state (evidence)

**Locations and sets (local DB, read-only):**
- 2 stock locations `BikeOne Oldenburg` / `BikeOne Osnabrück`, both linked to the one sales channel
  (`sales_channel_stock_location`), both with provider `manual_manual`. Seed: BE `migration-scripts/initial-data-seed.ts:221-284, 409-419`.
  `metadata` holds only `email` (seed `:235,248`). There is NO `opening_hours` in the DB although PLAN/TODO
  say so; hours exist only in the static SF `lib/data/stores.ts` (`STORES`).
- 2 fulfillment sets: `BikeOne Versand` (type shipping, zone `Deutschland`, geo zone country `de`) linked to
  Oldenburg only (seed `:308-331`), and `BikeOne Oldenburg pick up` (type pickup) linked to Oldenburg
  (`location_fulfillment_set`, created by hand in the admin 2026-10-12). The pickup set has NO service zone and
  NO shipping option. Osnabrück has no fulfillment set at all.
- 2 shipping options, both on the shipping zone: `Standard-Versand` (flat 100, enabled_in_store=true) and
  `Express-Versand` (hidden, enabled_in_store=false) (seed `:333-406`). One shipping profile only (`default`),
  used by all 62 products with a profile.
- No pickup option, no pickup provider. The storefront checkout already has a pickup code path:
  SF `modules/checkout/components/shipping/index.tsx:80` (`_pickupMethods` = `service_zone.fulfillment_set.type === "pickup"`),
  disables options by `insufficient_inventory` (`:246,259`), prints the location address, and shows a disabled
  "Bald verfügbar" card when none exist (`:303-312`). "Bald verfügbar" copy also in PDP
  (`modules/products/templates/index.tsx:99,173-176`) and trust strip (`modules/home/components/trust-strip/index.tsx:16-17`).

**TriCon side (already built, waiting for a pickup option to exist):**
- `workflows/tridata/steps/upload-order.ts:102-113` `pickupFilialnameFromOptions`: the order's shipping option must
  have `service_zone.fulfillment_set.type === "pickup"` AND `fulfillment_set.location.name` must be a value of
  `TRIDATA_BRANCH_MAP` (default `Oldenburg -> BikeOne Oldenburg`, `Osnabrück -> BikeOne Osnabrück`,
  `lib/tridata/config.ts` `DEFAULT_BRANCH_MAP`). Result becomes `Order.Filialname`, `DeliveryTerm = "Abholung"`,
  and the separate DeliverAdress is dropped (`helpers/build-upload-order.ts:246,304-305`). Anything else = `Versand`.
  So the only prerequisites are: pickup set linked to the right stock location, option on a zone of that set.
  Unit tested in `workflows/tridata/__tests__/build-upload-order.unit.spec.ts`. The mock does not use Filialname
  of orders for anything but display (`apps/tricon-mock/src/ui.ts:310`).
- `steps/apply-tribike-states.ts:74-146`: TriCon state `Geliefert` creates a fulfillment at the option's location and marks it delivered.
  For pickup this will mean "abgeholt".

**Stock per location (already real):**
- `steps/sync-stock.ts:82-85,275-300`: `stocked_quantity = floor(MengeVerfuegbar) + reserved_quantity` per
  (inventory item x location via branch map); cron every minute (`jobs/tridata-stock-sync.ts:38`), full sync nightly.
  So Medusa `available_quantity` per location equals TriCon `floor(MengeVerfuegbar)` of that branch after each sync.
- Dev data: 62 variants with inventory items, 62 levels per location. Available at: both 32, only Osnabrück 12,
  only Oldenburg 13, neither 5. 5 reservations exist, all at Oldenburg.
- 287 of 349 variants have `manage_inventory=false` and no inventory item (always buyable). Only the 62 seeded ones are managed.

**What Medusa 2.21.1 gives natively (read in `node_modules/@medusajs/core-flows`):**
- `GET /store/shipping-options?cart_id=` (`cart/workflows/list-shipping-options-for-cart.js`) returns for each option
  `service_zone.fulfillment_set.type` and `.location.address`, and `insufficient_inventory` = some cart item
  (manage_inventory=true, no backorder, requires_shipping) has no level or `available_quantity < quantity` AT THAT OPTION'S
  LOCATION (`:260-278`). Items with `manage_inventory=false` never count as insufficient. Options are only listed for
  fulfillment sets of locations linked to the cart's sales channel and whose service zone geo zones match the cart's
  shipping address (country de).
- Adding a shipping method replaces earlier methods of the same shipping profile (`add-shipping-method-to-cart.js:126-133`).
  With one profile a cart is therefore entirely shipping OR entirely pickup. No split carts.
- The Store API has no per-location availability for variants. `variants.inventory_quantity` is the SUM over all
  locations of the sales channel (`@medusajs/utils` `get-variant-availability.js`), which is what the PDP uses today
  (`modules/products/components/product-actions/index.tsx:127-143`). So "in stock" on the PDP today can mean "only in the other store".
- The admin already supports pickup fulfillments: "Mark as picked up" button for a fulfillment whose option is in a pickup set (dashboard `app.js:162704-162860`).

**Two gaps found that the owner's idea runs into:**
1. Reservation does not follow the pickup store. `cart/utils/prepare-confirm-inventory-input.js:177` collects the
   locations that have enough stock and `cart/steps/reserve-inventory.js:41` reserves at `location_ids[0]`, whatever shipping
   option is chosen. A pickup order for Osnabrück may reserve at Oldenburg (all 5 dev reservations are at Oldenburg).
   Effect after the stock sync is small (available = TriCon value either way), but until TriCon reflects the order the
   wrong store shows less stock, and fulfillment (`Geliefert`) deducts at the option's location.
2. Complete-cart checks stock over the whole sales channel, not at the chosen pickup store
   (`confirmInventoryStep`, `prepareConfirmInventoryInput` `locationsWithAvailability`), and the
   `insufficient_inventory` flag is only a UI hint: a stale or direct API call can still place a pickup order for a store without stock.
   Also `listCartShippingMethods` is fetched with `cache: "force-cache"` (SF `lib/data/fulfillment.ts:26`), so the flag can be stale.

## 2. Target behavior per surface

German UI text; wording below is a proposal for the owner.

- **PDP** (SF `modules/products/...`): below the buy box, per selected variant, two lines:
  "Oldenburg: abholbereit" / "Osnabrück: aktuell nicht vorrätig" (owner wording: "Abholbereit in Oldenburg", "nicht vorrätig").
  Loaded client-side from the availability route (no cache), because stock changes every minute. If the route fails or the
  variant is unmanaged: show nothing (never a false "nicht vorrätig"). Replace "Bald verfügbar" card. "Abholbereit" is a
  readiness promise: only use it if the owner confirms a hold time/readiness (open decision 2), else "Verfügbar in Oldenburg".
- **Cart**: one line under the summary: "Abholung möglich in: Oldenburg, Osnabrück" / "nur in Oldenburg" / "Abholung nicht möglich:
  <Artikel> ist in keinem Store vorrätig" (derived from the same route for all cart variants). Informational, no action.
- **Checkout, step 2 (Versandart)**: list shipping option(s) as today plus "Abholung in der Filiale" with one radio per
  store that has a pickup option: name, address, hours, price "0,00 €" (explicit, PAngV). A store is disabled with a reason when
  not all items are available there ("Nicht vorrätig in Oldenburg: <Artikel>"). Native `insufficient_inventory` drives the
  disabled state; the availability route only supplies the item names. Remove the "Bald verfügbar" card. Address step stays as is
  (billing/contact address still needed; for pickup the shipping address is ignored by TriCon).
  Summary/step "done" line shows "Abholung in Oldenburg".
- **Checkout, step 3/4 (Zahlung)**: online payment only in v1 (SumUp). Before creating the payment session (and again on
  place order) re-check availability at the chosen store; if gone, block with a clear German message and send the customer back to step 2.
- **Order confirmation + order details + print**: pickup block instead of "Lieferadresse": store name, address, phone,
  opening hours, "Wir informieren dich per E-Mail, sobald deine Bestellung abholbereit ist." (only if the ready-mail is built, step 8),
  what to bring (order number, ID, see open decision 5). Data source below (`pickup-stores` route). Redesign plan has the layout.
- **E-mail** (`workflows/order-confirmation/build-email.ts`): for pickup replace the address block and "Versand" row by
  "Abholung in <Filiale>, <Adresse>, <Öffnungszeiten>" and "Abholung: 0,00 €"; the Widerrufsbelehrung text mentions delivery
  and Rücksendung and must be adapted by legal (pickup variant). Later: separate "Bestellung ist abholbereit" mail.
- **TriCon**: no code change expected (see §1). Verify with the mock that the order arrives with `Filialname=Oldenburg`,
  `DeliveryTerm=Abholung`. Dependency on TriData (unverified, ask them): does an uploaded web order with a `Filialname`
  reduce `MengeVerfuegbar`/raise `Reserviert` at that branch? The mock does not. If real TriCon does not, the stock sync
  (`available = floor(MengeVerfuegbar)`) would give the reservation back and the item could be sold twice.
- **Admin**: staff creates the fulfillment for a pickup order and uses the native "Mark as picked up"; TriCon `Geliefert` does the same automatically.

## 3. Data / API design (Medusa-native first)

**Setup data (one idempotent migration script, `src/migration-scripts/`, runs after the existing seed, also usable on prod):**
- Per store: fulfillment set type `pickup` linked to that stock location (reuse the existing `BikeOne Oldenburg pick up` set
  by name+type, create the Osnabrück one), one service zone with geo zone country `de` (the existing pickup set has none; without a
  zone the option is never listed. The geo zone is what the Store API address filter matches; verify what the admin creates for pickup).
- Per store: shipping option `Abholung in Oldenburg` / `Abholung in Osnabrück`: provider `manual_manual`, default shipping
  profile, flat price 0 for `eur` and the region, rules `enabled_in_store=true`, `is_return=false`, type code `pickup`.
- Write `opening_hours` (string, German) into each stock location's `metadata` next to `email` (values from SF `STORES`, owner confirms).
  Keep `STORES` for the locator until the store-profile work replaces it (TODO.md); do not build a second source of truth silently:
  note in the script comment.

**One new public Store route** `GET /store/custom/pickup-stores?variant_ids=a,b` (`src/api/store/custom/pickup-stores/route.ts`,
pattern of `payment-method-labels`, zod validator in `validators.ts`, max ~50 ids, rate limit via `lib/rate-limit.ts`):
```
{ stores: [{ location_id, name, shipping_option_id, address: {address_1, postal_code, city}, phone, email, opening_hours,
             availability?: { available: boolean, missing_variant_ids: string[], unmanaged_variant_ids: string[] } }] }
```
- Stores = stock locations that have a pickup shipping option (so config-driven, no hardcoded list).
- Without `variant_ids` it is only the store list: used by the order pages to map `order.shipping_methods[].shipping_option_id`
  to a store (no need for custom order data, no customer-writable metadata; unknown option id, e.g. deleted option: fall back to the method name).
- `availability` per store from `product_variant_inventory_items -> inventory.location_levels.available_quantity` at that location
  (same data as the native flag); quantity per variant optional param `qty` map is NOT needed for PDP/cart hints (boolean `> 0`);
  checkout uses native `insufficient_inventory` (quantity-aware). Do not return stock counts publicly (competitor data, not needed).
- Pure function in `src/lib/pickup-availability.ts` + `__tests__/pickup-availability.unit.spec.ts`. It is a read, so no workflow; the write paths below are.

**Enforcement on the server (cannot rely on the UI):**
- `completeCartWorkflow.hooks.validate` (documented hook, must not mutate the cart): if the cart's shipping method belongs to a
  pickup set, every managed item must have `available_quantity >= quantity` at that set's location, else throw a clear error.
  Check how the SumUp flow orders payment authorization and cart completion (`PLAN.md` SumUp task, and the reconcile job the other
  agent is adding): a throw after money has moved needs the refund/reconcile path. Re-check in the payment-session step too so it rarely gets that far.
- Reservation location: subscriber on `order.placed` (new file next to `tridata-order-placed.ts`) moves the order's
  reservation items to the pickup location via the inventory module (`updateReservationItems` with `location_id`) when the
  reservation landed elsewhere. Must be idempotent and log-only on failure (never block the order; set an admin alert/metadata flag).
  Verify with an integration test that the inventory module adjusts `reserved_quantity` on both levels when a reservation moves
  (not verified, I did not read the inventory module's update path).
- Option for later if the subscriber proves racy: a custom complete-cart wrapper workflow. Not for v1.

## 4. Edge cases and proposed handling

| Case | Proposal |
| --- | --- |
| Mixed cart (bike in Oldenburg, accessory only in Osnabrück) | Pickup option per store is disabled for both, reason names the missing item. Offer shipping (one profile = one method). No split orders in v1. |
| Partial availability (qty 2 wanted, 1 in store) | `available_quantity < quantity` = disabled at checkout (native). PDP/cart hint uses `> 0`, so the PDP may say "abholbereit" while checkout says "nur 1 vorrätig": show "nur begrenzt verfügbar" at cart when qty > available? Needs counts server-side only; return boolean `enough_for_cart` in the cart variant, not counts. |
| Stock changes between cart and payment | Re-check on payment step and in the validate hook (§3); native flag is re-read when the step opens; fetch shipping options no-store (`lib/data/fulfillment.ts:26`). |
| Sold out at chosen store after selecting it | Cart keeps the old shipping method, so the step must show a warning and clear/disable continue; the validate hook is the hard stop. Message: "Dieser Artikel ist in <Filiale> nicht mehr vorrätig. Wähle eine andere Filiale oder Versand." |
| Items that must ship (Laufradsatz builds) | Product/variant that cannot be collected needs a flag. Proposal: a second shipping profile `Nur Versand` for such products; pickup options use only the `default` profile, so Medusa itself refuses pickup (validate-shipping step) and options are not listed. Note: with two profiles a cart can hold two methods (pickup + shipping): decide whether to allow that (open decision 6). Builds are assembled by the dealer, so an in-store pickup might be even natural: owner decides. |
| `manage_inventory=false` (287 variants) | Native flag treats them as available everywhere, so pickup would be offered for any store without stock info. Proposal: not collectable until TriCon sets `manage_inventory=true` (tridata-variant-sync plan); route reports them in `unmanaged_variant_ids`, UI disables pickup for carts containing one, and the validate hook rejects them. Owner may instead choose "always offer, confirm by mail" (then it is not stock-based). |
| Pay on pickup vs online | v1 online only (SumUp). Pay in store needs a second payment provider (Medusa has no per-shipping-option provider filter), a "bezahlt" step for staff and `Bezahlt=false` to TriCon (already supported). Own task after the owner decides. |
| Hold time / no-show | Medusa has no expiry. v1: no automatic cancel; staff cancels manually (cancel -> `UploadOrderChangeStorno`, already built). Policy text in AGB. |
| Cancel or change of order after placing | Existing cancel flow; reservation release follows Medusa. Pickup store change by the customer: not in v1 (cancel and re-order, or contact). |
| TriCon down | Order upload retries (existing `*/2` job); pickup is decided on the shop side, so no dependency at order time. |
| Stock sync not live / no TriCon configured | Without `TRIDATA_*` the levels are whatever was seeded. Pickup then works on seeded data (dev) or shows no availability (route returns `available:false` for missing levels = native behaviour `!level -> insufficient`). Document; do not offer pickup in production before the real sync runs. |
| Notification wording | Confirmation mail pickup variant (§2). Ready-mail wording needs owner input (hold time, ID). No "Versand"/"Lieferung" words on pickup orders anywhere. |

## 5. Legal / compliance touchpoints (scope for `legal-security-reviewer`)

- **Widerruf**: a pickup order is still a distance contract (ordered online). 14 days start when the consumer takes possession,
  i.e. at pickup (BGB §355/356 Abs. 2). Return in the store must be possible and stated; return cost rules for bikes (§357 Abs. 5)
  stay as in the existing return plan. The Widerrufsbelehrung in the mail/AGB currently talks about delivery and shipping and
  needs a pickup variant. Open owner questions already listed in `.working-files/legal-compliance/rueckfragen-rueckgabe-widerruf.md` §9.
- **PAngV / price display**: pickup shown as an explicit option with "0,00 €"; total stays gross incl. MwSt; the shipping-cost
  note (`lib/util/shipping-note.ts`) and PDP wording must not imply that shipping always costs money. No delivery-time claims.
- **Claims must be true (UWG)**: "abholbereit", "vorrätig", "in 2 Stunden" are factual promises; the legal-compliance plan A4 removed them
  because they were false. Availability can be up to one sync cycle old: wording "verfügbar", not "reserviert", unless an actual reservation is made at order time.
- **AGB**: pickup clause (TODO.md says add once bookable), hold time, no-show, pay-in-store terms if built, third-party pickup.
- **Customer data**: confirmation/ready mails and order pages show name and store (no new data collected). Pickup by third party or ID
  check at the counter is new processing: data minimisation, no ID copies. The new route is public and returns only store contact data
  and booleans (no counts, no customer data). Rate limit it. The new subscriber/hook only touches inventory.
- **Payments/checkout/pricing flow**: the validate hook and payment-step re-check touch the payment path (SumUp). Anything touching webhook
  handling must go through the reviewer (known gap, other agent's open work); do not change it here.

## 6. Implementation steps (each a separate expert-developer task)

1. **Setup script**: migration script creating pickup sets/zones/options and `opening_hours` metadata (idempotent, reuses the existing
   empty Oldenburg pickup set). Check `GET /store/shipping-options?cart_id=` returns both pickup options with address and
   `insufficient_inventory`. Document the admin steps for production in a short note in `TODO.md`/`PLAN.md` (the brief for that step says so).
2. **Store route + helper + unit test**: `pickup-stores` (§3), validators, rate limit, `defineMiddlewares` entry. HTTP integration test with seeded levels.
3. **Server enforcement**: `completeCartWorkflow` validate hook + `order.placed` reservation-move subscriber + integration test
   (pickup order at Osnabrück reserves at Osnabrück; stock gone at the store -> complete fails). Needs the SumUp ordering check first.
4. **Checkout UI**: pickup radios per store with availability/reasons, no-store fetch of shipping options, payment-step re-check, remove "Bald verfügbar".
5. **PDP + cart availability UI**; then restore real wording in PDP card, trust strip, header picker ("Abholung:"), `/standorte` ("Bald verfügbar" copy) after legal sign-off.
6. **Order surfaces**: confirmation page + order details (pickup block, shared with the redesign plan) + print.
7. **Mail**: pickup variant of the confirmation mail (`build-email.ts`, unit test next to existing ones). Optional "abholbereit" mail on
   `order.fulfillment_created` for pickup options (needs owner wording) and check `apply-tribike-states` against an existing staff-created fulfillment.
8. **E2E against the mock + docs**: pickup order through the Store API, mock shows Filialname/Abholung, staff "picked up" in admin, `Geliefert` pull-back;
   update `tricon-mock-contract.md` only if the mock is extended to reserve stock on `UploadOrder` (wire contract otherwise unchanged); update PLAN/TODO/AGB pickup clause; delete this folder when done.
9. **`legal-security-reviewer`** on steps 3, 4, 5, 7 before merge.

## 7. Test plan

- Unit: availability function (both/one/none, qty, manage_inventory=false, no level), mail builder pickup branch, route validator.
- Integration (HTTP, Postgres): pickup-stores route; shipping options listing with `insufficient_inventory` per store; complete cart rejected when the
  chosen store lacks stock; reservation location equals pickup location; shipping order unchanged (regression).
- E2E manual/Playwright (`localhost:8000/de`, mock on :3001): PDP lines for a variant in both / one / no store, cart hint, checkout select each store,
  stock edit in the mock mid-checkout, order page and mail text, `Filialname` in the mock UI, 360 px and 1440 px.
- Run `npm run lint`, `npm run test:unit`, `npx tsc --noEmit`; production build only if build config changes.

## 8. Risks

- TriCon may not reserve web-order stock per branch (unverified, mock does not): oversell risk after the next sync. Ask TriData before go-live.
- Stock is at most one sync (1 min) old, plus TriCon's own latency: a pickup promise can still fail; the validate hook + manual cancel path cover it.
- Failing complete-cart after payment (SumUp) needs the refund/reconcile path; coordinate with the SumUp work, do not touch the webhook.
- Hard-coded location names in `TRIDATA_BRANCH_MAP` / seed: renaming a stock location silently turns pickup orders into `Versand` uploads (existing design).
- Two profiles (for ship-only builds) change cart behavior (two shipping methods possible): needs its own test.
- Public availability route can be scraped for stock: boolean only, rate limited.

## 9. Decisions (owner, 2026-11-17) and what is still open

Decided:
1. Pay online only. No pay-in-store provider.
2. Hold time: about one week after "abholbereit" (owner unsure, "maybe a week"; confirm with the stores before the wording goes live).
3. Stock gone at the store after payment: if no replacement item can be obtained, the order is refunded.
4. Unmanaged variants (287 Woo imports): all test data, so some may be marked collectible for testing. Real catalog comes from TriCon with managed inventory.
5. No third-party pickup for now.
6. Custom builds (Laufradsatz/configured): pickup is possible but only after a lead time; the pickup is not available immediately.

Still open:
- Lead time for custom builds and how it is shown (fixed days per build, or a manual "bereit ab" date?).
- Hold-time wording and no-show handling (auto-cancel yes/no, refund fee none).
- Refund path for 3: who triggers it (staff in admin) and the customer mail wording.
- Opening-hours strings (Osnabrück Di-Fr vs Oldenburg Mo-Fr) and where they are maintained.
- Stock counts on the PDP (proposed: only available / not available).
- Ready-for-pickup mail in v1 and who triggers it.
- Minimum order value for pickup (proposed: none).
- Can a cart mix pickup and shipping items (proposed: no, one method per cart).

## 10. Not verified

- Real TriCon behavior on `UploadOrder` with `Filialname` (stock effect, which states a pickup order goes through, whether `Geliefert` means "abgeholt").
- That the inventory module re-balances `reserved_quantity` when a reservation's `location_id` is updated, and that the admin pickup flow works with a zone-less pickup set.
- Which fields the Store order API can expand for the shipping option's location (the route design avoids needing it).
- Whether the storefront address step shows the pickup option before a shipping address exists (the step order says the address comes first).
- Payment ordering in the SumUp flow (payment before or after cart completion); the Medusa docs MCP was not available, answers come from the installed `@medusajs/*` 2.21.1 source.
- Nothing was run in the browser; no endpoint was called except `GET /health`.
