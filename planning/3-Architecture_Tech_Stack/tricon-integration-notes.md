# TriCon Integration Notes

## Source

Distilled from [tricon-interface-reference.html](tricon-interface-reference.html) in this same folder — a reference document covering TriCon's 44 functions, compiled from TriData's official documentation (`tricondoku.tri-data.de`). Open that file in a browser for the full, searchable function reference (parameters, response XML shapes, field-by-field notes); this document extracts only what changes the shop's design.

This resolves the "TriCon protocol unconfirmed" item that was the single remaining blocker in [5-Database_Schema/schema-design.md](../5-Database_Schema/schema-design.md)'s open questions, and the matching hedge in [local-dev-setup.md](local-dev-setup.md). It does **not** replace having an actual sandbox/credentials — this is documentation, not tested access — but it removes the guesswork the earlier docs were built on.

## Protocol — confirmed

**SOAP 1.1/1.2 over HTTP(S), XML payloads.** Not REST/JSON — the WireMock JSON-stub hedge in `local-dev-setup.md` can be dropped. The exact envelope shape comes from a per-instance WSDL (append `?wsdl` to the service URL, or get it from TriData support); this reference describes each function's inner parameters and result fields, which stay stable across instances.

Authentication is a single `IdentifyGuid` value, sent as a parameter on **every** call — no separate login/token exchange. It's issued by TriData at project setup and must be stored as a server-side secret (Shopware backend), never exposed to the Angular frontend.

Vendor contact for the actual GUID + WSDL URL: **+49 911 247675-0** / **support@tridata.de**.

## Two configuration questions to put to TriData support directly

These aren't design decisions this project can make — they depend on how BikeOne's specific TriBike installation is configured, and change which functions/fields actually apply:

1. **Branches (`Filialen`).** Does the connected TriBike instance use "one interface for all branches" (a single main branch is directly connected, but stock/orders cover all branches via `Filialname`) or "one interface per branch"? This directly decides how `bikeone_store_stock` gets fed:
   - **All-branches model:** `DownloadStockBranch`/`DownloadStockColorSizeBranch` return one stock row per item (or variant) *per branch*, with a `Filialname` field — this is close to a drop-in feed for `bikeone_store_stock`, and outbound pickup orders set `Filialname` on `UploadOrder` to route to the right store.
   - **Per-branch model:** no branch-aware functions apply; each store would need its own TriCon connection/credential, or stock has to be reconciled another way.
2. **Color/size module (`Größen Farben Modul`).** If active, size variants come through as `DownloadGrFaKombi` rows linked to a parent item via `ArtikelGrFaKombi.Artikel` — which maps cleanly onto this project's existing `product.parent_id` (Shopware native configurator) design. If inactive, each size is just its own flat, unrelated item in TriBike, and grouping them into Shopware variants becomes shop-side mapping logic with no help from the interface.

Both determine concrete integration work in Phase 6, not just documentation — worth confirming before that phase starts rather than during it.

## Concrete field mappings into the existing schema

### `bikeone_tridata_entity_map`

- `entity_type = 'product'`: `tridata_external_id` = **`ArtikelID`** (a GUID, TriBike-assigned) for a parent item, or `ArtikelGrFaKombiID` for a size/color variant when the color/size module is active. TriBike owns this ID; the shop only stores it.
- `entity_type = 'order'`: `tridata_external_id` = **`WebShopOrderID`** — and here the direction is reversed from products: **the shop mints this ID**, not TriBike. It's an `int`, sent on `UploadOrder`, and the reference is explicit that it must use "a number range clearly outside TriBike's own, and outside your shop's own order numbers too" (i.e. distinct from both TriBike's internal `Auftragsnummer` *and* Shopware's customer-facing `order_number`/`BO-YYYY-NNNNNN`). **Recommendation:** use Shopware's native `autoIncrement` integer field on `order` (already unique, monotonic, and unrelated to both other numbering schemes) as the `WebShopOrderID` — avoids inventing a fourth counter. This also answers part of the earlier "order-number pattern" question: `BO-YYYY-NNNNNN` (customer-facing) and `WebShopOrderID` (TriCon-facing) are two different numbers on the same order, not the same field reused.
- `payload_hash` still applies as designed — nothing here changes the entity_map's own shape, only what fills `tridata_external_id`.

