# TriData import: category mapping

Companion to [plan.md](plan.md), section "Later: the TriData article import". The category-structure task does not build the import. This file records what the import needs so it can put products into the new category tree, what is still unknown, and what goes into `decisions.md` now.

## 1. Current state

- **There is no TriData product import.** The only catalog function in use is `link-products` (`backend/apps/backend/src/workflows/tridata/steps/link-products.ts`). It calls `DownloadArtikelAll` and `DownloadGrFaKombi`, matches TriBike items to *existing* shop variants by SKU (`helpers/match-products.ts`), and writes `TridataProductMap` rows. It never creates or updates products, and it never touches categories.
- Products and categories come from `initial-data-seed.ts`, `seed-demo-products.ts`, the one-time `import-woo-catalog.ts`, and manual edits in the admin.
- **The client ignores the category fields.** `TridataArtikel` (`src/lib/tridata/types.ts`) has no `Warengruppe`, `Kategorien`, `Hersteller` or `ArtikelKlassifizierung1-3`. The values are only reachable through `raw`.
- **The TriCon reference gives only types, not content.** On the `Artikel` record, `Warengruppe`, `Kategorien` and `ArtikelKlassifizierung1-3` are each a plain `string`. The reference says nothing about which values exist, whether `Kategorien` holds one value or a delimited list, or whether it encodes a hierarchy.
- **The mock does not model categories.**
  - `seed-data.ts` sets `Warengruppe` from the variant structure (`GrFa` → "Fahrräder", otherwise "Teile"). A single-variant bike would come out as "Teile".
  - `Kategorien` is always empty.
  - With the mock, the import could tell bikes from parts and nothing finer: not Rennrad from Gravel, and not Laufräder from Zubehör.
  - `seed/catalog.json` has 7 products and no category data. It predates the WooCommerce import.

## 2. Open questions (for BikeOne / TriData support)

These block the concrete mapping table, but not the rule itself:

1. **Values in use.** Which `Warengruppe` values does BikeOne's TriBike actually have? An export of the distinct values with article counts is enough.
2. **`Kategorien` in practice.** Does BikeOne maintain it? Is it single or multi-valued, and with which delimiter? Is it hierarchical, like "Fahrräder/Rennrad"? Does BikeOne maintain it specifically for a web shop?
3. **Fine split for bikes.** If `Kategorien` is not maintained, where does Rennrad / Gravel / MTB / Triathlon live? Possibly in `ArtikelKlassifizierung1-3` or nowhere.
4. **Ownership.** Will staff maintain the web category in TriBike, or in the Medusa admin? This decides the update rule in §3.6.

Send these together with the open branch and color/size questions in `planning/3-Architecture_Tech_Stack/tricon-integration-notes.md` ("Two configuration questions…").

## 3. Mapping rule

### 3.1 Key: shop category handle

The import maps TriData values to **shop category handles**: `fahrraeder`, `rennraeder`, `gravelbikes`, `triathlon-zeitfahren`, `mountainbikes`, `komponenten`, `laufraeder`, `zubehoer`. Handles are ASCII-only and stable (plan.md). Ids differ between databases, and names may be renamed. The import resolves handles to ids once per run, with one `query.graph` on `product_category`.

### 3.2 Input normalization

Before the lookup, the import normalizes each value:

- Trim whitespace and apply Unicode NFC.
- Compare case-insensitively.
- Split `Kategorien` on its delimiter, once question 2 is answered.

The import never slugifies TriData values into handles automatically. "Laufräder" must not silently become `laufraeder` by convention; every accepted value is an explicit map entry.

### 3.3 Resolution order

For each article:

1. Map each `Kategorien` entry. Collect every hit, since a product may sit in several categories (Medusa `product_category` is many-to-many).
2. If step 1 gives no hit, map `Warengruppe`.
3. If neither gives a hit, the product gets **no category**. The value is logged (§3.5).

A map entry may point at a parent category (for example `Warengruppe` "Fahrräder" → `fahrraeder`) when no finer information exists. The storefront plan already handles that: `hasProducts` counts a category's own products, and the parent page lists its own and its descendants' products. Such a product appears on `/categories/fahrraeder` but under no subcategory chip. That is an acceptable fallback, not the goal.

### 3.4 The import never creates or changes categories

The category tree belongs to the shop. It is created by migration scripts such as `restructure-categories.ts`. The import only assigns `category_ids`.

