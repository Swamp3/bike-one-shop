# TriCon Mock + Inspection Screens — Implementation Plan

**Status:** in progress (planned 2026-10-29, implementation started 2026-10-29). Wire contract between mock and shop: [tricon-mock-contract.md](tricon-mock-contract.md).
**Deadline:** usable by the test phase, mid-November 2026 (target: ready by **Fri 2026-11-13**, so testers start Mon 2026-11-16 on a working setup).

## Why this is needed

Until TriData grants sandbox access (`TRIDATA_WSDL_URL` + `TRIDATA_IDENTIFY_GUID`, see `TODO.md`), testers have no way to see the ERP side of the shop: whether an order actually reached TriBike, what stock TriBike reports, or what happens when TriBike changes an order's status. The plan in `local-dev-setup.md` called for a WireMock-based TriCon mock, but it was never built.

## Current state (verified 2026-10-29)

| Piece | State |
| --- | --- |
| TriCon mock service | **Missing.** No WireMock container in `docker-compose.yml`, no `local-dev/tricon-mock/` stubs. `local-dev-setup.md` describes it only on paper. |
| `TridataClient` (`backend/apps/backend/src/lib/tridata/client.ts`) | Stub. 9 of 44 functions declared; every method calls `assertConfigured()` then throws `notImplemented`. Logging via `integration-logger.ts` is in place. |
| `tridata-sync` module (`TridataProductMap`, `TridataOrderMap`, `TridataSyncLog`) | Not built (designed in `schema-design.md`). |
| `tridata-stock-snapshot` module | Not built. |
| Sync jobs / subscribers (stock poll, `order.placed` → `UploadOrder`, order-state poll) | Not built; `src/jobs`, `src/subscribers` are scaffold-only. |
| Screen showing integration activity | **Missing.** Only `[tridata]` log lines, and none are emitted because nothing calls the client. |
| Screen showing mock data (items, stock, orders) | **Missing.** |

## Goals for the test phase

1. A TriCon mock that speaks the real protocol shape (SOAP/XML, real function names and fields from `tricon-interface-reference.html`), so switching to the real TriData endpoint later is a config change plus envelope adjustments, not a rewrite.
2. **Screen A — "TriCon Mock" (ERP side):** browse the mock's items, stock (per branch), and orders; see every incoming SOAP request; manually change data the way TriBike staff would (adjust stock, advance an order's state).
3. **Screen B — "TriCon Sync" (shop side, in Medusa admin):** what the shop sent/received and when — sync runs, per-call log, errors, and per-order sync status.
4. Real data flow through the shop: stock from the mock drives storefront availability; placed orders are uploaded to the mock; order state from the mock is visible.

## Key decision: stateful Node mock instead of WireMock

**Recommendation: replace the WireMock plan with a small stateful mock service in the monorepo (`backend/apps/tricon-mock`).**

WireMock serves canned responses. That is fine for "does the client parse `DownloadStock`", but the test phase needs state: an order sent via `UploadOrder` must show up in the orders list and in `DownloadOrderStateByOrder`; a stock change made in the UI must come back on the next `DownloadStockBranch(Delta)`. Doing that in WireMock means scenarios/templating plus a separate UI on top of its admin API — more work than a purpose-built service, and still awkward.

Mock design:

- **Runtime:** Node + TypeScript (run via `tsx`), Fastify, as a new npm workspace under `backend/apps/tricon-mock`, so it runs with `npm run dev` / `make dev` alongside backend and storefront. No Docker build needed. Port **3001** (matches `local-dev-setup.md`).
- **Protocol endpoint:** `POST /soap` accepting SOAP 1.1/1.2 envelopes. Dispatch on the body's operation element (`DownloadArtikel`, `UploadOrder`, ...). Validate `IdentifyGuid` against a configured dev GUID (wrong GUID returns a SOAP fault, matching real behaviour). `GET /soap?wsdl` serves a hand-written WSDL covering the implemented functions. XML parsing with `fast-xml-parser`, entity/DTD processing disabled (XXE hardening, per `schema-design.md`).
- **State:** a JSON file (`apps/tricon-mock/data/state.json`, gitignored), held in memory and written on every change — no native dependencies to build on the server. Collections: `artikel`, `grfa_kombi`, `stock` (per `ArtikelID`/`ArtikelGrFaKombiID` × `Filialname`, with `Lagerbestand`/`Reserviert`/`Bestellt`/`MengeVerfuegbar` as `REAL`), `orders` + `order_items` (raw uploaded payload kept as XML/JSON), `order_state_history`, `request_log`. `last_change` timestamps on rows so `*Delta`/`LastChange` functions work.
- **Seed:** a script that generates TriBike items from the existing Medusa demo catalog (`src/scripts/seed-demo-products.ts` data): one `ArtikelID` GUID per product, one `ArtikelGrFaKombiID` per variant, realistic stock for both stores. Output also includes the ArtikelID ↔ Medusa product/variant pairs, so the shop side can be linked without a full catalog import (see Phase 2). `npm run seed` / `reset` in the mock workspace.
- **Branch model — confirmed 2026-10-29:** one TriCon connection covers both stores (TriCon/TriData/TriBike is one combined system), so the "all branches" functions apply: `Filialname` on stock rows and orders, branches `Oldenburg` and `Osnabrück`. Color/size module is still assumed active (`DownloadGrFaKombi`) until TriData confirms; the mock supports both GrFa and plain items.

