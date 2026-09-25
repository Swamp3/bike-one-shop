# bike-one-shop

E-commerce storefront for BikeOne, a German multi-brand bike retailer with two physical stores. Rebuild of the shop with modern Click & Collect and ERP (TriCon/Tridata) integration.

## Plan

- **Stack**: Medusa.js v2 (backend/commerce engine) + Next.js (storefront), PostgreSQL.
- **Core features**: product catalog across brands/categories, cart + 4-step checkout, customer accounts, Click & Collect pickup at either store, GDPR-compliant data handling.
- **Integration**: two-way sync with BikeOne's TriCon/Tridata ERP (stock, orders, customers) — see `planning/3-Architecture_Tech_Stack/tricon-integration-notes.md`.
- **Compliance**: German Impressum, GDPR, EU consumer-rights (Widerrufsrecht, price display) — legal sign-off required pre-launch.

## Status

Planning phases 1-5 (research, requirements, architecture, wireframes, DB schema) are done or unblocked. Build phases (backend, frontend, testing, deploy) are next. Full roadmap and reasoning: `planning/ROADMAP.md`.

## Docs

- `planning/` — requirements, architecture decisions, local dev setup, DB schema
- `wireframes/` — interactive mobile-first HTML mockups
