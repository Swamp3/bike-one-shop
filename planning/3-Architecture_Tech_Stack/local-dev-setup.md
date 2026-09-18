# Local dev environment

Goal: start building now (end-of-year launch target) without waiting on a hosting decision or TriCon sandbox access. Everything below runs on a laptop via Docker, independent of which cloud we later pick for staging/prod.

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Shopware | `dockware/shopware` (single container) | Bundles PHP 8.2+, MySQL, OpenSearch, Redis, Mailpit, Adminer, Xdebug — the Shopware docs explicitly recommend dockware for local dev and the plain `shopware/docker-base` image only for production, so we don't hand-assemble the full stack twice |
| Frontend | Angular CLI dev server (`ng serve`), SSR via `@angular/ssr` in dev mode once scaffolded | Matches the SSR decision above; no need to containerize this for local dev, just run it on the host against dockware's exposed API port |
| Tridata / TriCon | Mock service — **WireMock** (Docker: `wiremock/wiremock`) | Tridata hasn't responded, so there's no sandbox and no published protocol spec (public search turns up nothing on whether TriCon is SOAP/XML or REST/JSON — "WebService" plus Tridata's age as a vendor makes SOAP plausible, but it's unconfirmed). WireMock handles both XML and JSON stubs from the same tool, so we're not locked into a guess; if it turns out to be plain REST/JSON, a lighter tool like Mockoon or json-server would've been simpler, but WireMock covers that case too |
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
4. Seed WireMock stubs under `local-dev/tricon-mock/mappings/` (one JSON file per endpoint: request matcher + response body) with a handful of realistic SKUs (stock qty, price, GTIN) so cart/checkout flows have real-shaped data to work against. Put XML response bodies in `local-dev/tricon-mock/__files/` if TriCon turns out to be SOAP.

## Open blocker

Tridata hasn't responded to outreach, so there's no sandbox and no confirmed protocol — the mock above is a guess at TriCon's shape (stock/price/order endpoints), not a verified contract. Treat it as the working assumption for now rather than a short-lived stopgap: development proceeds against the mock, but budget rework once real TriCon access (or at least documentation) arrives, since the actual request/response shape could differ from what's stubbed. Worth escalating past the unanswered inquiry — a distributor/reseller relationship this integration depends on shouldn't stay blocked on a single unanswered contact.
