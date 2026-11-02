# TriCon Mock — Wire Contract

The shared contract between the TriCon mock (`backend/apps/tricon-mock`) and the shop's `TridataClient` (`backend/apps/backend/src/lib/tridata/client.ts`). Both sides implement exactly this; anything not listed here is out of scope for the mock. Field names and shapes come from `tricon-interface-reference.html` (open it in a browser, or read its embedded `window.__TRICON_DATA__` JSON). Envelope details (namespace, SOAPAction, wrapper element names) are **our assumption** of a typical .NET ASMX service — the real WSDL may differ, so keep envelope building/parsing in one place on the client side.

## Transport

- `POST http://<host>:3001/soap`, SOAP 1.1, `Content-Type: text/xml; charset=utf-8`, header `SOAPAction: "http://tempuri.org/<FunctionName>"`. The mock dispatches on the first child element of `soap:Body`, not on the header (header is optional for the mock).
- `GET /soap?wsdl` returns a WSDL describing the implemented functions (informational; the client does not need it).
- Namespace for the operation element and everything below it: `http://tempuri.org/` (default namespace, no prefix on child elements).

Request:

```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <DownloadStockColorSizeBranchDelta xmlns="http://tempuri.org/">
      <IdentifyGuid>00000000-0000-0000-0000-000000000001</IdentifyGuid>
      <LastChange>2026-11-03T10:00:00</LastChange>
    </DownloadStockColorSizeBranchDelta>
  </soap:Body>
</soap:Envelope>
```

Response (success):

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <DownloadStockColorSizeBranchDeltaResponse xmlns="http://tempuri.org/">
      <DownloadStockColorSizeBranchDeltaResult>
        <StockColorSizeBranch>...</StockColorSizeBranch>
        <StockColorSizeBranch>...</StockColorSizeBranch>
      </DownloadStockColorSizeBranchDeltaResult>
    </DownloadStockColorSizeBranchDeltaResponse>
  </soap:Body>
</soap:Envelope>
```

- List results: zero or more repeated record elements inside `<FnResult>`. An empty list is an empty `<FnResult/>`.
- Single-record results (`DownloadStockByArtikel`, `DownloadOrderStateByOrder`): the record's fields directly inside `<FnResult>`.
- Upload/change functions: `<FnResult>true</FnResult>`.

Fault (HTTP 500):

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Invalid IdentifyGuid</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>
```

Fault cases: wrong/missing `IdentifyGuid` (`soap:Client`, `Invalid IdentifyGuid`); unknown or not-mocked function (`soap:Client`, `NotImplementedInMock: <Fn>`); unknown order on order functions (`soap:Client`, `Order <id> not found`); duplicate `WebShopOrderID` on `UploadOrder` (`soap:Client`, `WebShopOrderID <id> already exists`); injected failure (`soap:Server`, `Injected failure`).

## Value formats

