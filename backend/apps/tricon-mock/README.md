# TriCon mock (`@dtc/tricon-mock`)

Stateful stand-in for BikeOne's TriCon / TriData / TriBike ERP SOAP web service, plus a small inspection UI. The shop's `TridataClient` talks to it exactly as it would to the real service, so stock sync, catalog sync and order upload can be tested end to end before TriData sandbox credentials exist.

- Wire contract (source of truth for both sides): `planning/3-Architecture_Tech_Stack/tricon-mock-contract.md`
- Why a stateful mock and what it covers: `planning/3-Architecture_Tech_Stack/tricon-mock-plan.md`
- Field lists come from `planning/3-Architecture_Tech_Stack/tricon-interface-reference.html` (copied into `src/reference-fields.ts`)

Implemented SOAP functions (12 of 44): `DownloadArtikelAll`, `DownloadArtikel`, `DownloadGrFaKombi`, `DownloadStockBranch`, `DownloadStockBranchDelta`, `DownloadStockColorSizeBranch`, `DownloadStockColorSizeBranchDelta`, `DownloadStockByArtikel`, `UploadOrder`, `UploadOrderChangeBezahlt`, `UploadOrderChangeStorno`, `DownloadOrderStateByOrder`. Everything else returns a `NotImplementedInMock` fault and shows up in the request log.

## Run locally

It is an npm workspace of `backend/`, so `make dev` (or `npm run dev` in `backend/`) starts it next to the backend and storefront. On its own:

```bash
cd backend/apps/tricon-mock
npm run dev        # tsx watch, restarts on change
npm run start      # no watch
```

- SOAP endpoint: `POST http://localhost:3001/soap` (WSDL: `GET /soap?wsdl`)
- UI: `http://localhost:3001/` (Items, Stock, Orders, Request log, Controls on the overview page)
- JSON API: `/api/items`, `/api/stock`, `/api/orders`, `/api/orders/:id`, `/api/requests?fn=`, `/api/settings`; mutations `POST /api/items/:id`, `POST /api/stock/:rowId`, `POST /api/orders/:id/state`, `POST /api/settings`, `POST /api/reset` (JSON or form-encoded)
- Health: `GET /health`

Quick check:

