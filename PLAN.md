# PLAN.md

Single source of truth for build-phase work. See `planning/ROADMAP.md` for
the original phase overview (phases 1-5 = planning, done). This file
tracks phases 6+ (actual implementation), which had zero code before this
milestone — the repo previously contained only planning docs and static
HTML wireframes.

## Current milestone: Walking-skeleton dev environment

Goal: get from "no code" to "the app builds/runs locally" — a Medusa.js
v2 backend and a Next.js storefront, wired together, booting via Docker
Compose, satisfying the repo's own exit bar (build cleanly, dev server
starts, one smoke-test path works end to end).

Explicitly OUT of scope for this milestone (tracked as later milestones
below): the custom Medusa modules from `planning/5-Database_Schema/schema-design.md`
(`product-brand`, `store-profile`, `tridata-stock-snapshot`,
`saved-payment-instrument`, `order-fulfillment-extension`,
`tridata-sync`), the real TriCon SOAP integration (mocked only),
SumUp payment provider, Click & Collect checkout flow, auth flows,
GDPR/legal features, CI/CD, hosting. Those need dedicated follow-up
milestones once the skeleton is running.

**Actual layout note:** the official `create-medusa-app --with-nextjs-starter`
generator produces a turborepo monorepo, not the flat `backend/` +
`storefront/` layout originally sketched below. Real layout:
- `backend/` — turborepo root (npm workspaces, `apps/**`)
  - `backend/apps/backend` — the Medusa v2 API server
  - `backend/apps/storefront` — the Next.js storefront
- `docker-compose.yml` — Postgres 16 + Redis 7, at repo root

Run everything from `backend/` via turbo: `npm run dev` (both apps),
`npm run backend:dev` / `npm run storefront:dev` (one at a time),
`npm run build` (both), see root `backend/package.json` scripts.

### Task 1 — Docker Compose foundation (Postgres + Redis)
Status: **done**

- `docker-compose.yml` at repo root, Postgres 16 + Redis 7 with
  healthchecks, matching `planning/3-Architecture_Tech_Stack/local-dev-setup.md`
  credentials (medusa/medusa/medusa).
- Verified: `docker compose up -d postgres redis` → both containers
  reach `healthy` status.
- Deviation from the original local-dev-setup.md compose file: that doc
  also containerized `medusa-backend`/`medusa-worker`. This milestone
  runs those via `npm run dev` on the host instead (matches the doc's
  own note that "Next.js runs outside this compose file for now") —
  containerizing the Medusa app itself is left for a later
  deploy/staging milestone, not needed for local dev.

### Task 2 — Medusa v2 backend scaffold
Status: **done**

- Scaffolded via `npx create-medusa-app@latest backend --db-url ... --with-nextjs-starter`
  (non-interactively; `--with-nextjs-starter` avoids an inquirer prompt
  that hangs with no TTY). Lives at `backend/apps/backend`.
- Migrations ran cleanly against the Task 1 Postgres container (148
  tables) and demo data was auto-seeded (regions, a stock location,
  products, inventory).
- Verified: `npm run backend:dev` (from `backend/`) boots
  `medusa develop`, server ready on port 9000, `GET /health` → 200,
  `GET /store/regions` (with publishable key) returns seeded data.
- Verified: `npm run build` (Medusa production build: backend + admin
  dashboard) completes successfully, no errors.
- Note: dev/build logs show `redisUrl not found. A fake redis instance
  will be used.` even though `REDIS_URL` is set in `apps/backend/.env`
  pointing at the Task 1 Redis container — cosmetic for local dev (an
  in-memory fallback works fine at this scale) but worth checking
  against the pinned Medusa version if it matters later (e.g. before
  running multiple backend instances).

### Task 3 — Next.js storefront scaffold
Status: **mostly done — one known issue**

- Scaffolded automatically alongside Task 2 (`--with-nextjs-starter`).
  Lives at `backend/apps/storefront`. Auto-generated `.env.local` with a
  working publishable API key already pointed at `http://localhost:9000`.
- Verified: `npm run storefront:dev` (from `backend/`) boots
  `next dev --turbopack` on port 8000, and `GET /` (redirects to
  `/dk`, the seeded default region) renders 200 with real product data
  fetched from the backend Store API — confirms CORS/wiring is correct
  end-to-end. No errors in either app's dev logs during this test.
