# Mobile header and product search

Implementer: `expert-developer`. Storefront only, no backend or data changes.

## Context

Problems the user reported on mobile (screenshot at roughly 375px width):

1. **The icons cover the logo.** The header row contains: menu, logo, search, store, account and cart.
   - The logo is `shrink-0`, and every icon is `shrink-0` as well.
   - The right-hand cluster uses `ml-auto flex-1 justify-end` (`modules/layout/templates/nav/index.tsx:34`), so it overflows to the left and lies on top of the logo.
   - Five 38px icons plus gaps, plus the 150px logo (`h-6`, aspect ratio 1683:269), do not fit into 343px.
2. **The store panel is cut off on the left.**
   - The panel is `absolute right-0 w-[min(320px,…)]` and anchored to the pin button's wrapper (`modules/layout/components/store-picker/index.tsx:61`, wrapper at `:96`).
   - The pin is not at the right edge, because account and cart sit to its right. So the 320px panel extends past the left edge of the screen.
3. **Searching "Cervelo" finds nothing.**
   - The search sends `?q=` to Medusa `/store/products` (`modules/store/templates/paginated-products.tsx:58`), which does an SQL `ILIKE`.
   - Product titles say "Cervélo" (the import normalizes them, `import-woo-catalog.ts` `cleanTitle`), so accent-free input never matches.
   - The brand (collection), groupset and category are also not searched.

## Changes

### 1. Mobile header (`nav/index.tsx`)

- Account link: `hidden md:flex`. On mobile, "Mein Konto" stays reachable as an entry in the drawer (`mobile-menu/index.tsx:146`), as the user suggested.
- Logo: `h-5 md:h-7` (about 125px on mobile) and `min-w-0`, so it can never be pushed underneath the icons.
- Right-hand cluster: on mobile only `gap-1.5`, and no `flex-1`. Keep `flex-1` from `md:` up so the desktop search bar still grows.
- Remove the stale `TODO(mobile-layout)` comment at `:39` once the row works.
- Target: menu, logo, search, store and cart fit without overlap at 360px and 390px.

### 2. Store panel (`store-picker/index.tsx`)

For `variant="mobile"`, anchor the panel to the header row, not the button. The header row is already `relative`; `NavSearch variant="icon"` uses the same pattern with `absolute inset-x-0 top-full`.

- Remove `relative` from the mobile wrapper (`:96`).
- Give the panel a position class per variant:
  - mobile: `left-4 right-4` with no fixed width
  - compact and strip: keep `right-0 w-[min(320px,calc(100vw-2rem))]`
- Close the mobile search panel when the store panel opens, and the other way around, if both can be open at once. Check this; only change it if they really overlap.

### 3. Search (storefront, in memory)

- **Approach.** `listProductsWithSort` (`lib/data/products.ts:108`) already loads up to 100 products and filters them in memory (existing `shortcut:` comment, catalog: 44 bikes). Search follows the same pattern.
- **Query:** do not send `q` to the backend any more.
- **Matching:** match `q` in memory against a normalized text made of:
  - title
  - brand (`collection.title`)
  - category names
  - the values of the `Schaltung` option
  - tags
- **New helper** `matchesQuery(product, q)` in `lib/util/product-filters.ts`, next to `matchesFilters`.
  - Normalize both sides: `toLowerCase()`, then `normalize("NFD")`, then remove `\p{Diacritic}`, then `ß → ss`.
  - Split the query on spaces. Every word must appear as a substring.
  - Results: "cervelo" finds "Cervélo …", "sram force" finds products with SRAM Force, and "rennrad" finds nothing (acceptable, see below).
- **Facets:** compute them on the result set, as for filters, so the sidebar matches the hits.
- **Self-check:** an assert-based check in the style of `scripts/check-category-tree.mjs` (accents, ß, several words, an empty query).
- **Comment** at the helper: `shortcut: substring match over the first 100 products, no typo tolerance; switch to the backend search index (src/search/product.ts, /store/search) when the catalog grows past 100 or typo tolerance is needed.`

The backend already has a product index with `typo_tolerance` (`backend/apps/backend/src/search/product.ts`, middleware `/store/search`), but the storefront never uses it, and nobody has checked whether a search provider is running. Switching to it is out of scope here and stays the documented upgrade path.

## Out of scope

- Typo tolerance ("Cervello"), suggestions while typing, and synonyms ("Rennrad" → Rennräder).
- Changes to the desktop header.
- Changes to the backend search index.

## Verification

1. Run the storefront typecheck (`npx tsc --noEmit -p .` in `apps/storefront`) and the new self-check.
2. Take Playwright screenshots at 360, 390 and 1440px:
   - Mobile: the logo is fully visible, the icons do not overlap, and there is no account icon.
   - Mobile: the store panel is open and fully inside the screen.
   - Desktop: unchanged, with search, DE, store, account and cart.
3. Run the search checks and compare the hit counts against the database:
   - `/de/store?q=Cervelo` and `/de/store?q=cervélo` both show the Cervélo bikes.
   - `/de/store?q=sram%20force` shows hits.
   - `/de/store?q=xyz` shows "Keine Ergebnisse für „xyz“."
4. The "Mein Konto" entry in the mobile drawer leads to `/de/account`.
