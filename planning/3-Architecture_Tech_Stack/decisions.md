# Decisions

## Online payment service

We will use SumUp as our online payment service.

## Shop system

**Revised.** Originally decided as Shopware ("final entschieden," see `questions.de.md`). Reopened during Phase 6 planning and switched to **Medusa.js v2** (Node/TypeScript, self-hosted, PostgreSQL) — the cheapest point to change it, since no backend code existed yet. Reasons:

- Shopware's Community Edition carries a 2025 Fair Usage Policy capping free use at €1M annual GMV; crossing it forces a paid plan (≥€600/month "Rise") or loss of Store/Account access. Its plugin marketplace has also been rental-only since December 2023 (recurring, never amortizing). Medusa has no license cost or GMV cap at any scale, ever.
- Medusa ships a native, free, open-source multi-warehouse/stock-location module — a direct fit for BikeOne's 2-store Click & Collect model. Shopware's equivalent (Multi-Inventory) is paywalled behind its €6,500+/month "Beyond" plan.
- Medusa's Workflow Engine (step + compensation/rollback semantics) is purpose-built for exactly the kind of external-system sync the TriCon (Tridata ERP) integration needs.

Trade-offs accepted: Medusa has a real staffing/skillset bar (Node/TypeScript competency, no low-code operator fallback), a thinner DACH-specific agency ecosystem than Shopware, and no native German-market compliance features (VAT presets, the EU warranty/GARAN label) — these need to be built by hand rather than inherited from the platform. The full comparison (pricing tables, Medusa deep-dive, alternatives considered) lives in the Phase 6 planning record.

## Frontend framework

**Revised.** Originally decided as Angular ("Angular final," see `questions.de.md`). Reopened alongside the shop-system decision and switched to **Next.js** (App Router), reopened together since Next.js is Medusa's flagship, most-supported storefront target — its official starter ships cart/checkout/customer scaffolding and payment-provider wiring patterns ready to adapt. Next.js's SSR/React Server Components are also generally regarded (2026) as more production-refined for e-commerce SEO specifically than Angular Universal/`@angular/ssr`, which matters directly given SEO/Google Shopping eligibility is an explicitly flagged high-priority requirement (see below).

No implementation work is lost by this switch — no Angular code was ever written, and the Phase 4 wireframes are plain HTML/CSS, framework-agnostic. Medusa's own storefront layer is framework-agnostic too (its JS SDK is documented as working with Next.js, Vue, Svelte, and Angular) — Next.js was chosen for ecosystem fit and SEO maturity, not because Angular wouldn't have worked technically.

## Shop system / frontend — historical note

`questions.de.md` still shows the original stakeholder answers ("Shopsystem: Shopware, final entschieden," "Angular final") as they were given at the time — that record is kept as-is rather than rewritten, since it reflects an actual decision made by the actual stakeholder. Both were superseded during Phase 6 planning per the two sections above; `questions.de.md` carries its own pointer back to this file at each affected answer.

## Backend / merchandise management (Warenwirtschaft)

The backend (Wawi) is Tridata, integrated via Tricon. Unaffected by the shop-system change above — TriCon (SOAP/XML web service) is the same integration target regardless of which platform consumes it.

## Customer accounts / auth

bike-one.org has no existing customer or loyalty system to integrate with. We build new customer accounts from scratch for the shop, using Medusa's native Customer module.

## Payment methods

At launch we support card (Visa/Mastercard) and PayPal, both handled natively through SumUp's checkout API — no separate PayPal integration needed. Apple Pay / Google Pay wallets can be added later via SumUp's Swift Checkout SDK on the same integration, so they're not a v1 blocker. Neither Shopware nor Medusa ships a first-party SumUp integration — a custom payment-provider module is needed either way, so this was not a factor in the shop-system decision above.

## Frontend rendering (SEO)

Next.js's App Router renders product/category pages server-side (SSR) and/or at build time (SSG) by default, so Google and the Merchant Center feed crawler receive fully-rendered HTML instead of an empty shell — no extra SSR package or configuration step needed, unlike Angular's opt-in `@angular/ssr`. Paired with schema.org `Product` structured data (JSON-LD), canonical URLs (`alternates.canonical`), and a generated `sitemap.xml` via Next.js's native `sitemap.ts` route, per the Google Shopping eligibility requirement in [planning/2-Product_Requirements/questions.de.md:128-135](../2-Product_Requirements/questions.de.md).