### `bikeone_store_stock` — real fields differ from the original design

The original design invented a `status` enum (`in_stock`/`on_order`) plus `quantity`/`eta_days_min`/`eta_days_max`. TriCon's actual stock functions (`DownloadStock`, `DownloadStockBranch`, `DownloadStockColorSize`, `DownloadStockColorSizeBranch`, and their `*Delta` variants) don't return that shape at all — they return four numeric fields per item/variant (per branch, if the branch functions apply):

| TriCon field | Meaning |
| --- | --- |
| `Lagerbestand` (`...Gesamt`/`...LokaleFiliale` on the non-branch functions) | Physical stock on hand |
| `Reserviert` | Already reserved against other orders |
| `Bestellt` | On order from a supplier / backordered |
| `MengeVerfuegbar` | TriBike's own computed sellable quantity (roughly `Lagerbestand − Reserviert`, adjusted by `Bestellt` depending on configuration) — **the reference explicitly calls this the authoritative sellable quantity**, i.e. the number checkout should actually trust, not a shop-side recomputation from the other three |

**Recommendation:** replace `bikeone_store_stock`'s `status`/`quantity`/`eta_days_min`/`eta_days_max` columns with `lagerbestand`, `reserviert`, `bestellt`, and `menge_verfuegbar` (or English equivalents), all `decimal`/`double` per the source types — TriCon returns these as `double`, not integers, so a strict `int` column would truncate legitimate fractional units (e.g. some accessories sold by weight/length). The storefront's `in_stock`/`bestellbar`/`oos` display states become a presentation-layer mapping over `menge_verfuegbar` (`> 0` → in stock, `= 0` with `bestellt > 0` → on order, else out of stock) rather than a separately-synced field — one less thing that can drift out of sync with the numbers it's derived from.

`bikeone_tridata_entity_map`'s `entity_id`/`product_id` linkage still applies unchanged; only the stock row's own columns change shape.

### `bikeone_order_extension` — `Filialname` confirms the design

`pickup_store_id` (already in the design) maps directly onto TriCon's `Filialname` field on `UploadOrder` when `delivery_type = 'pickup'` — set it to the picked-up-at store's name on outbound sync, but only if the branches model applies (see open question above). No schema change needed here; this is a direct confirmation of an existing field, not a correction.

### Order state — a genuinely new field to consider

`DownloadOrderStateByOrder`/`DownloadOrderStateByCustomer` expose TriBike's own fulfillment-state enum: `Neu` (uploaded) → `InBearbeitung` (imported) → `Geliefert`/`Teilgeliefert` (delivered/partially) → `Abgelehnt` (rejected) → `StorniertTriData`/`StorniertExtern` (deleted, by TriBike or by the shop's own `UploadOrderChangeStorno`). This is a different concept from the existing schema's `return_state` (a computed 30-day return-window flag) — it's TriBike's live fulfillment status, useful for an account-area order-status display. Not currently in the schema at all. Two options, either workable: poll live at render time (simplest, no schema change) or cache it as a column refreshed alongside the outbound sync (avoids a live TriCon call on every account-page view, at the cost of one more synced field). Left as a Phase 6 call, not decided here.

### Product catalog fields — confirms and extends the existing design

