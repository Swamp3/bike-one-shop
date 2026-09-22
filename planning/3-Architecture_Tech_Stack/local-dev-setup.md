# Local dev environment

Goal: start building now (end-of-year launch target) without waiting on a hosting decision or TriCon sandbox access. Everything below runs on a laptop via Docker, independent of which cloud we later pick for staging/prod.

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Shopware | `dockware/shopware` (single container) | Bundles PHP 8.2+, MySQL, OpenSearch, Redis, Mailpit, Adminer, Xdebug — the Shopware docs explicitly recommend dockware for local dev and the plain `shopware/docker-base` image only for production, so we don't hand-assemble the full stack twice |
| Frontend | Angular CLI dev server (`ng serve`), SSR via `@angular/ssr` in dev mode once scaffolded | Matches the SSR decision above; no need to containerize this for local dev, just run it on the host against dockware's exposed API port |
| Tridata / TriCon | Mock service — **WireMock** (Docker: `wiremock/wiremock`) | Protocol confirmed: SOAP 1.1/1.2 over HTTP(S), XML payloads, 44 functions — see [tricon-integration-notes.md](tricon-integration-notes.md) and the full [tricon-interface-reference.html](tricon-interface-reference.html). Still no live sandbox/credentials, but the request/response shapes are now known, not guessed. WireMock stubs should be built as XML-only against the real function names (`DownloadStock`, `UploadOrder`, etc.) rather than hedging with JSON stubs as before |
| Orchestration | `docker-compose.yml` at repo root, one service per piece above | Same shape scales up to the staging/prod compose files later, whichever host we land on |

## docker-compose.yml (starting point)

```yaml
services:
  shopware:
    image: dockware/shopware:latest
    ports:
      - "80:80"
    environment:
      - PHP_VERSION=8.2
    volumes:
      - shopware_data:/var/www/html

  tricon-mock:
    image: wiremock/wiremock:latest
    ports:
      - "3001:8080"
    volumes:
      - ./local-dev/tricon-mock:/home/wiremock

volumes:
  shopware_data:
```

Angular runs outside this compose file for now (`ng serve` on the host) — add it as a container once the SSR build is set up and CORS between `localhost:4200` and `localhost:80` is confirmed working.

## Bring-up steps

1. `docker compose up -d`
2. Open dockware's included Adminer/PimpMyLog UI to confirm Shopware installed cleanly (dockware auto-installs a Shopware instance on first boot).
3. Point the Angular app's environment config at `http://localhost` for the Shopware Store API and `http://localhost:3001` for the TriCon mock.
4. Seed WireMock stubs under `local-dev/tricon-mock/mappings/` (one JSON mapping file per SOAP function: request matcher + response body) with a handful of realistic items (stock qty, price, GTIN) so cart/checkout flows have real-shaped data to work against. Response bodies are XML, matching the real function shapes in [tricon-interface-reference.html](tricon-interface-reference.html) (`DownloadArtikel`, `DownloadStock`, `UploadOrder`, etc.) — put them in `local-dev/tricon-mock/__files/`.

## Open blocker

Tridata hasn't granted sandbox access, but the protocol itself is no longer a guess — see [tricon-integration-notes.md](tricon-integration-notes.md), distilled from TriCon's official function reference (44 SOAP/XML functions, now archived alongside it as [tricon-interface-reference.html](tricon-interface-reference.html)). The mock above should be rebuilt against those real shapes rather than the earlier stock/price/order guess. Two configuration questions from that analysis (branch model, color/size module) still need an answer from TriData support before the mock's stock/order stubs can be fully accurate for BikeOne's specific instance — worth asking alongside the sandbox-access request itself, so this doesn't stay blocked on a single round trip. Actual credentials/WSDL access would still let this be verified against a live instance rather than documentation alone.
