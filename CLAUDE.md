# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BikeOne storefront rebuild: a German multi-brand bike retailer with two physical stores. Stack: Medusa.js v2 (commerce backend) + Next.js (storefront), PostgreSQL + Redis. Core features: multi-brand catalog, cart + 4-step checkout, customer accounts, Click & Collect pickup at either store, GDPR-compliant data handling, two-way sync with BikeOne's TriCon/Tridata ERP (stock, orders, customers).

Current status lives in `PLAN.md` (detailed build log, task-by-task) and `TODO.md` (short punch-list of what's open/blocked). Read those before assuming a feature is done or a credential is live — several integrations (SumUp payments, TriCon/Tridata ERP sync) are code-complete but gated behind sandbox credentials that haven't arrived yet. `planning/ROADMAP.md` has the original phase-by-phase plan and reasoning; `planning/` also holds the DB schema design and architecture decisions that the current code is a subset of (several planned custom Medusa modules in `planning/5-Database_Schema/schema-design.md` don't exist as real modules yet — see Architecture below).

## Repo layout

```
.
├── backend/                 # turborepo monorepo (npm workspaces) — see backend/CLAUDE.md
│   ├── apps/backend/        # Medusa.js v2 API server
│   └── apps/storefront/     # Next.js storefront
├── docker-compose.yml       # Postgres 16 + Redis 7 for local dev
├── planning/                # requirements, architecture decisions, DB schema design, local-dev setup notes
├── wireframes/               # interactive mobile-first HTML mockups — design reference, not yet wired into the storefront
├── example-product-images/  # sample product photos used for seeding
├── PLAN.md                  # task-by-task build log, source of truth for "what's done"
├── TODO.md                  # short prioritized list of what's open/blocked, points into PLAN.md
├── SEO_AUDIT.md
└── Makefile                 # repo-root dev commands, wraps backend/ and docker-compose.yml
```

`backend/` has its own `CLAUDE.md` which points to `backend/AGENTS.md` — that file is the authoritative source for backend/storefront directory structure, package-manager detection, build/lint/test commands (including single-test invocations), DB migration commands, code style, and Medusa-specific conventions/common-mistakes. Read it before doing any work inside `backend/`. Do not duplicate its content here; this file only covers what's outside that scope.

## Local development (repo root)

```bash
make setup   # one-time: starts Postgres/Redis, installs deps, creates env files,
             # runs DB migrations, creates a dev admin user, wires the storefront's API key
make dev     # runs both backend (:9000) and storefront (:8000)
```

`make help` lists every target (`backend`, `storefront`, `migrate`, `down`, `reset-db`, `clean`, etc.) — see the `Makefile`. `make setup` is idempotent. `make reset-db` and `clean` are destructive (wipe DB / node_modules) — confirm with the user before running them.

- Backend health check: `curl http://localhost:9000/health`
- Storefront: `http://localhost:8000` (redirects to the seeded `/de` region — Germany-only for now)
- Admin dashboard: `http://localhost:9000/app` (`make setup` prints the dev admin login)
- Production build: `npm run build` from `backend/` builds backend + admin dashboard cleanly. The storefront's `next build` currently fails on Next.js's own auto-generated `/404`/`/500` error-page prerendering (not a real app route) — `next dev` is unaffected; see `PLAN.md` Task 3.

## Architecture

**Backend logic currently lives outside the "custom module" pattern the Medusa convention (`backend/AGENTS.md`) describes.** `src/modules/`, `src/workflows/`, `src/links/`, `src/subscribers/`, `src/jobs/` are all still scaffold-only (README stubs, no real code). Actual custom logic instead lives in:
- `backend/apps/backend/src/lib/tridata/client.ts` — logged TriCon/Tridata ERP client stub (not yet wired to a real WSDL endpoint; see TODO.md)
- `backend/apps/backend/src/lib/integration-logger.ts` — shared logging for integration code
- `backend/apps/backend/src/search/` — product search helpers (option-value resolution, pricing, product-id resolution) used to back storefront search/filtering
- `backend/apps/backend/src/migration-scripts/initial-data-seed.ts` and `src/scripts/seed-demo-products.ts` — data seeding
- `backend/apps/backend/src/api/store/custom/` and `src/api/admin/custom/` — currently placeholder routes only

When adding real business logic (the planned `product-brand`, `store-profile`, `tridata-stock-snapshot`, `saved-payment-instrument`, `order-fulfillment-extension`, `tridata-sync` modules from the schema design), follow the Medusa module/workflow convention in `backend/AGENTS.md` rather than extending the `src/lib` stub pattern further — the stubs predate those modules being built out.

**Storefront** (`backend/apps/storefront/src/`) follows the standard Medusa Next.js starter layout: `app/[countryCode]/(main)` and `(checkout)` route groups, feature-oriented `modules/<feature>/{components,templates}` (cart, checkout, click-collect, account, products, store, order, shipping, layout, home, collections, categories), `lib/data` for server actions calling the Medusa API, `lib/hooks`/`lib/util` for client helpers. It still runs Medusa's generic starter UI — the custom design in `wireframes/` (interactive HTML mockups) isn't wired in yet.

**Integrations are feature-flagged on credentials, not removed:** SumUp payment provider and TriCon/Tridata ERP sync are both implemented and conditionally wired but inactive without real sandbox credentials (`SUMUP_API_KEY`/`SUMUP_MERCHANT_CODE`, TriCon WSDL URL). Don't assume "not active" means "not implemented" — check `PLAN.md` for the relevant task before rebuilding something that already exists gated behind an env var.

**Known unresolved security gap:** the installed `@sumup/medusa-plugin` (v0.1.0) does not verify incoming payment webhook signatures. Not exploitable today (nothing is live), but must be fixed (patch/fork the provider, or add a server-side status re-check) before real transactions go live. Route any related change through the `legal-security-reviewer` subagent.

## Compliance

This is a German/EU e-commerce site: Impressum, GDPR, TTDSG (cookie consent), Widerrufsrecht (right of withdrawal), and PAngV (price display) requirements all apply. German legal pages are currently placeholders. Use the `legal-security-reviewer` subagent before merging any change touching auth, payments, customer/personal data, third-party dependencies, or checkout/pricing flows — it issues a blocking/non-blocking verdict and is not a substitute for actual legal sign-off.

## Project-specific subagents

- `.claude/agents/legal-security-reviewer.md` — security + DACH/EU legal compliance review gate (see above)
- `.claude/agents/project-manager.md` — assesses repo state, plans next steps, delegates implementation to sub-workers