### Functions to implement (test-phase scope, 12 of 44)

| Area | Functions |
| --- | --- |
| Catalog | `DownloadArtikelAll`, `DownloadArtikel` (LastChange), `DownloadGrFaKombi` |
| Stock | `DownloadStockBranch`, `DownloadStockColorSizeBranch`, their `Delta` variants, `DownloadStockByArtikel` (checkout re-check) |
| Orders | `UploadOrder`, `UploadOrderChangeBezahlt`, `UploadOrderChangeStorno`, `DownloadOrderStateByOrder` |

Everything else returns a SOAP fault `NotImplementedInMock` and is logged, so an unexpected call is visible rather than silent.

## Screen A — TriCon Mock UI (ERP side)

Served by the mock itself at `http://localhost:3001/` as server-rendered HTML (no build step), backed by a JSON API `/api/*` on the same service. No shop code involved, so the mock stays standalone and runs next to the shop on the test server. Single user (the developer, for verifying sync), so English labels and a plain layout are fine — BikeOne staff will not use it.

- **Items:** table of `artikel` (ArtikelID, Artikelnummer, name, `I_VKbrutto`, `MehrwertSteuerSatz`, `I_IstOnlineAktiv`), expandable to variants. Toggle `I_IstOnlineAktiv` and edit price, which bumps `last_change`.
- **Stock:** per item/variant × branch grid with the four TriCon fields. Inline edit (simulates a store sale or a delivery arriving); `MengeVerfuegbar` recalculated from the others by default with a manual override. "Set to 0" / "Set on order" quick actions for testing out-of-stock and backorder display.
- **Orders:** list of uploaded orders (WebShopOrderID, date, customer name/email, `Filialname` for pickup, payment/delivery terms, total, current state, paid flag). Detail view shows line items with `Positionsnummer` and the raw XML received. Action buttons advance state: `Neu → InBearbeitung → Geliefert/Teilgeliefert`, `Abgelehnt`, `StorniertTriData`.
- **Request log:** every SOAP call — time, function, GUID ok/failed, duration, response status — with the raw request/response XML expandable. Filter by function. This is the "what happens" view from the ERP's point of view.
- **Controls:** reset to seed, toggle failure injection (next N calls return a fault / respond after a delay) so testers can check that the shop retries and surfaces errors.

Access: on the test server the UI and `/api/*` sit behind basic auth (`TRICON_MOCK_UI_USER`/`TRICON_MOCK_UI_PASSWORD`); `/soap` is checked by `IdentifyGuid` only and should not be exposed publicly (bind to localhost or firewall it, the backend runs on the same host). The orders view shows test customers' names/addresses, so the mock DB must never be seeded with or receive real customer data.

## Screen B — TriCon Sync (Medusa admin, shop side)

Admin UI route via Medusa's admin extension system (`src/admin/routes/tricon/page.tsx`), backed by `GET /admin/tridata/*` routes reading the `tridata-sync` module.

- **Overview:** connection target (mock vs real, from config — GUID never shown), last successful catalog/stock/order-state poll, error count last 24h, buttons "Run stock sync now" / "Run order-state sync now".
- **Sync log:** `TridataSyncLog` rows — direction, function, entity, correlation id (same id as the `[tridata]` log lines), status, duration, error message; filterable.
- **Orders:** per Medusa order: `display_id` / WebShopOrderID, upload status (pending / sent / failed + retry count), last known TriBike state, link to the Medusa order. "Retry upload" button for failed ones.
- **Order detail widget:** small widget on Medusa's existing order detail page (`order.details.after` zone) showing TriBike sync status and state, so testers see it where they already look.

## Shop-side work required behind the screens

The screens only show something if the shop actually talks to the mock. Minimum for the test phase:

