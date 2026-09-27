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
- **What's still needed once the sandbox account details arrive:**
  1. Drop `SUMUP_API_KEY`/`SUMUP_MERCHANT_CODE` into `.env`.
  2. Enable the `sumup` provider for the EUR region in Medusa Admin
     (Settings → Regions → Payment Providers) — registering it in code
     doesn't auto-enable it for a region.
  3. Storefront checkout UI: the default Next.js starter's payment step
     doesn't know about SumUp. Needs a `/checkout/sumup/return` page
     (the plugin's `redirectUrl` target) and a hosted-checkout redirect
     step in the payment flow. This depends on the custom storefront
     work below, not just the backend.
  4. Run the plugin's own documented sandbox checklist (hosted checkout,
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

## Later milestones (not started)

- Fix the Task 3 Next.js production-build issue (`/404` `/500`
  prerender crash) — needed before any real deploy, not needed for
  local dev.
- Finish SumUp activation once sandbox credentials exist — see Task 5.
- TriCon/Tridata SOAP integration itself (client stubbed + logged, see
  Task 6; WireMock mock first if sandbox access is delayed further,
  real sandbox when Tridata grants access — see
  `planning/3-Architecture_Tech_Stack/local-dev-setup.md` "Open blocker")
- Click & Collect checkout flow end-to-end
- Auth / customer accounts
- GDPR/legal compliance features (route through `legal-security-reviewer`
  before merge)
- Testing & QA (roadmap phase 9)
- CI/CD (roadmap phase 10) — no GitHub Actions workflow exists yet for
  build/test; `gh` CLI is unavailable in this environment so CI status
  couldn't be checked directly
- Hosting decision (roadmap phase 3's one open item) — blocks deploy,
  not local dev
- Containerize the Medusa backend/worker (per the original
  local-dev-setup.md compose shape) once there's a reason to (e.g.
  staging environment parity)

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