- **Known issue, not resolved this session:** `npm run build` (Next.js
  production build) fails during static export of Next's own
  auto-generated `/404`/`/500` error pages (not any of our real
  `[countryCode]/...` app routes) with `TypeError: Cannot read
  properties of null (reading 'useContext')` (seen as a different but
  related "Minified React error #31" on the originally-scaffolded
  Next.js patch, 15.5.24). Tried and did not fix: bumping Next.js to
  15.5.26, reverting back to 15.5.24, adding a `global-error.tsx` root
  boundary (a real Next.js App Router best-practice that was missing —
  kept regardless since it's correct either way). The failure is
  isolated to Next's internal legacy error-page prerendering in this
  npm-workspaces monorepo layout, not to any BikeOne code — `next dev`
  is fully unaffected. Needs either a working GitHub-issue-informed fix
  (no web access in this session to search Next.js's tracker) or an
  upstream Next.js patch. **Follow-up task, not a blocker for the
  walking-skeleton bar** since dev mode is the primary smoke-test path
  and it fully works.
- Out of scope (unchanged): custom BikeOne design system / wireframe
  integration — wireframes in `wireframes/` are the reference for that
  later work, not wired in yet.

### Task 4 — Wire-up + smoke test + docs
Status: **done** (with the Task 3 build caveat noted above)

- Verified backend + storefront running together locally, storefront
  fetching real product/region data from the backend Store API, no
  CORS errors.
- Updated root `README.md` with the real repo layout and bring-up
  steps.
- `.env`/`.env.local` are gitignored (root `.gitignore`, ported from
  the scaffold, already covers `**/.env` and `**/.env.local`); no
  secrets committed. `apps/backend/.env` has scaffold-default dev-only
  secrets (`JWT_SECRET=supersecret` etc.) — fine for local dev, must be
  rotated before any shared/deployed environment.

## Next milestone (in progress): Core commerce data model

Implement the custom Medusa modules and module links from
`planning/5-Database_Schema/schema-design.md` (brand, store-profile,
order-fulfillment-extension/Click&Collect, saved-payment-instrument),
seed sample BikeOne catalog data, and start wiring the storefront pages
against the real wireframes in `wireframes/`.

**Storefront page-by-page redesign: done (Tasks 7-11).** Every page in
the "custom storefront" sub-thread kicked off in Task 7 now matches its
wireframe: homepage/chrome, category/collection/search listing, product
detail, cart/checkout, account, and Click & Collect store selection. The
custom-modules half of this milestone (brand, store-profile,
order-fulfillment-extension, saved-payment-instrument, tridata-sync) is
still not started — see Task 5/6 and "Later milestones" below.

- **Seed data — started.** `initial-data-seed.ts` now seeds 4 real bikes
  (Trek Domane SL 6, Cervélo Áspero-5, Factor Ostro VAM, Specialized
  Stumpjumper) across 3 categories (Road/Gravel/Mountain Bikes, plus an
  empty Accessories category) with Frame Size (S/M/L/XL) variants and
  realistic EUR/USD pricing. Verified end-to-end: fresh `make reset-db`
  migrates clean, `GET /store/products` returns all 4 with correct
  collection/category/variant/price data, and the storefront renders
  them at `/dk`.
  - **Brand is a stand-in, not the real thing.** The schema design calls
    for a dedicated `product-brand` custom module (see the table above).
    That doesn't exist yet, so each bike's brand is a native Medusa
    **Collection** (Trek/Cervélo/Factor/Specialized) instead — enough
    for brand pages/filtering to work today, but it should be replaced
    once the real `product-brand` module lands (migrate `collection_id`
    → the new module's link).
  - Still only 4 products (one per brand, no variety within a brand,
    no accessories) — fine as a smoke-test catalog, not representative
    volume. Expanding it can happen alongside or after the real brand
    module.

### Task 5 — SumUp payment provider: prepared, pending sandbox credentials
Status: **prepared, not activated**

- Installed the **official** `@sumup/medusa-plugin` (npm, maintained by
  SumUp — confirmed by inspecting the published package, not just its
  docs) into `backend/apps/backend`, rather than hand-rolling a custom
  `AbstractPaymentProvider`. It supports Hosted Checkout, the Payment
  Widget, refunds via SumUp Transactions, and Medusa's built-in payment
  webhook route.
- Registered in `medusa-config.ts`, but **only conditionally**: the
  plugin/provider entries are only added when both `SUMUP_API_KEY` and
  `SUMUP_MERCHANT_CODE` are set. The plugin's own `validateOptions()`
  throws on boot if either is missing, so without this guard the server
  wouldn't start at all until credentials exist. Verified both states
  directly: with the vars empty, `make dev` boots clean (current
  state); with fake placeholder values set, `GET
  /admin/payments/payment-providers` returned `pp_sumup_sumup` as
  registered and enabled, then removed the fake values again — so
  dropping the real sandbox credentials into `.env` needs no further
  code changes to activate it.
- Env vars added to `.env.template` (all empty/placeholder for now):
  `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `SUMUP_CHECKOUT_MODE`
  (defaults to `hosted`), `MEDUSA_BACKEND_URL`, `STOREFRONT_URL`.
- **Security review finding (2026-09-28), not yet fixed:** read the
  installed plugin's own compiled source
  (`node_modules/@sumup/medusa-plugin/.medusa/server/src/providers/sumup/service.js`,
  `getWebhookActionAndData`) — it decides the webhook action purely from
  `payload.data.event_type`/`.id`, with **no signature/checksum
  verification of the incoming request at all**. Confirmed no
  `signature`/`hmac`/`verify` logic anywhere in the package (`grep` over
  every file in it). This is a gap in the third-party plugin itself
  (v0.1.0, not SumUp's own official backend SDK), not something this
  project's code introduced — but as configured today, anyone who can
  reach `/hooks/payment/sumup_sumup` could POST a forged
  `CHECKOUT_STATUS_CHANGED` payload and have it treated as authentic
  (e.g. mark an unpaid order paid). No real transactions have gone through
  it yet (still unconfigured), so nothing has been exploited — but **this
  must be fixed or compensated for before real credentials/transactions
  go live**, not discovered after. Options to evaluate before activation:
  patch/fork the provider to verify SumUp's webhook signature (check
  SumUp's own API docs for the exact header/scheme), add an independent
  server-side confirmation step that re-fetches checkout status from
  SumUp's API rather than trusting the webhook payload alone, or raise it
  upstream with the plugin's maintainer. Route through
  `legal-security-reviewer` regardless, per this repo's own convention for
  anything touching payments, before enabling with real credentials.
- No secrets are currently at risk: `SUMUP_API_KEY`/`SUMUP_MERCHANT_CODE`
  are empty in `.env.template` (never a real value), `.env` itself is
  gitignored at both `backend/.gitignore` and
  `backend/apps/backend/.gitignore`, `git log --all` over every `.env`
  path in this repo's history shows nothing was ever committed, and no
  application code outside `medusa-config.ts` references the raw
  credential values (checked directly, not assumed).
- **What's still needed once the sandbox account details arrive:**
  1. Drop `SUMUP_API_KEY`/`SUMUP_MERCHANT_CODE` into `.env`.
  2. Fix or compensate for the webhook-verification gap above — before,
     not after, real credentials are dropped in.
  3. Enable the `sumup` provider for the EUR region in Medusa Admin
     (Settings → Regions → Payment Providers) — registering it in code
     doesn't auto-enable it for a region.
  4. Storefront checkout UI: the default Next.js starter's payment step
     doesn't know about SumUp. Needs a `/checkout/sumup/return` page
     (the plugin's `redirectUrl` target) and a hosted-checkout redirect
     step in the payment flow. This depends on the custom storefront
     work below, not just the backend.
  5. Run the plugin's own documented sandbox checklist (hosted checkout,
     widget, webhook-driven update, full + partial refund, the `amount:
     11` deliberate-failure test, expired/canceled checkout handling).

### Task 6 — TriCon/Tridata: shared debug-logging infra prepared
Status: **prepared, not activated** (no WSDL/IdentifyGuid yet)

- Added `src/lib/integration-logger.ts` — a small structured-logging
  wrapper for any external-system call. Every call gets a correlation
  ID and a consistent `[scope]` prefix (e.g. `[tridata]`), logged on
  start, success (with duration), and failure (with duration + error) —
  so once integration code exists, its traffic is filterable out of the
  rest of the backend's logs with `grep '\[tridata\]'`.
- Added `src/lib/tridata/client.ts` — a `TridataClient` stub covering a
  representative slice of TriCon's 44 functions (catalog, images,
  stock, orders, order state, invoices — one per category from
  `tricon-integration-notes.md`'s function table), every method already
  wired through the logger above. Each throws "not implemented" until
  filled in with a real SOAP call — intentional, so a caller fails
  loudly rather than silently no-opping.
- Added `TRIDATA_WSDL_URL`/`TRIDATA_IDENTIFY_GUID` to `.env.template`
  (empty placeholders).
- **What's still needed:** the actual blocker hasn't moved — no WSDL
  URL or `IdentifyGuid` yet (contact TriData support: +49 911 247675-0
  / support@tridata.de, per `tricon-integration-notes.md`). Once that
  exists: fill in `TridataClient`'s method bodies with real SOAP calls,
  and build the actual `tridata-sync` custom module (`TridataProductMap`,
  `TridataOrderMap`, `TridataSyncLog` — see the schema-design table
  above) that calls it on a schedule/workflow. The logging infra here
  is prep for that, not a replacement for it.

### Task 7 — Custom storefront: homepage + shared chrome
Status: **done** (first slice of a multi-page milestone)

- Replaced Medusa's generic starter design with BikeOne's own, matching
  `wireframes/homepage.html`: design tokens (colors, Oswald/Inter/
  JetBrains Mono fonts) ported into `tailwind.config.js` +
  `globals.css`; dark sticky header with mobile drawer, search (submits
  to `/store?q=`, no Algolia configured so no live suggestions), a
  Click & Collect store picker, and a category nav row; footer with
  real store/brand/category data; homepage hero (using the wireframe's
  own reference photo), trust strip, and a real product grid.
- All content is real backend data (`listCategories`/`listCollections`/
  `listProducts`), not the wireframe's hardcoded arrays. Fixed
  `money.ts`'s locale default (`en-US` → `de-DE`) so prices render as
  `4.999,00 €` everywhere, not `€4,999.00`.
- **Known placeholders, not bugs:** the store-picker's two BikeOne
  addresses are static (no public Store API for stock locations exists
  yet — needs the not-yet-built `store-profile` module); legal footer
  links (Impressum/AGB/Datenschutz/Widerrufsrecht) point at `#` rather
  than fabricated content, since that's GDPR/legal-compliance work, a
  separate flagged milestone.
- Verified in-browser with Playwright (mobile + desktop viewports):
  all 4 bikes render with correct data, mobile drawer and both
  store-picker variants open and work correctly. Caught and fixed two
  real bugs this way — an invalid Tailwind color class made the "DE"
  badge invisible (white-on-white), and the mobile store-picker panel
  overflowed off-screen (was positioned relative to its 38px icon
  button instead of the full header).
- Remaining pages, in the order agreed: category/PLP → product detail →
  cart/checkout → account → Click & Collect store-selection flow. Each
  is its own sizeable slice; continuing across follow-up turns.

### Task 8 — Custom storefront: category/collection/search listing pages
Status: **done**

- Matches `wireframes/gravelbikes.html`: breadcrumb, page head with a
  real result count, sort dropdown, a Frame Size filter (real
  product-option data, not the wireframe's mocked brand/price/usage
  facets — those don't map onto our actual data model), active filter
  chips, product grid, prev/next pagination. Mobile gets a slide-in
  filter drawer, desktop a sticky sidebar.
- **Bigger find:** `/store` (all-products page) was 100% Algolia
  InstantSearch under the hood, and this project has no Algolia
  credentials configured anywhere — it rendered nothing. That's also
  where the homepage's search bar links (`/store?q=...`), so search was
  silently broken end-to-end since Task 7. Replaced it with the same
  server-rendered approach the category/collection pages already used
  (no Algolia needed), and wired `q` through to Medusa's native
  product-list text filter — search now genuinely works. Removed the
  fully-dead Algolia component tree it left behind.
- Verified in-browser: category pages (including an empty one),
  collection/brand pages, search with results and with none, the Frame
  Size filter. Caught and fixed a second real bug — the header's result
  count didn't update when a filter was applied.

### Task 9 — Custom storefront: product detail page
Status: **done**

- Matches `wireframes/produkt-trek-checkpoint-sl6-axs.html`. Kept the
  existing variant-selection/`addToCart` logic entirely as-is (it
  already worked correctly — real Medusa cart mutations) and restyled
  around it: brand, title, stock row, a Frame Size grid, a CTA button
  showing the live price, a spec table, description, delivery/returns
  info, related products. Also restyled the mobile sticky action bar,
  which still had unstyled English copy clashing with the rest of the
  German UI once scrolled past the main CTA.
- **Deliberately doesn't match the wireframe on two points:** the spec
  table only shows fields we actually have (brand, frame sizes,
  weight) — the wireframe's frame/fork/groupset/wheel/tire rows are
  fabricated marketing copy for a different product, and real specs
  are TriCon/Tridata catalog data (see Task 6), not something to
  invent here. The gallery is a single "photo folgt" placeholder, not
  a multi-thumbnail set — there are no real product photos, and faking
  swappable thumbnails for nonexistent images would be worse than one
  honest placeholder.
- Verified in-browser: real add-to-cart end-to-end (select a size →
  cart mutation → header badge count updates), all 4 product pages
  render, mobile sticky bar now visually consistent.

### Task 10 — Custom storefront: cart & checkout
Status: **done**

- Matches `wireframes/warenkorb-checkout.html`. Cart page (`/[countryCode]/
  cart`): `.cart-item` cards with thumbnail/brand/name/size, a +/− qty
  stepper (replacing the old unstyled `<select>` dropdown), a remove link,
  and real German totals (Zwischensumme/Versand/Rabatt/MwSt./Gesamt). All
  mutations are the same real Medusa cart calls as before
  (`updateLineItem`, `deleteLineItem`, `applyPromotions`) — only the
  markup changed. Deleted the now-dead `cart-item-select` component the
  old dropdown used.
- Checkout (`/[countryCode]/checkout`): kept Medusa's real `?step=`
  accordion (`Addresses` → `Shipping` → `Payment` → `Review`, each backed
  by its real server action — `setAddresses`, `setShippingMethod`,
  `initiatePaymentSession`, `placeOrder`) and laid the wireframe's visual
  language over it rather than forcing it into the wireframe's separate
  step-nav-with-circles markup: a new `StepNav` component reflects real
  cart state (address filled, shipping method set, payment session
  active) as done/current/upcoming circles and lets you click back to any
  completed step; a shared `StepCard` gives every step the wireframe's
  card-with-title-and-edit-link shell; a new `checkout/components/
  form-field` gives the address forms the wireframe's labeled bordered
  inputs. A new minimal dark checkout header (logo, "Sicher einkaufen —
  SSL-verschlüsselt", back-to-cart) replaces the old generic "Medusa
  Store" header — deleted the now-dead `MedusaCTA` component and its
  Medusa/Next.js icon files along with it, since nothing referenced them
  once removed from checkout's layout.
- **Payment step is deliberately honest, not decorative.** Verified via
  `GET /store/payment-providers` that only `pp_system_default` (Medusa's
  built-in manual/test provider) is registered for this region —
  SumUp is prepared but not activated (Task 5), and no Stripe key is
  configured. The payment option-card is labeled "Testzahlung" with a
  plain-language note ("Schließt die Bestellung ohne echte
  Zahlungsabwicklung ab — aktuell ist noch kein produktiver
  Zahlungsanbieter angebunden") and an orange "nur zum Testen" badge,
  instead of the wireframe's fake credit-card entry form — showing that
  form would have implied a real charge that cannot happen here. Clicking
  it and placing the order runs the same real `sdk.store.cart.complete`
  call as before and produces a genuine Medusa order.
- **Click & Collect is shown, not faked.** There is no pickup
  fulfillment set in this store (confirmed via `GET /store/
  shipping-options` — only "Standard Shipping"/"Express Shipping" exist,
  both real `manual_manual` options), matching PLAN.md's existing note
  that the `order-fulfillment-extension` module isn't built. Rather than
  omit it entirely, both the cart sidebar and the checkout delivery step
  show it as a clearly disabled, greyed-out card labelled "Bald
  verfügbar — Abholung in Oldenburg oder Osnabrück ist noch nicht
  buchbar" — visible so it isn't a surprise, but not selectable and not
  wired to any fake behavior. `Shipping`'s real pickup-fulfillment-set
  code path (`_pickupMethods`) is left intact and would render real
  pickup options automatically once that module exists.
- **Checkout account choice deliberately simplified.** The wireframe's
  step 1 has a "Gast bestellen vs. Konto erstellen" radio with an inline
  password field. Real customer auth (login/register) already exists as
  its own flow at `/account`, entirely separate from the checkout form,
  and PLAN.md still lists full auth/account integration as a later,
  not-started milestone. Building a second, inline "create account"
  control here that doesn't actually create an account would be exactly
  the kind of fake functionality this task warned against, so checkout
  instead shows a one-line honest note for guests ("Du bestellst als
  Gast. Bereits Kunde? Jetzt anmelden.") linking to the real `/account`
  login/register page.
- Order confirmation (`/[countryCode]/order/[id]/confirmed`) restyled to
  match the wireframe's `.confirm-hero` (checkmark, "Danke für deine
  Bestellung!", real order number/email), a real items+totals summary, a
  real delivery/payment recap and the same return-policy copy used on
  the product page. Built as new `order/components/confirmation-*`
  components rather than restyling the existing shared `order/
  components/{items,shipping-details,help,order-details}` — those are
  also used by the account module's order-history detail page
  (`/account/orders/details/[id]`), which is out of scope for this task
  and stays untouched, matching the same discipline applied to the
  shared `Input`/`Checkbox`/`NativeSelect`/`Button` primitives used by
  account forms (checkout builds its own local `TextField`/`SelectField`/
  `StepSubmitButton` instead of restyling those shared components).
  `order/components/payment-details` was restyled directly since it's
  only ever used from the confirmation page.
- `npx tsc --noEmit` clean. `next lint` has a handful of pre-existing
  errors/warnings, all in files this task didn't touch (`global-error.tsx`,
  unrelated `lib/data/cart.ts` functions, `language-select`,
  `product-actions`) — confirmed via `git diff --stat` against each.
- Verified in-browser end-to-end with Playwright at both a 420px and a
  1400px viewport: browsed a category → product → added a Cervélo
  Áspero-5 to the cart → on the cart page, used the qty stepper (1→2,
  price recalculated live) and applied a real seeded 10%-off promotion
  code (`BIKEONE10`, created via the Admin API for this test, active in
  the store) → "Weiter zur Kasse" → filled a real shipping address
  (redirect correctly carried the submitted country code) → selected
  "Standard Shipping" (a real fulfillment option, €10) → selected the
  "Testzahlung" payment option → placed the order → landed on a real
  `/order/order_.../confirmed` page with a real Medusa order number,
  correct totals (subtotal, discount, shipping, total) and the address/
  payment recap. Repeated the full flow at mobile width, including
  opening/closing the collapsible "Bestellübersicht anzeigen" summary
  toggle. Confirmed the empty-cart state separately.
- **Bug found and ruled out, not fixed:** full-page Playwright
  screenshots of the checkout pages initially looked like the sticky
  dark header was rendering a second time mid-page. Isolated with a
  viewport-only (non-fullPage) screenshot and confirmed the header
  renders exactly once in the right place — it's a known Playwright
  `fullPage` artifact with `position: sticky` elements (they get
  re-painted at each stitched scroll segment), not a real bug.
- **Known pre-existing/out-of-scope, not touched:** MwSt. shows `0,00 €`
  throughout cart/checkout/confirmation because the `dk` region has no
  tax rates configured in the seed data — real cart/order data, a region
  setup issue rather than anything in the cart/checkout UI. Both
  Standard and Express shipping cost the same seeded €10 flat rate
  (unchanged Medusa demo fulfillment data, not something this task's
  scope covers).

### Task 11 — Custom storefront: account & Click & Collect
Status: **done** — last page of the custom-storefront milestone

- Matches `wireframes/mein-konto.html`. Kept the official Next.js
  starter's real account logic entirely as-is — login/register
  (`sdk.auth.*`), logout, `updateCustomer`, `createAddress`/
  `updateAddress`/`deleteAddress`, `listOrders`/`retrieveOrder`, and the
  order-transfer-request flow are all untouched real Medusa calls — and
  restyled the markup and information architecture around them:
  - A single `AccountNav` (`account-nav`) now renders one responsive tab
    list (horizontal scroll pills on mobile, sticky sidebar on desktop)
    that links to real routes — `/account/orders` (default, "Bestellungen"),
    `/account/profile` ("Meine Daten"), `/account/payment`
    ("Zahlungsmethoden"), `/account/logout` ("Abmelden") — replacing the
    starter's two separately-coded mobile/desktop nav blocks and its
    generic profile-completion "Overview" dashboard (deleted; nothing in
    the wireframe corresponds to it, and `/account` now server-redirects
    straight to `/account/orders`). `/account/addresses` (the old
    starter's own route) now redirects to `/account/profile` rather than
    404ing for anyone with an old link, since the wireframe folds the
    address book into "Meine Daten".
  - **Bestellungen**: a new `order-list` renders the wireframe's
    expandable `.order-card`s from real order data — real status pill
    (mapped from Medusa's actual `fulfillment_status` enum, not
    fabricated), real item rows, real totals. "Rücksendung im Store
    starten" is honestly scoped: it's a client-only reveal of static
    instructions ("bring the item with this order number to a store"),
    never a real return/refund API call (Medusa's return workflows exist
    but nothing in this storefront initiates one) — gated on
    `fulfillment_status === "delivered"` with an approximate 30-day
    window measured from the order date (there's no separate
    "delivered at" timestamp surfaced here, so this is a known
    approximation, not exact). The real order-transfer-request feature
    (`TransferRequestForm`, not in the wireframe but genuinely working)
    was kept and restyled rather than dropped.
  - **Meine Daten**: a new `personal-data-card` combines the starter's
    separate `ProfileName`/`ProfilePhone` editors into the wireframe's
    one card with one real "Speichern" (`updateCustomer`). Email is
    shown but disabled with an explanatory note, and the starter's
    `ProfilePassword`/standalone `ProfileEmail` editors were deleted
    outright rather than restyled — both were already non-functional
    stubs in the starter (`ProfileEmail` had a `// TODO: It seems we
    don't support updating emails now?` and never called an API;
    `ProfilePassword` only logged to the console), so wiring either into
    a real-looking "Speichern" button would have been exactly the fake
    functionality this project's discipline (see Task 5/10) rules out —
    and neither field exists in the wireframe's "Meine Daten" panel
    anyway. `address-book` was rebuilt with the wireframe's inline
    expand/collapse forms (add + per-address edit) in place of the
    starter's modal dialogs, still calling the same real
    `addCustomerAddress`/`updateCustomerAddress`/`deleteCustomerAddress`
    actions. The starter's separate `ProfileBillingAddress` (a second,
    parallel `is_default_billing` address form) was dropped — the
    wireframe has one address book, not a separate billing-address
    concept, and nothing else in the app reads `is_default_billing`.
  - **Zahlungsmethoden**: the wireframe shows a saved test VISA card and
    an "add card" form that collects a card number/expiry/CVC and
    pretends to save it. There is no `saved-payment-instrument` module
    (see "Later milestones") and no active payment provider besides
    Medusa's manual test provider (SumUp prepared, not activated — Task
    5/10) — nothing would actually store or charge a card. Collecting
    real-looking card details for a form that does nothing would be
    fake functionality, so this tab is instead an honest "Bald
    verfügbar" state, matching cart/checkout's existing treatment of
    Click & Collect.
  - **Abmelden**: a new `/account/logout` route (`logout-panel`) shows
    the wireframe's confirm card and calls the real `signout` server
    action on confirm — no fake "you are logged out" screen; after
    sign-out the real redirect to `/account` naturally shows the login
    form again, which *is* the "logged out" state.
  - Deleted now-fully-dead code after confirming no other references:
    the generic `checkout/components/submit-button` (superseded by a new
    local `account-button`, matching how checkout already has its own
    local `StepSubmitButton` for the same reason), `common/components/
    {input,modal,native-select}`, `lib/context/modal-context.tsx`, and
    the `eye`/`eye-off`/`map-pin`/`package`/`user` icon components —
    all were only ever reachable from the account files this task
    rewrote. Also fixed two real bugs found while restyling: `register`
    linked to `/content/privacy-policy` and `/content/terms-of-use`,
    neither of which exists (404) — pointed at `#` instead, matching the
    footer's own established placeholder pattern for not-yet-built legal
    pages; and `account-layout` linked to a `/customer-service` page
    that also doesn't exist — removed (not in the wireframe either).
- **Click & Collect is a real preferred-store picker, not a pickup/
  reservation flow.** Read `wireframes/click-collect-filiale.html` in
  full before building anything: it's not a checkout step, it's a
  demo-wrapped *component* (a store-select widget with a placeholder
  map, two store cards, and a toggle to preview it either standalone or
  embedded in a fake cart sidebar) meant to illustrate a Click & Collect
  UX that assumes a working pickup-fulfillment backend — one this store
  doesn't have (no `order-fulfillment-extension` module, no pickup
  fulfillment set — see Task 10's cart/checkout notes, still true).
  Rather than build something that *looks* like it reserves a pickup
  slot, this task separated what's real from what isn't:
  - **Real and built:** a new `/click-collect` page
    (`click-collect/components/store-select`) lets a customer pick
    Oldenburg or Osnabrück and save it as their preferred store — using
    the exact same `bikeone_preferred_store` localStorage key as the
    existing header `store-picker` (extended, not duplicated: both now
    read store data from a new shared `lib/data/stores.ts` instead of
    the store-picker's previous private copy, and the store-picker
    panel gained an "Alle Filialen & Öffnungszeiten →" link into the new
    page). Verified in-browser: selecting Osnabrück and saving updates
    `localStorage`, and the header strip on the homepage immediately
    reflects it on the next page load — a real, working, shared
    preference, not a second parallel mechanism.
  - **Deliberately left out, not fake-implemented:** the wireframe's
    per-store, per-product stock line ("3× auf Lager in dieser Filiale"
    / "Auf Bestellung — 2-3 Werktage") — there's no store-level stock
    API; the "reserve it, we'll hold it for you" copy — no pickup
    fulfillment exists to honor that; the "Termin für Bike-Fitting
    vereinbaren" appointment request ("✓ wir melden uns zur
    Bestätigung") — no appointment/CRM backend and no real contact
    channel to fabricate one from; and the wireframe's own
    developer-facing "Auswahl-Status" debug panel and embedded-in-cart
    demo toggle — both are wireframe-authoring aids, not something a
    real page should ship. The page instead carries a plain-language
    "Bald verfügbar" note that Click & Collect *ordering* isn't bookable
    yet, same tone as cart/checkout's existing disabled Click & Collect
    card.
- `npx tsc --noEmit` clean. `next lint` shows the same pre-existing
  errors/warnings as Task 10 noted, all in files this task didn't touch
  (`global-error.tsx`, `lib/data/cart.ts`, `shipping-address`,
  `language-select`, `product-actions`) — confirmed via `git diff
  --stat` against each; zero lint issues in any file this task added or
  changed.
- Verified in-browser with Playwright at both 420px and 1400px: full
  account lifecycle — registered a real test customer (no email
  verification required by this store's config), saw the real "Hallo,
  {first_name}" greeting and empty "Noch keine Bestellungen vorhanden."
  state, edited the personal-data card (phone number, saved and
  persisted), added a real address, edited it in place, deleted it
  (native confirm dialog, real `deleteCustomerAddress` call verified by
  the card disappearing), viewed the honest Zahlungsmethoden "Bald
  verfügbar" panel, logged out via the confirm flow, and logged back in
  — all against the real backend, no mocked data. Separately ran a full
  add-to-cart → checkout → place-order flow as this same test customer
  and confirmed the resulting real order (`#5`, `In Bearbeitung`,
  correct total) appears in "Bestellungen", expands to show the real
  line item, and correctly shows "Rücksendung erst nach Zustellung
  möglich." (not yet delivered). Tested Click & Collect: selected
  Osnabrück, saved it, confirmed `localStorage` held the real value and
  the header on a fresh page load showed it. No console/page errors in
  any of these flows.
- **Found, not fixed (out of scope):** the homepage hero trust strip
  (`wireframes/homepage.html` copy, Task 7, untouched by this task)
  reads "Click & Collect: online reservieren, innerhalb von 2 Stunden
  abholbereit im Wunschstore" — a claim that a real reservation/pickup
  flow exists, which is inconsistent with the honest "Bald verfügbar"
  treatment this task and Task 10 both gave Click & Collect everywhere
  else. Left untouched since editing the homepage is explicitly out of
  this task's scope; flagged here as a follow-up.

### Task 12 — Shop setup review: national availability, real inventory, color variants
Status: **done**

Rewrote `backend/apps/backend/src/migration-scripts/initial-data-seed.ts`
end to end. Verified with a fresh `make reset-db` (Docker/Postgres/Redis
brought up manually — `dockerd` wasn't running), `npx tsc --noEmit` clean
in both `apps/backend` and `apps/storefront`, `npx eslint` clean on the
rewritten file, and a real Playwright run against the running dev servers
(`/opt/pw-browsers/chromium`) covering the Store API, product pages, and
two full cart→checkout→order flows (see each part below and the closing
"Verification" note).

**1. National availability (region/shipping/tax) — deliberately DE-only,
not DE/AT/CH**
Replaced the old demo-seed region (`"Europe"`, 7 countries) with a single
`"Deutschland"` region: `eur` only, country `de` only, one `tp_system` tax
region for `de` (the other 6 countries' tax regions dropped entirely, not
left half-configured). Store `supported_currencies` is `eur` only (`usd`
removed, and dropped from every variant/shipping price too — a currency
the store doesn't support is dead data, not a hedge). Shipping-option copy
is the exact German text specced: "Standard-Versand" (`type.label`
"Standard", `type.description` "Versand in 2–3 Werktagen.") and
"Express-Versand" ("Express" / "Lieferung innerhalb von 24 Std."), same
€10 flat amount as before on both (no new pricing invented).
**This is a deliberate, documented narrowing of `schema-design.md`'s
DE/AT/CH region**, not an oversight — the user's own fresh feedback this
session asked to "start with national availability first to keep things
easy," which is narrower than the design doc and takes precedence per
that instruction. Widening back to AT/CH later is a small, additive change
(add `at`/`ch` to the region's `countries` array + two more
`createTaxRegionsWorkflow` entries), not a redesign.

**2. Two real stock locations, real fulfillment across both**
Replaced the single Copenhagen "European Warehouse" with two real
`stock_location` rows, addressed and phoned exactly as the storefront
footer already shows them (nothing invented): **BikeOne Oldenburg**
(Rheinstr. 16, 26135 Oldenburg, DE, 0441 984 894 83) and **BikeOne
Osnabrück** (Lengericher Landstraße 30, 49078 Osnabrück, DE, 0541 440 952
84). Both are linked to the default sales channel via
`linkSalesChannelsToStockLocationWorkflow`, called once per location, per
`schema-design.md`'s "2 fixed physical locations" decision (not a
simplification to revisit later).
`stock_location` has no native `email` field — that's exactly the gap
`schema-design.md`'s not-yet-built `store-profile` module (`opening_hours`
+ `email`, linked to `stock_location`) is designed to fill. Building that
real custom Medusa module (service, model, migration) was out of scope for
this seed-data task, so each location's email
(`OL@bike-one.de`/`OS@bike-one.de`) is stashed in the stock location's own
`metadata` field for now, exactly as the task scoped it — `store-profile`
itself is still a real, not-yet-started follow-up.
**Fulfillment/shipping shape, researched against Medusa's own source**
(`node_modules/@medusajs/*`, `docs.medusajs.com` was blocked — see §4):
read `@medusajs/link-modules`'s `fulfillment-set-location.js` and
`@medusajs/core-flows`'s `create-location-fulfillment-set.js`, which
confirm a `FulfillmentSet` links to exactly one `stock_location`
(`createLocationFulfillmentSetWorkflow`, the real admin-dashboard
"add fulfillment set to a location" flow, adds one `FulfillmentSet` per
location it's called on). The seed creates **one** shared `FulfillmentSet`
("BikeOne Versand") with **one** service zone ("Deutschland", country
`de`) and the two shipping options, structurally anchored to Oldenburg
(Medusa requires *some* single location). This is safe, not a shortcut
that silently drops Osnabrück's stock, because reading
`@medusajs/core-flows`'s `cart/utils/prepare-confirm-inventory-input.js`
(used by `completeCartWorkflow`) shows inventory reservation at checkout
is aggregated across **every** stock location linked to the cart's sales
channel — not tied to whichever location a shipping option nominally
points at. Confirmed this behaviorally, not just by reading source:
seeded `TREK-DOMANE-SL6-M-BLK` with `0` at Oldenburg and `1` at Osnabrück,
added it to a cart, completed a real order through "Standard-Versand" (the
Oldenburg-anchored option), and checked the inventory levels afterward —
`reserved_quantity` incremented at **Osnabrück**, the location that
actually had the stock, proving the order genuinely fulfilled from the
non-anchor location. Both locations also get a `fulfillment_provider_id:
"manual_manual"` link (not just the fulfillment-set-anchor location),
since either could end up holding the reservation and needs a registered
provider to carry a real `Fulfillment`.
A per-location `FulfillmentSet` (4 shipping options: 2 types × 2 stores)
was deliberately **not** built — it's the architecturally "purer" option
but would show the customer two identically-named, functionally
interchangeable "Standard-Versand" rows (the storefront's checkout
component doesn't even use `insufficient_inventory` to disable a
`shipping`-type option, only a `pickup`-type one — read
`checkout/components/shipping/index.tsx` to confirm), which is confusing
UX for zero behavioral benefit here. That real per-store structure is
what Click & Collect (a separate, later, explicitly blocked task — see
"Later milestones" below) will actually need, once it exists this
shipping-only task's shape doesn't have to be re-architected, just
extended with real `type: "pickup"` fulfillment sets.
Verified via the Store API: `GET /store/shipping-options?cart_id=...`
returns exactly 2 options (no duplication), each with the correct German
`type.label`/`type.description` and `€10` price.

**3. Realistic per-location inventory**
Replaced `stocked_quantity: 1_000_000` with a real `InventoryLevel` row
per (variant × location) via `createInventoryLevelsWorkflow`, called once
with entries for both locations. Quantities are **placeholder realism, not
real business numbers** — there is no TriCon/Tridata feed yet (still
blocked on WSDL/credentials, Task 6) — generated deterministically from
two interleaved repeating patterns (`OL_PATTERN`/`OS_PATTERN`, length 11)
indexed by each inventory item's sorted SKU, so the seed is reproducible
rather than using `Math.random()`: mostly small 1–5-unit quantities, a
handful of variants that are `0` at exactly one location (exercises
combined-across-locations availability, and the cross-location checkout
case verified in §2), and one variant per 11 that's `0` at **both**
locations (a genuinely sold-out combination). Confirmed via the Store API
after seeding: e.g. Factor Ostro VAM "L / Schwarz" and "XL / Weiß", Trek
Domane SL 6 "XL / Schwarz", and Specialized Stumpjumper "XL / Grün" all
came out fully sold out (`inventory_quantity: 0`) this run — the exact
list will differ if the seed data (product/variant count or order) changes
later, since it's a function of sort position, not hardcoded per-SKU.
`allow_backorder` was left at Medusa's default (`false`) — not
independently revisited this task, since the deterministic zero-stock
cases above already needed the sold-out path to be real, and "should
accessories allow backorder" has no accessories seeded yet to apply it to.
Audited the storefront's stock-aware UI as instructed
(`product-actions/index.tsx`, `option-select.tsx`, `mobile-actions.tsx`):
it already degrades correctly and needed **no fix**. `inventory_quantity`
is fetched on both the PLP-adjacent and PDP product queries
(`+variants.inventory_quantity` in `lib/data/products.ts`), and
`ProductActions`' `inStock` memo already correctly checks
`manage_inventory`/`allow_backorder`/`inventory_quantity > 0` per
fully-selected variant. Confirmed live via Playwright, desktop and mobile
viewports: a 0-stock combination (Factor Ostro VAM "L / Schwarz") renders
the desktop CTA disabled with the text "Ausverkauft" and the mobile sticky
bar's cart button disabled the same way, while switching to an in-stock
combination ("S / Schwarz", qty 9) immediately re-enables both with the
real price/"In den Warenkorb" label. This had simply never been exercised
against real stock numbers before (everything was `1_000_000`), not
actually broken.

**4. Color variants ("Farbe") — researched, not invented**
Added a second product option, **"Farbe"** (German — "Frame Size" stays
English on purpose, a pre-existing inconsistency this task didn't touch),
to all 4 seeded bikes, created inline per product
(`options: [{ id: sizeOption.id }, { title: "Farbe", values: [...] }]`)
rather than through the shared/reused `createProductOptionsWorkflow` path
`sizeOption` uses — that shared path enforces a **globally unique option
title**, confirmed the hard way (`Product option with title: Farbe,
already exists` on the first seed attempt) once a second product tried to
reuse it with different values.
**Manufacturer verification: blocked, not skipped.** Attempted `WebFetch`
against `trekbikes.com`, `cervelo.com`, `factorbikes.com`,
`specialized.com` (and `docs.medusajs.com`, for the fulfillment research
in §2) — every one came back `EGRESS_BLOCKED` from this session's network
egress policy (`curl "$HTTPS_PROXY/__agentproxy/status"` confirms this is
an organization-level policy denial, not a transient failure — per
`/root/.ccr/README.md`, the correct response is to report the block, not
route around it). A follow-up `WebSearch` (not a fetch of the
manufacturer's own page) surfaced plausible-looking current colorway names
for some models via third-party retailers, but results were inconsistent
across retailers/model-years and none of it could be verified against the
primary source. Per this project's standing no-fabrication rule, **every
color for all 4 products is therefore a plain, generic, honest fallback
name** — not manufacturer-verified for any of the four, and not presented
as if it were:
| Product | Farbe values (all generic fallback, none manufacturer-verified) |
| --- | --- |
| Trek Domane SL 6 | Schwarz, Blau, Weiß |
| Cervélo Áspero-5 | Schwarz, Grau |
| Factor Ostro VAM | Schwarz, Weiß, Blau |
| Specialized Stumpjumper | Schwarz, Grau, Grün |

Every size (S/M/L/XL) ships in every color, for all 4 products — a full
cross-product, not a mechanically-trimmed one, but for an honest reason:
with no real per-model size/color availability data to go on (the whole
point of the block above), inventing *exclusions* would itself be a
fabricated availability claim, so the full cross-product is the more
honest choice here, not a shortcut. That's 12 variants each for Trek/
Factor/Specialized and 8 for Cervélo (44 variants total, 88
`InventoryLevel` rows).
SKUs follow the existing `<PREFIX>-<SIZE>` convention, extended with a
3-letter color suffix (`BLK`/`BLU`/`WHT`/`GRY`/`GRN`), e.g.
`TREK-DOMANE-SL6-M-BLK`. Variant `title` is `"<size> / <color>"`, e.g.
`"M / Schwarz"`.
**Found, not fixed (flagged for whoever builds the swatch UI next):** the
order Medusa returns `product.options` in is **not consistent** between
products — Factor Ostro VAM renders "Frame Size" before "Farbe", but Trek
Domane SL 6 renders "Farbe" before "Frame Size" (confirmed live via
Playwright, `span.font-heading` text order on each PDP). Nothing in this
task's scope required a fixed order, but a size-then-color swatch layout
should not rely on `product.options` array order — sort/find by
`option.title` in the render layer instead of mapping the array
positionally.

**Frontend follow-up done (same task, storefront side):** built a real
color-swatch selector for "Farbe" and wired it to the gallery placeholder,
on top of the option/value data above.
`product-actions/color-swatch-select.tsx` is a new sibling to the existing
`option-select.tsx` (the Frame Size button grid) — small circular swatches
instead of text buttons, selected state via an accent ring, each color
name mapped to a real CSS color through a small local lookup
(`Schwarz`→`#111111`, `Blau`→`#2554c7`, `Weiß`→`#ffffff` with a visible
border since it'd otherwise vanish on the light card background,
`Grau`→`#8a8a8a`, `Grün`→`#2f7a3f`) — kept to exactly the 5 generic
fallback color names the seed actually uses, nothing invented. Which
selector renders for a given `option` is decided by `option.title ===
"Farbe"` (`product-actions/option-title.ts`), never by array position —
directly addressing the array-order inconsistency flagged above; confirmed
live that both option groups still render correctly and in their
product-specific order on both Trek (Farbe first) and Factor (Frame Size
first).
`ColorSwatchSelect` reuses the exact same `updateOption`/`setOptionValue`
plumbing `OptionSelect` already used — no parallel selection state was
built. That plumbing itself moved: the `options` state and its setter used
to live only inside `ProductActions`'s own `useState`; they're now owned by
a new `ProductOptionsProvider` (React Context,
`product-options-context/index.tsx`) so `BikeOneGallery` — a sibling of
`ProductActions` in `templates/index.tsx`, not a descendant — can read the
same selection. `ProductTemplate` (still a Server Component) wraps the grid
containing both `<BikeOneGallery>` and the `Suspense`-wrapped,
async-fetched `<ProductActionsWrapper>` in `<ProductOptionsProvider
product={product}>`; both children are passed through as ordinary JSX
composition (the standard Server-Component-renders-Client-Component /
Server-subtree-passed-as-children pattern), and the Context still reaches
`ProductActions` even though it's instantiated two Server Component layers
down inside `ProductActionsWrapper`'s async fetch, because Context
propagates through the rendered element tree regardless of the
Server/Client boundaries within it. `BikeOneGallery` itself became a
Client Component (`"use client"`) so it can call
`useProductOptionsContext()`.
Per-color product photos remain explicitly out of scope — there is still
no real photo to switch to, and inventing one was never on the table — but
the gallery is no longer a total no-op with respect to color: `Produktfoto
folgt` becomes `Produktfoto folgt — Farbe: Schwarz` (etc.) once a color is
selected, confirmed live to update immediately on swatch click, from both
the desktop selector and the mobile sticky-bar's expanded sheet.
`mobile-actions.tsx`'s expanded modal got the identical
`ColorSwatchSelect`/`OptionSelect` branch-by-title treatment as the desktop
`ProductActions` render, so Farbe and Frame Size both appear there too, in
whatever order that product's `product.options` gives them.
Verified live via Playwright (`/opt/pw-browsers/chromium`), desktop
(1280×900) and mobile (390×844) viewports, on Trek Domane SL 6 (Farbe
before Frame Size) and Factor Ostro VAM (Frame Size before Farbe): color
swatch counts match each product's Farbe value count (3 for both), both
option groups render in the product's own order on desktop and inside the
mobile sheet, selecting a color updates the gallery caption text exactly as
above, selecting the known 0-stock combination (Factor "L / Schwarz")
still correctly disables the CTA with "Ausverkauft" once color is part of
the selection, and a real add-to-cart on an in-stock combination (Factor
"S / Schwarz", €8.999,00) succeeded — the cart line item correctly reads
"Factor Ostro VAM — Größe S / Schwarz" at the right price. No console
errors during any of the above. `npx tsc --noEmit` and `npx eslint`
(via `next lint`) are clean on every changed/added file (the handful of
lint errors `next lint` reports elsewhere in the storefront predate this
change and are untouched).

**Cross-cutting fixes needed to make the above actually run:**
`scripts/setup.sh` hardcoded `NEXT_PUBLIC_DEFAULT_REGION=dk` (a leftover
from the old demo-seed region, which happened to include Denmark) — with
the region now `de`-only, the storefront's country-code middleware
couldn't resolve a default region without this. Fixed to `de`, plus the
matching stale `/dk` mentions in `README.md` and `backend/README.md`.

**Verification performed (per this task's own checklist):**
Docker (`dockerd` started manually, `docker info` confirmed healthy) +
`make up` + `make reset-db` (required — region/stock-location/inventory
shape changed) ran clean end to end. `npx tsc --noEmit` clean in both
`apps/backend` and `apps/storefront`; `npx eslint` clean on the rewritten
seed file. Verified via the Store/Admin API and Playwright against the
real running dev servers: `GET /store/regions` returns exactly one
Germany/EUR region; `GET /admin/stock-locations` shows both real
addresses; a product page shows both "Frame Size" and "Farbe" selectors
with real per-combination price/stock; a 0-stock combination is genuinely
blocked from add-to-cart (desktop and mobile); two full real orders were
placed end-to-end (cart → address → "Standard-Versand" → "Testzahlung" →
place order → real confirmation page with a real order number) — one an
ordinary in-stock purchase, one specifically exercising the
Oldenburg-anchored shipping option against Osnabrück-only stock to prove
§2's cross-location claim. Dev-server processes (including the detached
`@medusajs/cli/cli.js start --types` and `next-server` children, not just
the top-level `medusa develop`/`next dev`) were killed after verification.

### Task 13 — Bike configurator: swap groupset/wheelset/tires (component upgrades)
Status: **planning only** — user request 2026-09-29, no implementation yet.
This is not a new idea: `planning/2-Product_Requirements/questions.de.md`
line 88-89 already asked "Bike-Konfigurator (Rahmen-/Komponenten-
Customization) — v1 oder spätere Phase?" and answered "**Spätere Phase,
zeitnah nach v1**" (later phase, soon after v1) — v1 (the custom storefront
rebuild, Tasks 7-12) is now done, so this is that phase. It's also the
concrete expression of **positioning Option 3** from
`planning/1-Market_Competitor_Research/market_analysis-deep.md`
("Boutique für Performance-Upgrades & Customization" — modeled on
edelrad.de's real "Custom Builds" business, where individualized
frameset+component builds escape direct price-comparison and protect
margin, deliberately not the Canyon/Rose D2C-volume model or the
Bike-Discount/Fahrrad-XXL budget model). The wireframe's own PDP spec
table (`wireframes/produkt-trek-checkpoint-sl6-axs.html`) already lists
exactly the parts requested — Schaltung, Bremsen, Laufräder, Reifen — as
static facts today; this feature turns the configurable ones into real
choices.
**Not covered by `planning/5-Database_Schema/schema-design.md`** — that
doc explicitly lists "Bike-fitting appointment booking" etc. under "Out of
scope for v1" but never designed a configurator at all (it wasn't in
scope yet when written). This section extends that doc's own conventions
(native/extended/custom entity tagging, module-links not raw FKs,
Tridata-vs-shop-owned field tagging) rather than inventing a new
methodology — but it's new design, not a correction of something already
decided, unlike Task 12.

**Scope clarification: color is not part of this task.** "Farbe" (Task 12)
is already a real, working Medusa product option — it generates real
variants with their own price/stock, exactly like Frame Size. It stays
that way. This task is specifically about the *other* parts the user
named — Schaltung (shifting/groupset), Laufradsatz/Laufräder (wheelset),
Reifen/Schläuche/tubeless (tires/tubes) — because they need a genuinely
different mechanism, explained next.

**Why this can't just be more `product_option`s (the variant-explosion
trap).** Frame Size × Farbe already gave the 4 seeded bikes 8-12 variants
each (Task 12 §4). Adding Schaltung (e.g. 3 choices) × Laufradsatz (e.g. 3
choices) × Reifen (e.g. 2 choices) as more `product_option`s would
multiply that by 3×3×2=18 per existing combination — Trek alone would hit
~200 variants, each needing its own price and stock row, for combinations
that mostly won't be real inventory (a custom build is assembled to order
from component stock, not pre-built and shelved in every combination).
This also doesn't match how the actual business/competitor model works
(see edelrad.de note above): a customer picks a base bike, then upgrades
individual components with individual price deltas — not "a different
finished bike SKU per combination."

**Proposed architecture — base bike + real component upgrades, not a new
bundling engine:**

1. **Base bike stays exactly as Task 12 built it** — a real `Product`/
   `ProductVariant` via Frame Size + Farbe, real price/stock/SKU,
   unchanged.
2. **New custom module `bike-configuration`**, module-linked (not raw
   FKs, per `schema-design.md`'s own pattern):
   - `ConfigurableSlot` (linked to `product`) — declares which component
     *categories* a specific base bike can be configured on (e.g. Trek
     Domane SL 6 → slots "Schaltung", "Laufradsatz", "Reifen"). Not every
     bike gets every slot, and most bikes may get none at first (see MVP
     scope below) — this is deliberately opt-in per product, not a
     blanket feature.
   - `ComponentOption` (linked to a `ConfigurableSlot` **and** to a real
     `product`/`product_variant`) — each selectable upgrade points at an
     already-real, already-sellable product (e.g. a "SRAM Force AXS
     Upgrade-Kit" is itself a normal catalog product with its own real
     price, and — once Task 6's TriCon sync exists — its own real stock).
     The `ComponentOption` row itself carries no price/stock of its own;
     it's a join row (this component is offered as an upgrade, on this
     bike, in this slot), so price/stock is never duplicated or allowed
     to drift from the one real source. One `ComponentOption` per slot is
     `is_default: true` — the "included as standard" choice, €0 delta,
     replacing today's static spec-table fact with the pre-selected
     default of a real choice.
   - Routing every component through a real product (rather than a
     lighter "attribute + price delta" row with no product behind it)
     means Task 6's existing TriCon sync machinery
     (`tridata-stock-snapshot`, `TridataProductMap`) applies to components
     for free later — no second, parallel sync surface to build.
3. **Cart representation: ordinary line items with a shared build id, not
   a new composite-line-item/bundling engine.** Medusa has no native
   "line item with sub-line-items" concept, and building one is a large,
   risky lift for this task. Instead: a configured bike becomes N ordinary
   real cart line items — the base variant, plus one line item per
   selected *non-default* `ComponentOption`'s variant — all carrying a
   shared `metadata.build_id` (client-generated UUID) and
   `metadata.build_slot`. This is a well-established low-risk pattern (the
   same way "kit"/"bundle" products are commonly done without a dedicated
   bundle engine elsewhere) — cart/checkout/order-history UI groups
   line items sharing a `build_id` under one visual card ("Dein
   Custom-Build: Trek Domane SL 6"); the price total is just the ordinary
   line-item sum, no new pricing engine needed.
4. **Real tie-in to a feature that's already planned, not invented here:**
   `questions.de.md` line 74-75 separately answered that in-store
   "Ready to Ride" pre-assembly before shipping/pickup "**sollte das erste
   nachgelagerte Feature sein**" (should be the *first* post-launch
   feature) — i.e. the business already prioritized build-to-order
   pre-assembly as the top post-v1 feature, independent of this request.
   An order containing `build_id`-tagged line items is exactly the signal
   that workflow needs. This task does not build the staff-facing
   assembly/pick-list workflow itself (a separate future task) — it just
   makes sure the configurator's own data shape (the shared `build_id`)
   is what that workflow keys off, instead of needing its own separate
   marker invented later.
5. **Compatibility rules — deliberately manual for v1, not an automated
   engine.** Real compatibility (axle standard, brake mount, derailleur
   hanger spec, tire/frame clearance) is a genuinely hard rules problem.
   For v1: staff hand-picks a small, fixed set of `ComponentOption`s per
   slot per bike (e.g. "these 3 wheelsets are the ones we offer as
   upgrades on the Domane SL 6," decided by a human who knows it fits —
   not a generic parts catalog cross-checked automatically against
   frame specs). This sidesteps building a real compatibility engine now,
   at the cost of needing manual curation each time a new bike or
   component is added. An automated rules engine is explicitly a later
   stretch goal, not v1 scope, and shouldn't be started until manual
   curation actually fails to scale.

**Proposed phased rollout:**
- **Phase A (MVP)** — 1-2 flagship bikes, 2-3 configurable slots each
  (suggest Schaltung, Laufradsatz, Reifen/tubeless — matches what the user
  asked for and what the wireframe's spec table already shows), 2-3 real
  component options per slot including one included default, manually
  curated, cart grouping via `build_id`, a PDP configuration section with
  a live running price total, honest "not every bike is configurable yet"
  treatment elsewhere (same honesty discipline as every other feature in
  this project — no fake "customize" button on a bike that isn't wired
  up).
- **Phase B** — extend to more bikes/slots once the pattern is proven,
  and once Task 6's TriCon sync is real so component stock stops being
  manually maintained placeholder data (same caveat Task 12 §3 already
  carries for bike stock).
  - **Phase C** — wire into the real in-store pre-assembly fulfillment
  workflow (§4 above) and Click & Collect (a staff-facing build/pick
  list) — both already-tracked, separate future tasks this task's data
  shape is designed not to block.
- **Phase D (stretch, not scoped here)** — an automated compatibility
  rules engine, only if manual curation (§5) stops scaling.

**Open questions — need real business input, not guessable:**
1. Which specific components should actually be offered as upgrades, and
   on which bikes, for the MVP? This needs a real decision from BikeOne
   (or Sport Import's catalog), not an invented list — same
   no-fabrication discipline as Task 12's colors.
2. Does Tridata already carry these components as distinct sellable
   articles today, or would some need to be newly set up in Tridata
   itself before they can be synced? Determines whether component stock
   can ever be fully TriCon-real or has to stay manually maintained
   indefinitely.
3. Pricing model: is an upgrade's price simply the component's own retail
   price, or does BikeOne want a separate assembly/labor fee on top for a
   custom build? Not designable without a real answer.
4. Is there ever a scenario where a *downgrade* (choosing a cheaper
   component than the default) should credit the difference, or do
   upgrades only ever add cost? Affects whether `ComponentOption` needs a
   negative-delta case designed in from the start.

## Later milestones (not started)

- Fix the Task 3 Next.js production-build issue (`/404` `/500`
  prerender crash) — needed before any real deploy, not needed for
  local dev.
- Finish SumUp activation once sandbox credentials exist — see Task 5.
- TriCon/Tridata SOAP integration itself (client stubbed + logged, see
  Task 6; WireMock mock first if sandbox access is delayed further,
  real sandbox when Tridata grants access — see
  `planning/3-Architecture_Tech_Stack/local-dev-setup.md` "Open blocker")
- **Real Click & Collect order fulfillment — directly tied to TriCon
  order sync, not a separate blocker.** Task 11 built the honest part
  (preferred-store selection, real and working). Per
  `planning/3-Architecture_Tech_Stack/tricon-integration-notes.md`
  ("`Filialname` confirms the design"), the `order-fulfillment-extension`
  module's `pickup_store_id` field maps directly onto TriCon's
  `Filialname` field on the same `UploadOrder` call that order sync
  already needs to make — i.e. building TriCon order sync (Task 6) and
  enabling real pickup routing are largely the *same* piece of work, not
  two independent blockers to schedule separately. That mapping is
  itself gated on the still-open "one interface for all branches vs.
  one per branch" question to TriData support in the same doc — **ask
  this alongside the WSDL/`IdentifyGuid` access request**, since it
  decides whether `Filialname`-based per-store routing is even available
  on this TriBike install before any of this can be built.
  Beyond that shared piece, still needed: a pickup fulfillment set/
  shipping option registered in Medusa so `Shipping`'s existing
  `_pickupMethods` code path (cart/checkout, Task 10) has something real
  to render, the `tridata-stock-snapshot` module (Task 12 §2 above) for
  genuine per-store availability in the store-select component instead
  of nothing, and a decision on the bike-fitting-appointment feature the
  wireframe sketches (needs a real booking/contact channel, not built
  anywhere yet). Also: fix the homepage hero copy flagged at the end of
  Task 11 once this lands (or sooner, since it's currently an honesty
  regression against Task 10/11's Click & Collect messaging elsewhere).
- GDPR/legal compliance features (route through `legal-security-reviewer`
  before merge)
- **Real newsletter signup.** The footer's `NewsletterForm` (Task 7,
  `newsletter-form/index.tsx`) is currently a UI-only placeholder — on
  submit it just flips local state to show a static "confirmation email
  sent" message, with no email/newsletter provider wired up and nothing
  actually sent. This matches the wireframe's own static-confirmation
  behavior, so it's not a bug. A real implementation needs an actual
  email/newsletter provider integration (e.g. Klaviyo, Mailchimp, or a
  custom Medusa module) plus double opt-in, required for GDPR
  compliance on a German site.
- Testing & QA (roadmap phase 9)
- CI/CD (roadmap phase 10) — no GitHub Actions workflow exists yet for
  build/test; `gh` CLI is unavailable in this environment so CI status
  couldn't be checked directly
- Hosting decision (roadmap phase 3's one open item) — blocks deploy,
  not local dev
- Containerize the Medusa backend/worker (per the original
  local-dev-setup.md compose shape) once there's a reason to (e.g.
  staging environment parity)
- Mobile header layout: the mobile-only icon cluster in `Nav`
  (search/language/store/cart, `nav/index.tsx`) currently lays out as a
  horizontal row; it should default to one item per row instead. Flagged
  by the user alongside the desktop header height fix (Task: desktop
  header too tall) but explicitly deferred — needs its own mobile-layout
  pass rather than being folded into that fix.

## Notes / decisions log for this plan

- 2026-09-25: repo assessed — planning-only, zero application code, no
  PLAN.md, no PRs/issues reachable (`gh` CLI not installed in this
  environment). Chose the walking-skeleton milestone above as the
  highest-value next step: it's the explicit, unblocked next roadmap
  phase (6+7), and every later milestone depends on it existing first.
- 2026-09-25: walking-skeleton milestone executed. Backend (Medusa v2)
  fully works dev + build. Storefront (Next.js) fully works in dev
  (the actual smoke-test path) but has a known, isolated production
  `next build` failure — see Task 3 above. No sub-agent delegation tool
  was available in this session (this run was itself already a spawned
  subagent at the nesting limit), so scaffolding/verification was done
  directly rather than delegated, with the same
  verify-before-trusting-output discipline the delegation step would
  normally apply.
