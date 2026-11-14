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
│   ├── apps/storefront/     # Next.js storefront
│   └── apps/tricon-mock/    # stateful TriCon SOAP mock + inspection UI (:3001), see its README
├── docker-compose.yml       # Postgres 16 + Redis 7 for local dev
├── .working-files/          # in-progress feature plans and notes, not documentation (see below)
├── planning/                # requirements, architecture decisions, DB schema design, local-dev setup notes
├── wireframes/               # interactive mobile-first HTML mockups — design reference, not yet wired into the storefront
├── example-product-images/  # sample product photos used for seeding
├── PLAN.md                  # task-by-task build log, source of truth for "what's done"
├── TODO.md                  # short prioritized list of what's open/blocked, points into PLAN.md
├── SEO_AUDIT.md
└── Makefile                 # repo-root dev commands, wraps backend/ and docker-compose.yml
```

`backend/` has its own `CLAUDE.md` which points to `backend/AGENTS.md` — that file is the authoritative source for backend/storefront directory structure, package-manager detection, build/lint/test commands (including single-test invocations), DB migration commands, code style, and Medusa-specific conventions/common-mistakes. Read it before doing any work inside `backend/`. Do not duplicate its content here; this file only covers what's outside that scope.

## Working files vs. documentation

Files you create while working on a planned feature go in `.working-files/<feature-slug>/`, never in `planning/`, the repo root, or next to the code. That covers implementation plans, scratch notes, analyses, open-question lists, review checklists and sample data extracts. Example: `.working-files/plp-layout/plan.md`.

- Documentation stays where it is: `README.md`, `PLAN.md`, `TODO.md`, `planning/`, `backend/AGENTS.md`, app READMEs. Edit it only when the content is a lasting fact about the system or a decision that was made.
- `PLAN.md` and `TODO.md` remain the status sources. Link to the working folder from the relevant task instead of copying its content.
- When a feature is done, move whatever is still true (decisions, contracts, setup steps) into the matching doc (for example `planning/3-Architecture_Tech_Stack/decisions.md`), then delete the feature's working folder in the same change.
- `.working-files/` is committed so other sessions and people can pick up the work. Never put secrets, credentials, or real customer or personal data in it, including raw exports.
- It is a dot-directory: `ls` and some search tools skip it unless you pass hidden-file flags (`ls -a`, `rg --hidden`).

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
- Production build: `npm run build` from `backend/` builds backend, admin dashboard and storefront. The storefront build prerenders pages from the Store API, so the backend must be running (`make backend`) while it builds. Its `prebuild`/`prestart` hook (`apps/storefront/scripts/ensure-local-styled-jsx.js`) works around a React 18/19 hoisting conflict that used to crash the `/404` prerender — see `PLAN.md` Task 3.
- Running a production build: from `apps/backend/.medusa/server` on the workspace install (`npm ci` in `backend/`), not an `npm install` inside `.medusa/server`. Server steps: `REVIEW_TASKS.md`.
- `backend/package.json` overrides keep `next` nested in the storefront (React 19). Without them npm hoists it next to the backend's React 18 and the build breaks. After any dependency change, check that `@medusajs/framework` and `@medusajs/medusa` both stay in the root `node_modules`: split apart, the Store API hangs.

## Architecture

**Backend logic is partly in the "custom module" pattern the Medusa convention (`backend/AGENTS.md`) describes.** The TriCon/Tridata integration (PLAN.md Task 14) follows it: `src/modules/tridata-sync` and `src/modules/tridata-stock-snapshot`, `src/links/tridata-*`, `src/workflows/tridata/`, `src/subscribers/tridata-*`, `src/jobs/tridata-*`, admin API under `src/api/admin/tridata/`, admin page `src/admin/routes/tricon/` + order widget. Its SOAP client is `src/lib/tridata/` (against the mock until real credentials exist; wire contract in `planning/3-Architecture_Tech_Stack/tricon-mock-contract.md`), logging via `src/lib/integration-logger.ts`. Older custom logic still lives outside that pattern:
- `backend/apps/backend/src/search/` — product search helpers (option-value resolution, pricing, product-id resolution) used to back storefront search/filtering
- `backend/apps/backend/src/migration-scripts/initial-data-seed.ts` and `src/scripts/seed-demo-products.ts` — data seeding
- `backend/apps/backend/src/api/store/custom/payment-method-labels/` — public read of storefront payment labels from Store metadata

When adding real business logic (the remaining planned `product-brand`, `store-profile`, `saved-payment-instrument`, `order-fulfillment-extension` modules from the schema design), follow the Medusa module/workflow convention in `backend/AGENTS.md`, as the tridata modules do.

**Storefront** (`backend/apps/storefront/src/`) follows the standard Medusa Next.js starter layout: `app/[countryCode]/(main)` and `(checkout)` route groups, feature-oriented `modules/<feature>/{components,templates}` (cart, checkout, click-collect, account, products, store, order, shipping, layout, home, collections, categories), `lib/data` for server actions calling the Medusa API, `lib/hooks`/`lib/util` for client helpers. It still runs Medusa's generic starter UI — the custom design in `wireframes/` (interactive HTML mockups) isn't wired in yet.

**Integrations are feature-flagged on credentials, not removed:** SumUp payment provider and TriCon/Tridata ERP sync are both implemented and conditionally wired but inactive without real sandbox credentials (`SUMUP_API_KEY`/`SUMUP_MERCHANT_CODE`; `TRIDATA_ENDPOINT_URL`/`TRIDATA_IDENTIFY_GUID`, which `make setup` points at the local mock). Don't assume "not active" means "not implemented" — check `PLAN.md` for the relevant task before rebuilding something that already exists gated behind an env var.

**Known unresolved security gap:** the installed `@sumup/medusa-plugin` (v0.1.0) does not verify incoming payment webhook signatures. Not exploitable today (nothing is live), but must be fixed (patch/fork the provider, or add a server-side status re-check) before real transactions go live. Route any related change through the `legal-security-reviewer` subagent.

## Compliance

This is a German/EU e-commerce site: Impressum, GDPR, TTDSG (cookie consent), Widerrufsrecht (right of withdrawal), and PAngV (price display) requirements all apply. German legal pages are currently placeholders. Use the `legal-security-reviewer` subagent before merging any change touching auth, payments, customer/personal data, third-party dependencies, or checkout/pricing flows — it issues a blocking/non-blocking verdict and is not a substitute for actual legal sign-off.

## Project-specific subagents

- `.claude/agents/legal-security-reviewer.md` — security + DACH/EU legal compliance review gate (see above)
- `.claude/agents/project-manager.md` — assesses repo state, plans next steps, delegates implementation to sub-workers
- `.claude/agents/expert-developer.md` — implements, fixes and verifies scoped tasks under `backend/`; the project-manager's default sub-worker
