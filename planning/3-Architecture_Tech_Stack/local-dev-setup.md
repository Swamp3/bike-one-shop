# Local dev environment

Goal: start building now (end-of-year launch target) without waiting on a hosting decision or TriCon sandbox access. Everything below runs on a laptop via Docker, independent of which cloud we later pick for staging/prod.

**Revised for Medusa.js v2 + Next.js** (see `decisions.md`'s "Shop system" / "Frontend framework" sections) — replaces the earlier `dockware/shopware` setup. Nothing about the TriCon mock changes; only the service consuming it does.

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Medusa backend | `create-medusa-app` scaffold, run via Docker Compose | Official scaffolding tool; bundles the API server against Postgres/Redis with minimal manual wiring |
| Medusa worker | Same codebase, second container running in worker mode | Medusa v2 splits API serving from background event/subscriber/scheduled-job processing — the 10-minute TriCon poll and outbound order sync run here, not in the API process |
| Database | PostgreSQL (Docker: `postgres:16` or later) | Medusa's required database — replaces Shopware's MySQL/MariaDB requirement |
| Cache / event bus | Redis (Docker: `redis:7` or later) | Production Event Bus Module, persisted Workflow Engine retry state, general caching |
| Frontend | Next.js dev server (`next dev`), from Medusa's official Next.js Starter | Matches the frontend-framework decision; the starter ships cart/checkout/customer scaffolding to adapt rather than build from scratch |
| Tridata / TriCon | Mock service — **WireMock** (Docker: `wiremock/wiremock`) | Protocol confirmed: SOAP 1.1/1.2 over HTTP(S), XML payloads, 44 functions — see [tricon-integration-notes.md](tricon-integration-notes.md) and the full [tricon-interface-reference.html](tricon-interface-reference.html). Still no live sandbox/credentials, but the request/response shapes are now known, not guessed. WireMock stubs are XML-only against the real function names (`DownloadStock`, `UploadOrder`, etc.); only the consuming client changes from PHP to Node |
| Orchestration | `docker-compose.yml` at repo root, one service per piece above | Same shape scales up to the staging/prod compose files later, whichever host we land on |

## docker-compose.yml (starting point)

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=medusa
      - POSTGRES_PASSWORD=medusa
      - POSTGRES_DB=medusa
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  medusa-backend:
    build: ./backend
    command: npm run start
    ports:
      - "9000:9000"
    environment:
      - DATABASE_URL=postgres://medusa:medusa@postgres:5432/medusa
      - REDIS_URL=redis://redis:6379
      - TRICON_ENDPOINT_URL=http://tricon-mock:8080
    depends_on:
      - postgres
      - redis

  medusa-worker:
    build: ./backend
    command: npm run start -- --worker-mode
    environment:
      - DATABASE_URL=postgres://medusa:medusa@postgres:5432/medusa
      - REDIS_URL=redis://redis:6379
      - MEDUSA_WORKER_MODE=worker
      - TRICON_ENDPOINT_URL=http://tricon-mock:8080
    depends_on:
      - postgres
      - redis

  tricon-mock:
    image: wiremock/wiremock:latest
    ports:
      - "3001:8080"
    volumes:
      - ./local-dev/tricon-mock:/home/wiremock

volumes:
  postgres_data:
```

Worker-mode flag/env var name should be confirmed against the pinned Medusa version at implementation time. Next.js runs outside this compose file for now (`next dev` on the host) — add it as a container once CORS between `localhost:3000` and `localhost:9000` is confirmed working.

## Bring-up steps

1. `docker compose up -d`
2. Run Medusa's migrations (`npx medusa db:migrate` or equivalent — confirm exact command against the pinned version) against the `medusa-backend` container.
3. Point the Next.js app's environment config at `http://localhost:9000` for the Medusa Store API and `http://localhost:3001` for the TriCon mock.
4. Seed WireMock stubs under `local-dev/tricon-mock/mappings/` (one JSON mapping file per SOAP function: request matcher + response body) with a handful of realistic items (stock qty, price, GTIN) so cart/checkout flows have real-shaped data to work against. Response bodies are XML, matching the real function shapes in [tricon-interface-reference.html](tricon-interface-reference.html) (`DownloadArtikel`, `DownloadStock`, `UploadOrder`, etc.) — put them in `local-dev/tricon-mock/__files/`.

## Open blocker

Tridata hasn't granted sandbox access, but the protocol itself is no longer a guess — see [tricon-integration-notes.md](tricon-integration-notes.md), distilled from TriCon's official function reference (44 SOAP/XML functions, now archived alongside it as [tricon-interface-reference.html](tricon-interface-reference.html)). The mock above should be rebuilt against those real shapes rather than the earlier stock/price/order guess. Two configuration questions from that analysis (branch model, color/size module) still need an answer from TriData support before the mock's stock/order stubs can be fully accurate for BikeOne's specific instance — worth asking alongside the sandbox-access request itself, so this doesn't stay blocked on a single round trip. Actual credentials/WSDL access would still let this be verified against a live instance rather than documentation alone.