If a map entry points at a handle that does not exist in the database, the import treats that as a configuration error: it logs the error and skips that entry. It does not create the category. Otherwise a typo in the map, or a new TriBike value, would create public, empty-named menu entries.

### 3.5 Unknown values

- The product is still imported. It stays reachable through `/store` and search, just not through the category menu.
- The run summary (`writeRunSummary`, as in `link-products`) gets `unmappedCategories: { "<value>": <article count> }`, plus `missingHandles` for §3.4. Both are visible on the existing admin TriCon page through the sync logs.
- Fix process: a developer adds a map entry. If no category fits (for example the first "Helme" article), the developer first adds the category with a migration script, then adds the entry. Real Zubehör subcategories appear this way, as plan.md "Out of scope" intends.

### 3.6 Re-import and manual edits (decide with question 4)

- **Category maintained in TriBike:** TriData is authoritative. Each sync replaces `category_ids` with the mapped set. Manual admin edits are overwritten.
- **Category maintained in the shop:** the import sets categories only when it **creates** a product, and never changes them afterwards.

Default until decided: set on create only. It cannot destroy manual work, and switching to authoritative later is a one-line change.

## 4. What to build (as part of the future import feature)

The category part is small. These are its pieces, in the existing tridata layout:

| Piece | Where | Notes |
| --- | --- | --- |
| Parse `Warengruppe`, `Kategorien` (and `Hersteller` for brands later) | `src/lib/tridata/types.ts`, `mapArtikel` in `client.ts` | Optional strings; empty element → `""` |
| Map table | `src/lib/tridata/category-map.ts` | Plain `Record<string, string[]>` from normalized TriData value to handles. `shortcut: code constant, move to an admin-editable table if BikeOne staff need to change it themselves` |
| `resolveCategoryHandles(artikel, map)` | `src/workflows/tridata/helpers/` | Pure function returning `{ handles, unmapped }`. Unit test next to `match-products` tests: Kategorien hit, Warengruppe fallback, unknown value, multi-value, case and whitespace |
| Handle → id lookup and assignment | import workflow step | One `product_category` query per run; pass `category_ids` to `createProductsWorkflow` (and to `updateProductsWorkflow` only if §3.6 = authoritative) |
| Logging | same step | `unmappedCategories`, `missingHandles` in the run summary |
| Mock data | `tricon-mock/src/seed-data.ts`, `export-tricon-mock-seed.ts` | Export each product's shop category into the seed and emit `Warengruppe` / `Kategorien` in the format confirmed by question 2, so the mock covers hits, the fallback and unknown values. Update `tricon-mock-contract.md` |

## 5. Context: the import itself (not part of this file's scope)

The category mapping is one field of a missing feature: creating and updating Medusa products from TriBike master data. That feature needs its own plan. It has to cover:

- Product from `Artikel` and variants from `ArtikelGrFaKombi`, including option names from `FarbeBezeichnung` / `GroesseBezeichnung`.
- Handle generation.
- Price from `I_VKbrutto` (not `VKBrutto`).
- VAT from `MehrwertSteuerSatz`.
- Publish status from `I_IstOnlineAktiv`.
- Images via `DownloadArtikelbild*`.
- Brand from `Hersteller`. The planned `product-brand` module does not exist yet.
- Delta runs via `DownloadArtikel` + `LastChange`, with a new `tridata_sync_cursor` stream.
- Deletion detection via `DownloadArtikelNrAll` / `DownloadGrFaKombiBarcodeAll`.
- How imported products relate to `TridataProductMap`. Today that map is keyed by an SKU match; with real data the key is likely EAN or Artikelnummer (`tricon-mock-contract.md`, "Catalog model").
- What happens to the existing seeded and Woo-imported products.

The category step plugs into that import's create/update step and needs nothing else from it.

## 6. Text for `decisions.md` (written as part of the category-structure task)

> **TriData → category mapping.** The TriData article import assigns categories by mapping `Kategorien` (first) and `Warengruppe` (fallback) to shop category handles through an explicit map. Handles are the stable key. The import never creates, renames or moves categories; the tree is owned by the shop and changed only by migration scripts. Values without a map entry, and map entries pointing at a missing handle, leave the product without that category and are logged in the sync run summary. Until it is decided whether staff maintain categories in TriBike or in the shop admin, the import sets categories only when it creates a product. Field semantics and value formats are unconfirmed until real TriBike data is available.
