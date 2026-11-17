# bike-one-shop

E-commerce storefront for BikeOne, a German multi-brand bike retailer with two physical stores. Rebuild of the shop with modern Click & Collect and ERP (TriCon/Tridata) integration.

## Contents

- [Overview](#overview)
- [Status](#status)
- [Quick start](#quick-start)
- [Local URLs](#local-urls)
- [Dev logins and data](#dev-logins-and-data)
- [Make targets](#make-targets)
- [Repo layout](#repo-layout)
- [Production build](#production-build)
- [Further reading](#further-reading)

## Overview

- **Stack**: Medusa.js v2 (backend/commerce engine) + Next.js (storefront), PostgreSQL + Redis.
- **Core features**: product catalog across brands/categories, cart + 4-step checkout, customer accounts, Click & Collect pickup at either store, GDPR-compliant data handling.
- **Integration**: two-way sync with BikeOne's TriCon/Tridata ERP (stock, orders, customers) — see `planning/3-Architecture_Tech_Stack/tricon-integration-notes.md`.
- **Compliance**: German Impressum, GDPR, EU consumer-rights (Widerrufsrecht, price display) — legal sign-off required pre-launch.

## Status

Planning phases 1-5 (research, requirements, architecture, wireframes, DB schema) are done. Build phase 6/7 (backend + frontend scaffold) is started: a working Medusa.js v2 backend and Next.js storefront run together locally, seeded with a small real bike catalog (Trek/Cervélo/Factor/Specialized).

The storefront still runs Medusa's generic starter UI — the custom design from `wireframes/` isn't wired in yet.

SumUp payments and TriCon/Tridata ERP sync are prepared (official SumUp plugin installed and conditionally wired; a logged TriCon client stub in place) but **not active** — both wait on real sandbox credentials. See `PLAN.md` for the current milestone and known issues, `TODO.md` for the open list, and `planning/ROADMAP.md` for the original roadmap.

## Quick start

Prerequisites: Docker (for Postgres + Redis), Node.js and npm.

```bash
make setup   # one-time, idempotent: starts Postgres/Redis, installs deps, creates env files,
             # runs DB migrations (seeds the catalog on first run), creates a dev admin user,
             # wires the storefront's publishable API key
make dev     # starts Postgres/Redis, then backend (:9000) + storefront (:8000) together
```

Stop the infra with `make down` (keeps data).

## Local URLs

Available after `make dev`:

| What | URL | Notes |
| --- | --- | --- |
| Storefront | http://localhost:8000 | Redirects to `/de` (Germany-only region for now) |
| Shop / product listing | http://localhost:8000/de/store | |
| Cart | http://localhost:8000/de/cart | |
| Standorte | http://localhost:8000/de/standorte | Store info, map, preferred store; `/de/click-collect` redirects here |
| Customer account | http://localhost:8000/de/account | Login / register, orders, addresses |
| Checkout | http://localhost:8000/de/checkout | Needs a non-empty cart |
| Admin dashboard | http://localhost:9000/app | Medusa admin, see [logins](#dev-logins-and-data) |
| Backend health | http://localhost:9000/health | `curl http://localhost:9000/health` |
| Store API | http://localhost:9000/store | Requires `x-publishable-api-key` header |
| Admin API | http://localhost:9000/admin | Requires an admin auth token |

Infrastructure (started by `make up` / `make dev`):

| Service | Address | Credentials |
| --- | --- | --- |
| PostgreSQL 16 | `localhost:5432`, db `medusa` | user `medusa` / password `medusa` |
| Redis 7 | `localhost:6379` | none |

## Dev logins and data

These are **local development values only**. Never reuse them anywhere public.

| Account | Login | Password | Where |
| --- | --- | --- | --- |
| Admin user | `admin@bikeone.local` | `supersecret` | http://localhost:9000/app |
| Customer | none seeded | – | register at http://localhost:8000/de/account |

- The admin is created by `make setup`. Override it by setting `ADMIN_EMAIL` / `ADMIN_PASSWORD` before running it, e.g. `ADMIN_EMAIL=me@bikeone.local ADMIN_PASSWORD=secret make setup`. If the user already exists, setup skips it and does not change the password.
- No demo customer exists. Register one on the storefront with any email address — email verification is not required in this store's config.
- The storefront's publishable API key is read from the seeded DB by `make setup` and written to `backend/apps/storefront/.env.local`.
- Backend `.env` is created from `backend/apps/backend/.env.template` with `JWT_SECRET` / `COOKIE_SECRET` set to `supersecret` (dev only).
- **Payments**: without SumUp credentials the checkout uses Medusa's default system payment provider (`pp_system_default`), so orders can be placed with no real payment. To test SumUp, follow `SUMUP_SETUP.md`.
- **ERP sync**: inactive until `TRIDATA_WSDL_URL` / `TRIDATA_IDENTIFY_GUID` are set.

### Seed data

- `make setup` runs the DB migrations, which also seed the base data (region, stock locations, shipping, and the small Trek/Cervélo/Factor/Specialized catalog).
- Optional: add 50 demo products for testing pagination and filters. Safe to re-run.

  ```bash
  cd backend/apps/backend
  npx medusa exec ./src/scripts/seed-demo-products.ts
  ```

## Make targets

Run `make help` for the full list.

| Target | What it does |
| --- | --- |
| `make setup` | One-time dev setup (idempotent) |
| `make dev` / `make start` | Infra + backend (:9000) + storefront (:8000) |
| `make backend` | Infra + backend only |
| `make storefront` | Infra + storefront only |
| `make up` / `make down` | Start / stop Postgres + Redis (data kept) |
| `make status` / `make logs` | Container status / tail container logs |
| `make migrate` | Run pending Medusa DB migrations |
| `make install` | Install npm workspace dependencies |
| `make build` | Production build of backend + storefront |
| `make reset-db` | **Destructive**: wipe local Postgres/Redis data and re-run setup |
| `make deploy-dev` | Deploy `origin/dev` on the dev server (`DEV_HOST`, default `bee5`) |
| `make clean` | **Destructive**: stop infra and remove `node_modules` |

## Repo layout

```
.
├── backend/                 # turborepo monorepo (npm workspaces)
│   ├── apps/backend/        # Medusa.js v2 API server
│   └── apps/storefront/     # Next.js storefront
├── docker-compose.yml       # Postgres 16 + Redis 7 for local dev
├── scripts/setup.sh         # what `make setup` runs
├── planning/                # requirements, architecture decisions, local dev setup, DB schema
├── wireframes/              # interactive mobile-first HTML mockups (design reference)
├── example-product-images/  # sample product photos used for seeding
├── PLAN.md                  # task-by-task build log, source of truth for "what's done"
├── TODO.md                  # short list of what's open/blocked
├── SUMUP_SETUP.md           # activating the SumUp sandbox
└── Makefile                 # repo-root dev commands
```

## Deployment (git-based)

One long-lived branch per server: `dev` is deployed to the dev server (bee5, `shop.bike-one.dev`), `production` will be deployed to the production server. Push the branch, then deploy:

```bash
git push origin <branch>:dev
make deploy-dev     # ssh bee5 'cd ~/bike-one-shop && scripts/deploy.sh dev'
```

`scripts/deploy.sh <branch> [--force]` runs on the server: fetches `origin/<branch>` (hard reset, local tracked changes are discarded), runs `npm ci` only when a `package*.json` changed, builds and migrates the backend, builds the storefront against the running backend, restarts the systemd units, and smoke-tests the Store API. Backend and storefront are down for a few minutes while it builds; `scripts/maintenance/` serves a German 503 page on ports 8000 and 9000 meanwhile (it stays up if a deploy fails). There is no automatic rollback: revert on the branch and deploy again. Logs: `journalctl -u bikeone-backend -u bikeone-storefront`.

Per-server state that is not in git: `backend/apps/backend/.env`, `backend/apps/storefront/.env.local`, `~/bike-one-data/` (uploads, admin credentials, last deployed commit), the `bikeone-*` systemd units and a read-only GitHub deploy key (`~/.ssh/bikeone_deploy`, wired in the checkout's `core.sshCommand`). See `REVIEW_TASKS.md` for the env settings a server needs.

## Production build

`npm run build` (from `backend/`) builds the Medusa backend + admin dashboard successfully. The storefront's `next build` currently fails on Next.js's own auto-generated `/404`/`/500` error-page prerendering (not on any real app route) — see `PLAN.md` Task 3. `next dev` is unaffected.

## Further reading

- `PLAN.md` — build log and known issues
- `TODO.md` — open and blocked items
- `SUMUP_SETUP.md` — SumUp sandbox activation
- `planning/ROADMAP.md` — original phase plan and reasoning
- `planning/5-Database_Schema/schema-design.md` — planned DB schema and custom modules
- `backend/AGENTS.md` — backend/storefront conventions, commands, code style