## Frontend architecture / CSS conventions

Prefer container queries (`@container`) over media queries for component-level responsive behavior. A component (product card, filter panel, store-selector, etc.) should adapt to the width of its own container, not the viewport — this is what lets the same component work correctly whether it's rendered full-width on a page or embedded narrow inside a sidebar (e.g. a cart summary), which media queries can't do since they only see the viewport. Media queries stay fine for page-level layout shifts (e.g. switching a page from a single column to a sidebar+content grid).

Build every reusable piece of UI — buttons, cards, common layouts (sidebar+content, tab/step nav, etc.) — as a standalone, reusable React component, not one-off markup duplicated per page. This is what the [Click & Collect store-selector wireframe](../../wireframes/click-collect-filiale.html) demonstrated: one component definition, mounted both as a full standalone page and embedded in a narrower checkout context, adapting via its own container query rather than needing two different implementations. This principle is framework-agnostic and survived the Angular→Next.js switch unchanged; only the component implementation language changes (React/JSX instead of Angular templates).

## Hosting — open

3-stage setup decided: dev / staging / prod, dockerized. Provider not yet decided. Constraints that narrow the field, **revised for Medusa/Next.js**:

- Medusa self-hosted needs a Node.js runtime, **PostgreSQL** (not MySQL/MariaDB), and Redis (production event bus, persisted Workflow Engine state, caching) — lighter than Shopware's stack in one meaningful way: **search is optional** in Medusa (Postgres alone covers a catalog this size; Meilisearch/Algolia are addable later, not a day-one requirement), removing the mandatory Elasticsearch/OpenSearch dependency that drove Shopware's cost risk below.
- GDPR favors an EU data residency region for customer/order data — unchanged.
- **mittwald's specific advantage (purpose-built Shopware hosting) no longer applies** to a generic Node/Postgres/Redis stack — it's no longer a standout candidate, just one generic option among several.
- Two more candidates are now worth comparing that weren't relevant for a PHP/Shopware stack: **Railway** and **Render** (both strong, low-ops-burden fits for Dockerized Node + Postgres + Redis). **Vercel** is now a stronger fit than before specifically for the Next.js storefront (Medusa's own flagship deployment target for it) — still only ever covers the frontend, paired with a separate host for the stateful Medusa backend/worker/Postgres.

| Option | Fit | Trade-off |
| --- | --- | --- |
| AWS (eu-central-1, Frankfurt) | Full-stack fit (ECS/Fargate or App Runner + RDS **Postgres** + ElastiCache Redis), mature security/compliance tooling (IAM, KMS, audit trail) | Cheaper than the old Shopware estimate (no forced OpenSearch), but still the most ops-heavy option — someone assembles/maintains the stack |
| Azure (Germany West Central or West Europe) | Same full-stack fit via Container Apps + Azure Database for **PostgreSQL** + Azure Managed Redis; scale-to-zero for cost control | Slightly more moving parts than Railway/Render for a small team, though more compliance tooling |
| Railway / Render | Purpose-built for exactly this shape (Dockerized Node + Postgres + Redis), minimal ops burden, fast to set up | Less enterprise compliance tooling than AWS/Azure; smaller/newer companies than the hyperscalers, worth checking their current EU data-residency options specifically |
| mittwald | Still viable as a generic managed-container host, but its headline "Shopware-aware" differentiator no longer applies | No longer a standout pick the way it was for Shopware — re-evaluate on the same footing as Railway/Render |
| Hetzner Cloud (Germany) | Cheapest full-stack fit, EU data residency | Fully self-managed — doesn't match a "managed service" preference |
| Vercel (frontend only) | Best-in-class Next.js hosting — an even stronger fit now than for Angular SSR, since Next.js is Medusa's own flagship storefront target | Cannot host the Medusa backend/worker/Postgres — pair with one of the above |

Ballpark cost also improves versus the old Shopware estimate: removing the mandatory-OpenSearch requirement removes the single biggest cost-risk line item (a real production OpenSearch cluster alone could run ~$1,600/month on AWS). A precise updated price comparison is worth redoing once Phase 6 architecture is further along and an actual host shortlist is picked — not repeated here to avoid stale numbers; see the Phase 6 planning record for the reasoning behind removing OpenSearch as a cost driver.