```bash
curl -s -X POST http://localhost:3001/soap -H 'Content-Type: text/xml; charset=utf-8' --data \
  '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><DownloadStockBranch xmlns="http://tempuri.org/"><IdentifyGuid>00000000-0000-0000-0000-000000000001</IdentifyGuid></DownloadStockBranch></soap:Body></soap:Envelope>'
```

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRICON_MOCK_PORT` | `3001` | Listen port |
| `TRICON_MOCK_HOST` | `127.0.0.1` | Bind address. Keep it on loopback unless you need remote UI access. |
| `TRICON_MOCK_GUID` | `00000000-0000-0000-0000-000000000001` | Accepted `IdentifyGuid` (shop side: `TRIDATA_IDENTIFY_GUID`) |
| `TRICON_MOCK_UI_USER` / `TRICON_MOCK_UI_PASSWORD` | unset | When both are set, basic auth protects the UI and `/api/*` (not `/soap`, not `/health`) |
| `TRICON_MOCK_ALLOWED_HOSTS` | `127.0.0.1:<port>,localhost:<port>` | Comma list of `host[:port]` accepted in the `Host` header (DNS-rebinding guard, 421 otherwise) and in `Origin`/`Referer` of mutating requests. Add the public hostname when the UI sits behind a reverse proxy. |
| `TRICON_MOCK_STATE_FILE` | `data/state.json` | State file (gitignored) |
| `TRICON_MOCK_CATALOG_FILE` | `seed/catalog.json` | Seed catalog |
| `TRICON_MOCK_LOG` | unset | `1` enables Fastify request logging |

## State, seed and reset

State is held in memory and written to `data/state.json` (temp file + rename) on every change, including every logged SOAP call. The request log keeps the last 2000 calls. On first start without a state file, the mock seeds itself from `seed/catalog.json`.

`seed/catalog.json` is a plain export of the shop catalog (products, variants, SKUs, option values, EUR prices; no customer data). Regenerate it after the shop catalog changes:

```bash
cd backend/apps/backend
npx medusa exec ./src/scripts/export-tricon-mock-seed.ts
```

Rebuild the mock state from it (wipes orders and the request log; ArtikelID / Kombi GUIDs and EANs are derived from handle/SKU, so they stay identical across reseeds and the IDs the shop stored keep matching):

- UI: Overview -> "Reset to seed" (works while the server runs), or `curl -X POST -H 'Origin: http://localhost:3001' -H 'Content-Type: application/json' -d '{}' http://localhost:3001/api/reset`
- CLI: `npm run seed` (stop the server first, otherwise the running process overwrites the file on its next change)

Failure injection (Overview -> Controls, or a JSON `POST /api/settings` with `{"failNextN": 3, "delayMs": 2000}`): the next N SOAP calls return `soap:Server` / `Injected failure`; the delay applies to every SOAP call.

## Security model

- `/soap` is authenticated only by `IdentifyGuid`. The GUID is checked before the configured delay/injected failure, and is masked (`***`) in everything stored (request log, order raw XML). Requests with a wrong GUID are logged with metadata and the first 2 KB of the body only. Stored XML is capped at 256 KB per entry, the log at 2000 entries / 20 MB.
- UI and `/api/*`: optional basic auth; `Host` must be in `TRICON_MOCK_ALLOWED_HOSTS`; every non-GET request needs an allowed `Origin` (or `Referer`) - `Origin: null` or neither header is rejected with 403; form posts additionally need the per-process CSRF token the pages embed (JSON posts need `Content-Type: application/json`, which browsers cannot send cross-site without a preflight). From scripts, send `-H 'Origin: http://localhost:3001' -H 'Content-Type: application/json'`.
- Pages are served with a strict Content-Security-Policy (no inline scripts; the little UI behaviour lives in `/ui.js`).
- `data/` is created `0700`, state files are written `0600`.
- The server refuses to start when it is reachable beyond loopback - a non-loopback `TRICON_MOCK_HOST`, or any `TRICON_MOCK_ALLOWED_HOSTS` entry other than `127.0.0.1` / `localhost` / `::1` (the reverse-proxy case, where the mock itself binds 127.0.0.1) - unless basic auth is configured and `TRICON_MOCK_GUID` is set to something other than the public dev GUID. Pure loopback (`make dev`) is exempt.

## Tests and lint

```bash
npm test       # node:test via tsx
npm run lint   # tsc --noEmit
```

## Running on the Linux test server

The mock runs from source via `tsx`; no build step and no native dependencies. After `npm install` in `backend/`:

Generate the secrets once and put them into an env file readable only by the service user (`/etc/tricon-mock.env`, mode `0600`):

```bash
echo "TRICON_MOCK_UI_PASSWORD=$(openssl rand -hex 24)"   >> /etc/tricon-mock.env
echo "TRICON_MOCK_GUID=$(uuidgen | tr A-Z a-z)"          >> /etc/tricon-mock.env
chmod 600 /etc/tricon-mock.env
```

Use the same GUID as `TRIDATA_IDENTIFY_GUID` in the shop backend's env.

systemd unit (example, `/etc/systemd/system/tricon-mock.service`):

```ini
[Unit]
Description=TriCon mock
After=network.target

[Service]
WorkingDirectory=/srv/bike-one-shop/backend/apps/tricon-mock
ExecStart=/usr/bin/npm run start
Environment=TRICON_MOCK_HOST=127.0.0.1
Environment=TRICON_MOCK_PORT=3001
Environment=TRICON_MOCK_UI_USER=dev
# Public hostname of the UI if it is reverse-proxied (see below)
Environment=TRICON_MOCK_ALLOWED_HOSTS=127.0.0.1:3001,localhost:3001,tricon-mock.test.example
EnvironmentFile=/etc/tricon-mock.env
Restart=on-failure
User=bikeone
UMask=0077

[Install]
WantedBy=multi-user.target
```

or with pm2 (load the same env file first): `set -a; . /etc/tricon-mock.env; set +a; TRICON_MOCK_UI_USER=dev pm2 start npm --name tricon-mock -- run start`.

- The shop backend runs on the same host and calls the SOAP endpoint via loopback: `TRIDATA_ENDPOINT_URL=http://127.0.0.1:3001/soap`. Keep `TRICON_MOCK_HOST=127.0.0.1` and do not open port 3001 in the firewall.
- If the UI must be reachable remotely, proxy it with TLS and never proxy `/soap`, e.g. nginx:

  ```nginx
  server {
    server_name tricon-mock.test.example;
    # listen 443 ssl; ssl_certificate ...;
    location /soap { deny all; }
    location / {
      proxy_pass http://127.0.0.1:3001;
      proxy_set_header Host $host;
    }
  }
  ```

  and add that hostname to `TRICON_MOCK_ALLOWED_HOSTS`. Basic auth stays on in the mock itself.
- The Orders view shows names and addresses the shop uploaded. Only test customers, never real customer data.
- Reset with the UI button or `curl -u dev:$TRICON_MOCK_UI_PASSWORD -X POST -H 'Origin: http://127.0.0.1:3001' -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:3001/api/reset`.