- `ArtikelID` (GUID) is the primary key, exactly as `bikeone_tridata_entity_map` already assumes; `Artikelnummer` is a secondary/display number (and on order upload, TriBike only reads its first 20 characters — relevant if BikeOne's SKUs can be longer).
- **Web-visibility filtering happens upstream, in TriBike, not just in the shop.** `DownloadArtikel`/`DownloadArtikelAll` only return items TriBike itself has flagged for web use (`I_IstOnlineAktiv` in the response) — meaning some of the `online_visible` filtering this project designed as a shop-side rule may already happen at the source. Worth clarifying with the store owner during Phase 6 setup whether staff will maintain that flag directly in TriBike (in which case `product.online_visible` in Shopware could just mirror `I_IstOnlineAktiv` rather than being independently curated) or whether the shop needs its own additional layer on top of TriBike's set. Doesn't change the schema (the field still exists either way), only who's expected to set it and from where.
- `I_VKnetto`/`I_VKbrutto` (web-specific prices) should be used over the plain `VKnetto`/`VKbrutto` (TriBike-internal prices) — already anticipated by keeping price sync generic in the existing design, just noting the concrete field names for Phase 6.
- `Gewicht` (weight), `MehrwertSteuerSatz` (VAT rate string!), and `Warengruppe`/`Kategorien` are present on every item — `MehrwertSteuerSatz` in particular is directly relevant to the still-open VAT/tax-rate schema question: TriBike already carries a per-item VAT rate, which may simplify that decision (map TriBike's rate string to a Shopware tax rule) rather than needing an independent choice.

## Function reference, by category (44 total)

Full parameter/response detail is in the HTML reference; this is the map of what exists, organized the way this project will actually call it.

| Category | Count | Representative functions | Shop-side use |
| --- | --- | --- | --- |
| Items & variants | 7 | `DownloadArtikel(All)`, `DownloadArtikelNrAll`, `DownloadGrFaKombi(BarcodeAll)`, `DownloadFarbe`, `DownloadGroesse` | Catalog import (full, then delta), variant mapping, deletion detection |
| Images | 2 | `DownloadArtikelbild`, `DownloadArtikelbildByArtikel` | Product gallery sync |
| Pricing & customer groups | 3 | `DownloadKundengruppen`, `DownloadArtikelKundengruppenPreis`, `DownloadArtikelKundenPreis` | B2B tiered/negotiated pricing — not needed for v1's B2C-only scope, but available if that changes |
| Customers | 5 | `DownloadCustomer(All)`, `DownloadCustomerAdress(LastChange)`, `UploadCustomer` | Mainly relevant if TriBike's existing customer base needs importing; standalone registration upload |
| Stock | 12 | `DownloadStock(Delta)`, `*Branch*`, `*ColorSize*` | Feeds `product.stock` and `bikeone_store_stock` — see field mapping above |
| Orders & order state | 9 | `UploadOrder`, `DownloadOrderStateBy*`, `UploadOrderChange{Bezahlt,Storno,Verkaufsstatus,Freitext1,Freitext2}`, `UploadOrderItemChangeSeriennummern` | The full outbound checkout path plus post-purchase updates |
| Invoices & credits | 6 | `DownloadRechnungen(ByCustomer)`, `DownloadRechnungByOrder`, `DownloadGutschriften(ByCustomer)`, `DownloadGutschriftByInvoice` | Account-area invoice/credit-note PDFs |

## `UploadOrder` payload shape (the core checkout call)

One call carries everything: `Customer` (a `CustomerExt` object, sent on **every** order even for returning customers — TriData matches on `UserID`/`Email`, not a stored session), an optional `DeliverAdress` (only when shipping differs from the customer's own address), the `Order` header, and a repeated `OrderItemsList`.

Key fields worth calling out for Phase 6's mapping layer:
- `Payment` and `DeliveryTerm` on `Order` map to TriBike's `Zahlungsbedingung`/`Lieferbedingung` and are auto-created if unrecognized — the reference explicitly recommends keeping these to a small fixed set from the shop side to avoid cluttering TriBike's configuration. Should be a fixed lookup table in the sync integration (Shopware payment/shipping method → agreed TriBike term string), decided with the TriBike operator, not freely generated per order.
- `OrderItems.ArtikelID`/`ArtikelGrFaKombiID` — use these (not the string `Artikelnummer`) for item identification, consistent with using `ArtikelID` as the entity-map key elsewhere.
- `Positionsnummer` on each line item is also the key `UploadOrderItemChangeSeriennummern` later uses to attach serial numbers to that specific line — relevant for serialized bikes, and worth preserving Shopware's line-item ordering as-sent so it can be referenced again after the fact.

## What's still not resolved by this document

- No live sandbox or actual `IdentifyGuid`/WSDL URL yet — this is documentation, not a tested connection. The two configuration questions above should go to TriData support alongside that access request.
- The exact SOAP envelope/WSDL structure is instance-specific and still needs fetching once credentials exist; only the inner call shapes are covered here.
- Local dev's WireMock stubs (`local-dev-setup.md`) should be rebuilt against these confirmed XML shapes — see that document's own updated note.