- `dateTime`: `YYYY-MM-DDTHH:mm:ss` (no timezone, server local time = Europe/Berlin is TriBike's convention; the mock emits and compares UTC without suffix — treat as UTC on both sides for now).
- `double`/`decimal`: `.` decimal separator, no thousands separator (`1299.00`, `2.5`).
- `boolean`: `true` / `false`.
- `guid`: lowercase `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
- Escaping: standard XML entities. Both sides must parse with DTD/entity processing disabled (XXE).

## Configuration (both sides)

| Variable | Mock | Shop backend | Dev default |
| --- | --- | --- | --- |
| `TRIDATA_IDENTIFY_GUID` / `TRICON_MOCK_GUID` | mock accepts this GUID | client sends it | `00000000-0000-0000-0000-000000000001` |
| `TRIDATA_ENDPOINT_URL` | — | SOAP endpoint | `http://localhost:3001/soap` |
| `TRICON_MOCK_PORT` | listen port | — | `3001` |
| `TRICON_MOCK_UI_USER` / `TRICON_MOCK_UI_PASSWORD` | basic auth for UI + `/api/*` (not `/soap`) when set | — | unset = no auth (local dev) |

## Branches (Filialen)

Confirmed by the user: **one TriCon connection covers both stores** (all-branches model). Mock branch names (`Filialname`): `Oldenburg`, `Osnabrück`. The shop maps them to its stock locations `BikeOne Oldenburg` / `BikeOne Osnabrück` via a lookup (env `TRIDATA_BRANCH_MAP`, JSON `{"Oldenburg":"BikeOne Oldenburg","Osnabrück":"BikeOne Osnabrück"}`, matched against `stock_location.name`).

## Catalog model and matching to Medusa

- One TriBike `Artikel` per Medusa product. `ArtikelNummer` = Medusa product handle uppercased, truncated to 20 chars. `GrFa=true` if the product has more than one variant or any variant has options other than a default; otherwise `GrFa=false`.
- `GrFa=true`: one `ArtikelGrFaKombi` per Medusa variant. **`ArtikelGrFaKombi.Artikelnummer` = Medusa variant SKU** (match key on the shop side). `Barcode`/`EAN` = generated 13-digit EAN. `FarbeBezeichnung`/`GroesseBezeichnung` from the variant's color/size-like option values (else empty). Stock for these comes only from `DownloadStockColorSizeBranch(Delta)`.
- `GrFa=false`: the single variant is the item itself; its SKU is stored in `Artikel.Matchcode` (match key), stock comes from `DownloadStockBranch(Delta)`.
- The mock seed is generated from the shop's current catalog by `backend/apps/backend/src/scripts/export-tricon-mock-seed.ts` into `backend/apps/tricon-mock/seed/catalog.json` (committed, so the mock runs without a shop DB). Matching on SKU is a mock convention; with real TriBike data, matching will be on whatever key BikeOne actually maintains (likely EAN or Artikelnummer) — revisit then.

## Functions implemented by the mock

Parameters are child elements of the operation element (besides `IdentifyGuid`). Record fields: emit **all** fields from the reference for the record type (empty element or sensible default for ones the mock doesn't model); the ones the shop relies on are listed.

| Function | Params | Result record | Shop relies on |
| --- | --- | --- | --- |
| `DownloadArtikelAll` | — | `Artikel` (all online items) | `ArtikelID`, `ArtikelNummer`, `ArtikelName`, `Matchcode`, `GrFa`, `I_VKbrutto`, `MehrwertSteuerSatz`, `I_IstOnlineAktiv`, `LastChange` |
| `DownloadArtikel` | `LastChange` | `Artikel` changed since | same |
| `DownloadGrFaKombi` | — | `ArtikelGrFaKombi` (all) | `ArtikelGrFaKombiID`, `Artikel`, `Artikelnummer`, `EAN`, `Barcode`, `FarbeBezeichnung`, `GroesseBezeichnung`, `LastChange` |
| `DownloadStockBranch` | — | `StockBranch` per non-GrFa item × branch | `ArtikelID`, `Lagerbestand`, `Reserviert`, `Bestellt`, `MengeVerfuegbar`, `Filialname`, `LastChange` |
| `DownloadStockBranchDelta` | `LastChange` | same, changed since | same |
| `DownloadStockColorSizeBranch` | — | `StockColorSizeBranch` per Kombi × branch | `ArtikelID`, `ArtikelGrFaKombinationenID`, the four quantities, `Filialname`, `LastChange` |
| `DownloadStockColorSizeBranchDelta` | `LastChange` | same, changed since | same |
| `DownloadStockByArtikel` | `Artikelnummer` (Artikel.ArtikelNummer or Kombi.Artikelnummer) | single record, `*Gesamt` = sum over branches, `*LokaleFiliale` = `Oldenburg` | `MengeVerfuegbarGesamt` |
| `UploadOrder` | `TO` (`DeliverAdress`?, `Customer`, `Order`, `OrderItemsList/OrderItemsObj*`) | `true` | — |
| `UploadOrderChangeBezahlt` | `Auftragsnummer`, `Bezahlt`, `AusgeglichenAm` | `true` | — |
| `UploadOrderChangeStorno` | `WebShopOrderID` | `true` | — |
| `DownloadOrderStateByOrder` | `WebshopOrderID` (note lowercase s, as in the reference) | `WebShopOrderID`, `OrderState` | `OrderState` |

`UploadOrder` field names are exactly the reference's `Order`, `CustomerExt`, `Adress` and `OrderItems` data formats. The shop sends: `Order.WebShopOrderID` (= Medusa `display_id`), `Payment`, `Bezahlt`, `ausgeglichenAm` (when paid), `OrderCompletedDate`, `ShippingCost`, `DeliveryTerm`, `Filialname` (pickup branch for Click & Collect, empty for shipping), `Comment`; `Customer.Kundenname`, `UserID` (= email), `Email`, `Mehrwertsteuercode` (`Inland`), `Mailingsperre` (`true`), `Strasse`, `Ort`, `Land`, `Postleitzahl`, `Telefon`, `IsOneTimeCustomer`; `OrderItemsObj.Positionsnummer` (1-based, in line-item order), `ArtikelID`, `ArtikelGrFaKombiID` (when GrFa), `WebshopArtikelnummer` (= SKU), `Bezeichnung`, `VKBrutto`, `SummeVKBrutto`, `Quantity`, `EAN`.

### Order state machine (mock)

`OrderState` values: `Neu` (on upload) → `InBearbeitung` → `Geliefert` | `Teilgeliefert`; `Abgelehnt`; `StorniertTriData` (cancelled in mock UI); `StorniertExtern` (set by `UploadOrderChangeStorno`). **Stock is not touched by orders** in the mock (keeps it predictable); stock only changes via the UI.

### Stock semantics (mock)

`MengeVerfuegbar` defaults to `max(0, Lagerbestand - Reserviert)`; the UI can override it. Every stock edit bumps the row's `LastChange` to now, so the next `*Delta` call returns it.

## Shop-side mapping of stock

`MengeVerfuegbar` is authoritative. Per (variant × stock location): write the raw four values to the stock-snapshot model, then set the native `InventoryLevel.stocked_quantity = floor(MengeVerfuegbar) + reserved_quantity` so Medusa's computed available quantity equals `floor(MengeVerfuegbar)`.

## Mock implementation notes (resolved ambiguities)

Decisions made while building `backend/apps/tricon-mock`; the shop client should assume these.

- **Check order:** envelope parse -> `IdentifyGuid` -> configured delay -> injected failure -> function lookup. A wrong GUID always returns `Invalid IdentifyGuid` immediately (no delay, does not consume an injected failure), also for unknown functions. The mock stores request XML with the `IdentifyGuid` content masked as `***`.
- **Extra faults (all `soap:Client`):** a request with a DTD/`<!DOCTYPE>` is rejected with `DTD is not allowed` (on top of entity processing being off); malformed XML -> `Malformed XML: ...`; missing/unparseable parameters -> `Missing parameter <Name>` / `Invalid dateTime for <Name>: ...` / `Invalid int for <Name>: ...`; `DownloadStockByArtikel` with an unknown number -> `Artikel <nr> not found`; `UploadOrder` without numeric `Order.WebShopOrderID` or without `Customer.Kundenname` -> fault. Unexpected errors -> `soap:Server`, `Internal error: ...`.
- **Delta semantics:** `*Delta` / `DownloadArtikel` return rows with `LastChange >= <param>` (inclusive, since timestamps have second resolution: a duplicate on the next sync is harmless, a missed change is not). A `LastChange` with `Z`/offset is honoured; without one it is UTC.
- **Online flag:** `DownloadArtikelAll` returns only `I_IstOnlineAktiv=true` items; `DownloadArtikel` (delta) returns changed items regardless of the flag, so the shop sees an item going offline.
- **Prices:** `VKBrutto` and `I_VKbrutto` both carry the gross price, `VKNetto`/`I_VKnetto` = gross / 1.19 rounded to 2 decimals. For a GrFa item the price is the lowest variant price (Kombis have no price field in the reference).
- **Matchcode for GrFa items** = `ArtikelNummer` (only the non-GrFa Matchcode is a match key).
- **`StockColorSizeBranch.Artikelnummer`** = the parent `Artikel.ArtikelNummer`, not the Kombi SKU; match stock rows to variants via `ArtikelGrFaKombinationenID` (-> `ArtikelGrFaKombi.Artikelnummer` = SKU). `Color`/`Size`/`Barcode` come from the Kombi.
- **`DownloadStockByArtikel`** also accepts a non-GrFa item's `Matchcode` (SKU), case-insensitive. Artikel-level number of a GrFa item sums over all its Kombis.
- **GUIDs** are deterministic (SHA-256 of handle/SKU, UUID-v5 layout), so reseeding keeps every `ArtikelID` / `ArtikelGrFaKombiID` / stock row ID stable. `EAN`s are generated valid EAN-13 with prefix `20` (in-store range).
- **Orders:** `UploadOrderChangeBezahlt` sets the paid flag and `ausgeglichenAm` (mandatory when `Bezahlt=true`) and does not change `OrderState`. `UploadOrderChangeStorno` on an already `StorniertExtern` order is a no-op `true`. `OrderImportDate` is set by the mock on upload.
- **SOAP 1.2** (`application/soap+xml`, 1.2 envelope namespace) is accepted too and answered with a 1.2 envelope/fault; the shop should use 1.1 as specified above.
