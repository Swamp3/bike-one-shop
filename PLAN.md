# PLAN.md

Single source of truth for build-phase work. See `planning/ROADMAP.md` for
the original phase overview (phases 1-5 = planning, done). This file
tracks phases 6+ (actual implementation), which had zero code as of this
plan's creation — the repo previously contained only planning docs and
static HTML wireframes.

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

### Task 1 — Docker Compose foundation (Postgres + Redis)
Status: not started

- Goal: `docker-compose.yml` at repo root providing Postgres 16 and
  Redis 7, matching `planning/3-Architecture_Tech_Stack/local-dev-setup.md`.
- Acceptance: `docker compose up -d postgres redis` starts both
  services healthy; ports/credentials match what backend `.env` expects.
- Files: `docker-compose.yml`, `.env.example` at root.
- Out of scope: TriCon/WireMock mock service (separate task below),
  staging/prod compose files.

### Task 2 — Medusa v2 backend scaffold
Status: not started (depends on Task 1)

- Goal: scaffold a Medusa v2 backend under `backend/` using the official
  `create-medusa-app` generator (or equivalent manual scaffold if the
  interactive CLI can't run non-interactively), configured against the
  Task 1 Postgres/Redis. Run migrations. Confirm the server boots
  (`/health` or admin API responds) and `npm run build` succeeds.
- Acceptance: `npm run build` in `backend/` succeeds; `npm run dev` (or
  `medusa develop`) boots without crashing and the store/admin API
  answers a request; DB migrations applied cleanly against the Task 1
  Postgres container.
- Files: `backend/` (new directory).
- Out of scope: any custom module from the schema-design doc, SumUp
  payment provider, TriCon sync — default Medusa scaffold only.

### Task 3 — Next.js storefront scaffold
Status: not started (depends on Task 2 for wiring, but scaffold itself is independent)

- Goal: scaffold the storefront under `storefront/` using Medusa's
  official Next.js Starter, pointed at the Task 2 backend's Store API
  URL via env config.
- Acceptance: `npm run build` in `storefront/` succeeds; `npm run dev`
  boots and the homepage renders (even with an empty/seeded catalog);
  no hardcoded secrets committed (`.env.local` gitignored,
  `.env.local.example` committed).
- Files: `storefront/` (new directory).
- Out of scope: custom BikeOne design system / wireframe integration
  (separate future milestone — wireframes in `wireframes/` are the
  reference for that later work, not wired in yet).

### Task 4 — Wire-up + smoke test + docs
Status: not started (depends on Tasks 1-3)

- Goal: verify backend + storefront run together end-to-end locally
  (storefront fetches product/region data from backend's Store API
  without CORS errors), document the bring-up steps, update root
  `README.md` status section to reflect real code now existing.
- Acceptance: documented smoke-test steps in README actually work when
  followed from a clean clone; `docker compose up` + two `npm run dev`
  commands gets a person to a working local storefront.
- Files: `README.md`, possibly `backend/.env.example`,
  `storefront/.env.local.example`.
- Out of scope: automated e2e test suite (tracked as a later milestone
  under "Testing & QA", roadmap phase 9).

## Next milestone (not started): Core commerce data model

Implement the custom Medusa modules and module links from
`planning/5-Database_Schema/schema-design.md` (brand, store-profile,
order-fulfillment-extension/Click&Collect, saved-payment-instrument),
seed sample BikeOne catalog data, and start wiring the storefront pages
against the real wireframes in `wireframes/`.

## Later milestones (not started)

- SumUp payment provider integration
- TriCon/Tridata sync (WireMock mock first, real sandbox when Tridata
  grants access — see `planning/3-Architecture_Tech_Stack/local-dev-setup.md`
  "Open blocker")
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

## Notes / decisions log for this plan

- 2026-09-25: repo assessed — planning-only, zero application code, no
  PLAN.md, no PRs/issues reachable (`gh` CLI not installed in this
  environment). Chose the walking-skeleton milestone above as the
  highest-value next step: it's the explicit, unblocked next roadmap
  phase (6+7), and every later milestone depends on it existing first.