1. **`TridataClient` implemented** — build SOAP envelopes by hand (namespace and envelope layout configurable) and parse responses with `fast-xml-parser`; no WSDL-driven client library, since the real WSDL isn't available. Point it at `TRIDATA_WSDL_URL=http://localhost:3001/soap`. Add `TRIDATA_ENDPOINT_URL` if the real service separates WSDL and endpoint. Keep the `integration-logger` wrapping.
2. **`tridata-sync` module** (`src/modules/tridata-sync`) with `TridataProductMap`, `TridataOrderMap`, `TridataSyncLog` per `schema-design.md`, plus module links to `product`/`product_variant` and `order`. Follow the module/workflow convention in `backend/AGENTS.md`, not the `src/lib` stub pattern.
3. **Product mapping without full catalog import:** a script that loads the mock seed's ArtikelID ↔ variant pairs into `TridataProductMap`. A full `DownloadArtikelAll` catalog import (creating Medusa products from TriBike) is **out of scope for mid-November**; the current seed remains the catalog source.
4. **Stock sync:** scheduled job (`src/jobs`, every 10 min in prod, 1 min in dev, plus manual trigger) → `DownloadStock*BranchDelta` → `tridata-stock-snapshot` rows + `InventoryLevel` per stock location (`Filialname` → `StockLocation` lookup table in config). Requires the `tridata-stock-snapshot` module.
5. **Order upload:** subscriber on `order.placed` → workflow building `UploadOrder` (customer, optional delivery address, `Filialname` for Click & Collect, fixed payment/delivery term lookup, items by `ArtikelID`/`ArtikelGrFaKombiID` with stable `Positionsnummer`) → `TridataOrderMap`. Failures are retried with backoff and logged, never block the order. On SumUp payment capture: `UploadOrderChangeBezahlt`. On cancel: `UploadOrderChangeStorno`.
6. **Order state sync:** job polling `DownloadOrderStateByOrder` for open orders, caching state on `TridataOrderMap` (the cached-column option from `tricon-integration-notes.md`). Optionally shown in the customer account area — stretch goal.
7. **Checkout stock re-check** via `DownloadStockByArtikel` — stretch goal for mid-November; decided in `schema-design.md` but not needed to demonstrate the flow.

## Schedule (2026-10-29 → 2026-11-13)

| Days | Dates | Work |
| --- | --- | --- |
| 2 | Oct 30 – Nov 2 | Mock service skeleton: workspace, JSON state store, SOAP dispatch, WSDL, GUID check, seed from demo catalog, request log. Wire into `npm run dev` / `make dev`. |
| 2 | Nov 3 – Nov 4 | Mock functions (12 listed) + Screen A (items, stock, orders, request log, state actions, reset/failure injection). |
| 1.5 | Nov 5 – Nov 6 | `TridataClient` implemented against the mock; `tridata-sync` module + migrations; product-map import script. |
| 2 | Nov 9 – Nov 10 | Stock sync job + `tridata-stock-snapshot` module; order upload subscriber/workflow; paid/storno updates; order-state poll. |
| 1.5 | Nov 11 – Nov 12 | Screen B (admin route + order widget), manual triggers, retry. |
| 1 | Nov 13 | End-to-end run-through with a written test script (below), `legal-security-reviewer` pass (customer PII goes out in `UploadOrder`), docs: update `local-dev-setup.md`, `PLAN.md` (new task), `TODO.md`, `.env.template`. |

About 10 working days; little slack. If time runs short, cut in this order: failure injection, order-state customer display, checkout re-check, Screen B's order widget (keep the admin route).

## Test script for the test phase (acceptance)

1. `make dev` starts backend, storefront and mock; `http://localhost:3001` shows seeded items and stock for both stores.
2. Set a product's stock to 0 in Screen A → after the next stock sync (or "Run now" in Screen B) the storefront shows it out of stock / on order accordingly.
3. Place a Click & Collect order in the storefront → it appears in Screen A's orders with the right `Filialname`, items and WebShopOrderID = Medusa `display_id`; Screen B shows the upload as sent with a matching correlation id.
4. Advance the order to `Geliefert` in Screen A → after the order-state sync Screen B (and the order widget) shows `Geliefert`.
5. Cancel an order in Medusa admin → Screen A shows it `StorniertExtern`.
6. Enable failure injection → place an order → Screen B shows failure + retry; after disabling, the retry succeeds and no duplicate order exists in the mock.

## Decisions (2026-10-29)

- **Test environment:** a dedicated Linux server, available by mid-November, runs backend, storefront and mock. The mock therefore needs a production start command (`npm run start` in `apps/tricon-mock`), basic auth on its UI, and a short deployment note (env vars, port, keeping `/soap` internal). Full deployment of the shop itself is tracked separately (Phase 10, `TODO.md`).
- **Users of Screen A:** only the developer, to confirm data is synced correctly and occasionally edit a stock amount. No German labels or staff-facing polish.
- **Branch model:** one TriCon connection for both stores (see above).

## Open questions

- **Real WSDL differences** — envelope namespaces and wrapper elements are guessed (see the contract doc); expect a small adjustment pass in `TridataClient` once real access exists. Envelope building lives in one place to keep that cheap.
- **Color/size module** — still to confirm with TriData; mock assumes active.
- **Real match key** between TriBike items and shop products (the mock uses SKU; real data may need EAN or Artikelnummer).
