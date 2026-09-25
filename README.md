# bike-one-shop

E-commerce storefront for BikeOne, a German multi-brand bike retailer with two physical stores. Rebuild of the shop with modern Click & Collect and ERP (TriCon/Tridata) integration.

## Plan

- **Stack**: Medusa.js v2 (backend/commerce engine) + Next.js (storefront), PostgreSQL.
- **Core features**: product catalog across brands/categories, cart + 4-step checkout, customer accounts, Click & Collect pickup at either store, GDPR-compliant data handling.
- **Integration**: two-way sync with BikeOne's TriCon/Tridata ERP (stock, orders, customers) — see `planning/3-Architecture_Tech_Stack/tricon-integration-notes.md`.
- **Compliance**: German Impressum, GDPR, EU consumer-rights (Widerrufsrecht, price display) — legal sign-off required pre-launch.

## Status

Planning phases 1-5 (research, requirements, architecture, wireframes, DB schema) are done. Build phase 6/7 (backend + frontend scaffold) is started: a working Medusa.js v2 backend and Next.js storefront exist and run together locally. See `PLAN.md` for the current milestone, what's done, and known issues. Full original roadmap and reasoning: `planning/ROADMAP.md`.

## Repo layout

- `backend/` — turborepo monorepo (npm workspaces)
  - `backend/apps/backend` — Medusa.js v2 API server
  - `backend/apps/storefront` — Next.js storefront
- `docker-compose.yml` — Postgres 16 + Redis 7 for local dev
- `planning/` — requirements, architecture decisions, local dev setup, DB schema
- `wireframes/` — interactive mobile-first HTML mockups (design reference, not yet wired into the storefront)

## Local development

```
make setup   # one-time: starts Postgres/Redis, installs deps, creates env files,
             # runs DB migrations, creates a dev admin user, wires the storefront's API key
make dev     # runs both backend (:9000) and storefront (:8000)
```

`make help` lists every target (`backend`, `storefront`, `migrate`, `down`, `reset-db`, etc.) — see the `Makefile` at the repo root. `make setup` is idempotent, safe to re-run.

Backend health check: `curl http://localhost:9000/health`. Storefront: open `http://localhost:8000` (redirects to the seeded `/dk` region). Admin dashboard: `http://localhost:9000/app` — `make setup` prints the dev admin login (default `admin@bikeone.local` / `supersecret`; override with `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars before running it).

Production build: `npm run build` (from `backend/`) builds the Medusa backend + admin dashboard successfully. The storefront's `next build` currently fails on Next.js's own auto-generated `/404`/`/500` error-page prerendering (not on any real app route) — see `PLAN.md`'s Task 3 for details; `next dev` is unaffected.
