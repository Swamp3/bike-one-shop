# Step 2 — Product Requirements / Project Plan: Open Questions

Before drafting the product requirements doc and project plan, need answers to the below. Grouped by topic. Answer inline (under each question) or in a reply, whichever is easier.

Context already known from Step 1 research (`planning/1-Market_Competitor_Research/`):

- This is the digital extension of **bike-one.org**, which already runs two physical stores (Oldenburg/Osnabrück area), with an existing distributor relationship (Sport Import) and existing supplier contracts.
- Three candidate positioning options were proposed: (1) Omnichannel Premium Hub, (2) B2B-Leasing & Gravel Specialist, (3) Boutique for Performance-Upgrades & Customization.
- Frontend stack preference stated: **Angular**, possibly **Tailwind**.
- **Tridata** stated as required software.

---

## 1. Positioning

- Which of the 3 positioning options (or a blend) do we commit to for v1? This drives catalog scope, brand mix, and price tier shown throughout the plan.
  -> We are starting as a Omnichannel Premium Hub, then we will tackle the leasing options and later upgrades and customization.
- Target launch region: DACH-wide from day one, or start regional (~150km around Oldenburg/Osnabrück) and expand later?
  -> We start with a more regional approach with in store fitting and builds or shipping prebuilt frames.

## 2. Existing systems & integrations

- **Tridata** — what exactly is it (POS / ERP / inventory management / accounting system) and what's the current setup in the two physical stores?
  -> Tridata is a comprehensive ERP (Enterprise Resource Planning), POS (Point of Sale), and inventory management system heavily used in the bicycle and sports retail industries.
- What data needs to flow between Tridata and the new online shop, and in which direction(s)? (e.g. stock levels out, orders back in, pricing sync, customer data)
  -> ?
- Does Tridata expose an API, export files, or a DB we can integrate against? Any existing docs/credentials/sandbox access?
  -> ⚬ TriCon WebService: Tridata exposes an API module specifically built for e-commerce called TriCon. It allows for custom integrations, and there are also pre-built connectors available for major platforms like WooCommerce and Shopify.
  ⚬ Source of Truth: Tridata remains the definitive Single Source of Truth (SSOT).
  ⚬ Database Architecture: The online shop requires its own local database to load pages quickly and manage web assets, but it functions as a subordinate. Inventory syncs continually via the API so that offline sales immediately update online stock, preventing overselling.
- Is Tridata the single source of truth for inventory, or does the shop need its own product/stock database that syncs periodically?
  -> ?
- Any other existing systems in use today (accounting, shipping/carrier tools, CRM, newsletter, payment terminal) that need to connect to the shop?
  -> ?

## 3. Tech stack

- Confirm: Angular for frontend, Tailwind for styling — final, or still open?
  -> Angular is final, Tailwind is proposed.
- Backend: any preference/constraint (language/framework), or fully open given it's a fresh build?
  -> no constraint. maybe js
- Hosting/infra preference (cloud provider, on-prem, existing hosting already used for bike-one.org)?
  -> initially on a dev server, preferably dockerized
- Auth: new customer accounts from scratch, or does bike-one.org already have a customer/loyalty system to integrate with?

## 4. Store & fulfillment integration

- Click & Collect: required for v1, or later phase?
  -> this is a requirement for v1. bikes are preassembled and can be fittet for the rider in store.
- In-store "Ready to Ride" pre-assembly before shipping: v1 requirement or later?
  -> custom bikes that are preassembled are a feature for after the initial launch. this should be the first added feature.
- Should online orders be visible/manageable by in-store staff (shared order queue), and through what system — Tridata itself, or the new shop's own admin?
  -> the already in place tridata instance will be the single source of truth.
- Returns: in-store returns for online orders — v1 requirement?
  -> yes. returns can be made physically in stores.

## 5. Catalog & commerce scope

- Product types for v1: bikes only, or bikes + accessories/apparel/components together?
  -> it can be alot of the store stock. so , accessories, components, bikes / frames.
- Estimated catalog size (# products, # brands) at launch?
  -> undecided. might be only a few items, but it might also be alot of the stock. nevertheless there needs to be a precheck of which items to list in the online shop.
- Bike configurator (frame/component customization, per Option 3) — v1 or later phase?
  -> Later phase; quickly after v1.
- JobRad / BusinessBike / Lease a Bike leasing checkout integration — v1 or later phase?
  -> later phase
- Payment methods required at launch (card, PayPal, SEPA, financing/leasing providers, Klarna, etc.)?
  -> ? undecided

## 6. Compliance (DACH/EU)

- Any existing legal/Impressum/GDPR text from bike-one.org's current site to reuse or must everything be drafted fresh?
  -> there might be texts available from bike-one.org. if possible it can be reused.
- Confirm a lawyer will review T&Cs/withdrawal policy before launch (per Roadmap Step 12 note) — timing for that review?
  -> ? is this required?

## 7. Scope, timeline, budget

- Target launch date or timeframe?
  -> preferably launch end of 2026 or start 2027.
- Any hard budget ceiling that should constrain scope/tech choices?
  -> not yet
- MVP definition: what's the smallest version worth shipping first vs. what can wait for v2?
  -> Shop frontend with tridata (tricon?) and at least 1 product available to buy.
  -> other feature for later can be a sync with `ebay kleinanzeigen`

## 8. Users & roles

- Who needs admin/back-office access (store staff, owner, external agency)? Roughly how many users, what roles?
  -> currently only owner and admin and possibly some store staff need access.
- Multi-language requirement (German only, or German + English) for DACH/EU-wide reach?
  -> Primary language is German. English can be included as secondary language.

## 9. SEO & Google Shopping (high priority)

- **Requirement:** SEO is high priority for v1. Product listings must be eligible for Google Shopping / Shopping ads ("sponsored" placements in Google search results), not just organic ranking.
- **Implication — technical SEO:** requires a Google Merchant Center product feed (product ID, title, description, price, availability, GTIN/MPN, image, category) kept in sync with live stock/price from Tridata via TriCon. Feed accuracy matters directly — Merchant Center suspends accounts for stale price/availability.
- **Implication — Google Ads:** sponsored placement itself requires a running Google Ads Shopping campaign linked to the Merchant Center feed; this is a budget/ops item, not just a dev task — confirm who owns ad spend and campaign management.
- **Implication — frontend architecture:** Angular is client-side-rendered by default, which is weak for crawlability and Core Web Vitals (both factor into organic ranking and Merchant Center review). Need Angular Universal (SSR) or prerendering for product/category pages, plus schema.org `Product` structured data, canonical URLs, sitemap.xml. Flagging this as an architecture decision for Step 3, not just a content task.
- Open: who owns product copy/metadata quality (titles, descriptions) needed for both SEO and feed approval — store staff, agency, or drafted with AI and reviewed in-house?

---

Once these are answered, next produce: product requirements doc + project plan (Roadmap Step 2), feeding into Step 3 (architecture & tech stack decisions).
