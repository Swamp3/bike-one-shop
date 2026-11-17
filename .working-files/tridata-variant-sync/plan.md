# TriCon variants -> shop variants (sizes)

## Problem
Woo-imported bikes (e.g. Specialized Tarmac SL9) have only Schaltung x Farbe variants with empty SKUs and no
`Größe` option. TriCon `ArtikelGrFaKombi` carries `FarbeBezeichnung` + `GroesseBezeichnung` per variant and
`DownloadStockColorSizeBranch` carries stock per Kombi x branch. Today `link-products` only matches existing
variants by SKU and `sync-stock` only writes inventory levels, so sizes never reach the shop.

## Decisions (user, 2026-11-17)
1. TriBike is the source of truth for size x color variants (Schaltung stays shop-side, not in the Kombi).
2. Woo has no TriBike connection (checked in WP admin), so the Woo import is throwaway starter data and
   everything in it will change. No Woo -> TriCon mapping is built (export has no usable key, SKU
   `1234-1-1-2` is a placeholder). The catalog sync is TriCon-driven: products + variants are created from
   Artikel/Kombis. Still waiting on Tridata sandbox credentials, so build and test against the mock.
   Credentials (GUID) are secret: local `.env` only.
3. New item / new size from TriCon is added to the shop.
4. Sold out / gone in TriCon: disable the variant, it must not be purchasable. No overselling.

## Overselling gap (existing data)
287 of 349 variants (all Woo imports) have `manage_inventory=false`, so they are always buyable and stock never
limits them. Only the 62 seeded variants manage inventory. sync-variants must set `manage_inventory=true`,
`allow_backorder=false` on every TriBike-linked variant and create its inventory item + levels, otherwise the
stock sync has nothing to write to.

## Proposed steps
1. `sync-variants` workflow in `src/workflows/tridata/`, run before `link-products`: per Artikel with `GrFa`,
   ensure product has option `Größe`, upsert variants (SKU = `Kombi.Artikelnummer`, options from Kombi),
   via Medusa `createProductVariantsWorkflow` / `updateProductVariantsWorkflow`.
2. Price from `Artikel` (check contract for which price field), `manage_inventory=true`.
3. Extend mock catalog so Tarmac SL9 has sizes (48-61) x colors, to test E2E.
4. Storefront: invalid option combos (see product-actions) must be filtered, otherwise adding sizes makes the
   sparse-variant dead end worse.
5. Unit tests in `workflows/tridata/__tests__` next to `match-products` tests; update PLAN.md Task 14 + TODO.md.

## Risks
- Real Kombi naming (size strings, color names vs Woo color names / swatches in `metadata.color_swatches`)
  is unknown until sandbox credentials arrive; color matching must not break the swatch lookup.
- Deleting/rewriting variants touches carts and orders that reference them; prefer disable over delete.

## Consequences of "Woo data is throwaway"
- Split: TriCon owns SKU, size, color, price, stock, branch; the shop owns images, descriptions, category,
  brand, SEO. A product created from TriCon starts as draft until content is added (no empty PDP live).
- Cutover: when the first real sync runs, Woo-imported products that no TriCon item claims are unpublished
  (not deleted) so old URLs/orders stay resolvable. Needs a one-time report before anything is unpublished.
- Existing Woo images/descriptions can be re-attached to the new TriCon product by hand or a one-time
  handle match; not automated.
