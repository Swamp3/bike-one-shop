# Product listing (PLP) layout plan

Goal: a calmer, denser product listing with a structured filter sidebar, colour variants on each card, and uniform cards where the whole bike is visible. The reference is Canyon's road bike listing: a filter column on the left, a toolbar above the grid (count + sort), a 3-column grid with equal-height cards, product photos on a light grey stage, colour dots and a groupset line under the image.

Affected pages: `/store` (`modules/store/templates/index.tsx`) and `/categories/...` (`modules/categories/templates/index.tsx`). Both use `RefinementList` and `PaginatedProducts`, so every change lands on both.

## 1. Real catalogue data (WooCommerce export, 2026-11-13)

Source: `~/bikeone-wp-export/` (`products.ndjson`, `variations.ndjson`, `media.ndjson`, exported with `scripts/wp-export.sh`). The decisions in this plan are based on these numbers, not on the demo seed.

| Fact | Value | Consequence |
| --- | --- | --- |
| Products | 47 (44 published, 3 drafts: Pinarello Dogma X, Cervelo Soloist MY27, its "(Kopie)"), 371 variations | Import only `publish`. A category holds at most 23 products, well under the 100-product in-memory limit (see 4.3). |
| Categories | RoadBikes 23, GravelBikes 16, TT / Triathlon 8; one category per product | Category pages: Rennräder, Gravelbikes, Triathlon & Zeitfahren. No subcategories yet. |
| Brands (`brands` taxonomy) | Cervélo 11, Wilier 8, Trek 7, Specialized 6, Ridley 6, Factor 6, Pinarello 3 | Brand facet with 7 entries. Use the `brands` taxonomy, not the `Marke` attribute, which disagrees with it (e.g. Factor 4 vs 6). |
| Variation axes | `Schaltung` × `Farbe` on all products. `Größe` only on 1 product (Soloist, 48 to 61). `Upgrade Laufräder` on 1 product. | **No size data.** A Canyon-style size filter is not possible yet (see 6). |
| Colours (`Farbe`) | ~120 distinct manufacturer names ("Black Magic", "Cloud Burst", "Gloss Dark Star/Matte Deep Smoke", "blau", "Weiß"), mixed languages and casing. Per product: 1 to 10, most have 2. | Name-to-hex in code (like `COLOR_SWATCH_MAP` on the PDP) doesn't scale. Store hex + colour family per value during the import (3.3). Card dots fit easily (max 10). |
| Groupsets (`Schaltung`) | 16 values, e.g. SRAM Force 84 variations, SRAM Rival 67, Shimano Ultegra Di2 58. Inconsistent casing ("Sram Force" vs "SRAM Rival"), one "Frameset". Per product: 1 to 6. | Strong facet (like Canyon's "Schaltungstyp"). Normalize names during the import. Also derive "elektronisch / mechanisch". |
| Frame material | Carbon 42, Aluminium 5 (product-level attribute) | Small but useful facet. Medusa has a built-in `product.material` field. |
| Prices | 1,999 to 18,000 €, median 5,600 €. Road 1,999 to 15,499, Gravel 1,999 to 8,499, TT 5,299 to 18,000. 27 of 47 products have different prices per variation. | "ab 4.299 €" on most cards. Price facet with min/max inputs. |
| Sale prices, tags | none | No "Sale" or "Neu" badges, no strike-through prices. This also avoids the PAngV 30-day-lowest-price rule for now. |
| Stock status | all `instock` | Not maintained. Don't show a stock badge or availability filter until TriCon stock sync is live. |
| Short description | empty for all products | No subtitle text. The card's second line shows the groupset instead. |
| Images | 1 main image per product, 1 image per variation. All cut-out bikes: 26 on white, 21 transparent. All landscape, aspect 1.33 to 1.84 (median ~1.68). jpg/avif/png/webp. | 16:10 stage, `object-contain`, `mix-blend-multiply` (5.1). Variation images enable a later colour hover swap. |
| SKUs | placeholders (`1234-1-…`), shared between parent and variations | Never use as a key or display them. Real article numbers come from TriCon. |
| Names | typos and inconsistent naming ("Ridley Falcn", "Cervelo" without accent, "Aspero" next to "Aspero-5") | Clean up in the import mapping, not in the storefront. |

### Is the data ready?

- **For the plan:** yes. The export has everything needed to decide layout, facets and card content.
- **For the shop:** not yet. The storefront still shows the Medusa demo seed. The real catalogue has to be imported first (Phase 0), otherwise the new PLP gets built and checked against T-shirts.
- **Missing, and not in WooCommerce at all:** frame sizes, real stock, colour hex values, product descriptions, real SKUs. Sizes and stock come from TriCon. Colour hex and descriptions need manual work.

## 2. Current storefront problems

| Problem | Cause in code |
| --- | --- |
| Bike images are cropped | `Thumbnail` renders `next/image` with `object-cover` and carries `aspect-[9/16]` from its `size="full"` default, which fights the card's `aspect-[4/3]` wrapper. |
| Cards are tall and uneven | Optional collection label, title without line clamp, price + stock badge, and a full-width "Ansehen" button (~45 px), although the whole card is already a link. |
| Grid is cramped | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` counts columns against the viewport, not the space next to the 250 px sidebar. |
| Filters show irrelevant options | `RefinementList` fetches all non-exclusive product options globally (`/store/product-options`), including demo clothing options (Material, Fit, Sleeve). |
| Sidebar has no structure | Every option is an open `<details>` with a button grid. No counts, no collapse icon, no order, sort sits inside the sidebar. |
| No variants on the card | The card ignores `product.options`. |

## 3. Phase 0: Import the real catalogue (prerequisite)

**Status 2026-11-13: done** with `backend/apps/backend/src/scripts/import-woo-catalog.ts` (colour table: `scripts/woo-colour-swatches.py` -> `src/scripts/data/woo-colour-swatches.json`).

- 44 published products, 287 variants (`manage_inventory: false`), every variant linked to its photo. Prices 1,999 to 18,000 €.
- EUR and region price preferences switched to tax-inclusive (Woo prices are gross).
- The 7 dev-seed products are set to draft, not deleted. Conflicting handles got a `-seed` suffix (`factor-ostro-vam`, `cervelo-aspero-5`, `wilier-adlar`).
- Data the storefront can use:
  - options per product (product-scoped): `Schaltung`, `Farbe`, plus `Upgrade Laufräder` on the Adlar
  - `product.material` (Carbon / Aluminium)
  - brand = collection (7)
  - categories: Road Bikes 20, Gravel Bikes 16, Triathlon / TT 8
  - `metadata.color_swatches` (`{ "<Farbe value>": "#hex" }`, auto-suggested, 4 corrected by hand)
  - `metadata.woo_id`, `metadata.woo_slug` (old URL, for redirects)
- Handles are built from the product name, not the Woo slug. Several Woo slugs belong to other products (e.g. `wilier-turbine-sl` was "Ridley Triton Fast").
- Skipped: 2 Woo variations with duplicate options (Wilier Rave SLR ID2 #2830, Factor Aluto #2923), see `SKIP_VARIATIONS` in the script.
- Data issues to fix at the source:
  - Cervélo P5: the photos for "Five Black" and "Red Hot" look swapped.
  - The Woo "Größe" sizes exist only on a draft product, so no frame sizes are in the shop.

A Medusa script in `backend/apps/backend/src/scripts/` (idempotent, like `seed-demo-products.ts`) that reads the export files.

### 3.1 Mapping

| WooCommerce | Medusa |
| --- | --- |
| `slug` | product `handle` (keeps URLs, simple SEO redirects) |
| `name` | `title`, via a cleanup table for typos and accents |
| `brands[0]` | collection (existing pattern: brand = collection) |
| `categories[0]` | category: Rennräder, Gravelbikes, Triathlon & Zeitfahren |
| `Rahmen Material` | `product.material` (Carbon / Aluminium) |
| variation `Schaltung`, `Farbe` (+ `Größe`, `Upgrade Laufräder` where present) | product options + variants |
| variation `price` | variant price in EUR |
| `images[0]`, variation `image` | uploaded via the file module: product thumbnail, variant images |
| Woo `id`, variation `id` | `metadata.woo_id`, `metadata.woo_variation_id` |
| `status` | only `publish` is imported |

- Products that bundle several models as variations (e.g. "Trek Madone Domane SL", where the models differ by groupset) stay one product with a `Schaltung` option. That is how the data is modelled, and the card shows "ab" price + number of builds.
- Check before the import whether Woo prices are gross (incl. 19% VAT, usual for German shops) and set the Medusa region's tax-inclusive pricing accordingly. A mismatch shows wrong prices everywhere (PAngV).

### 3.2 Groupset normalization

A mapping table for the 16 groupset names: fix casing (`Sram` → `SRAM`), and add the type (`elektronisch` for Di2/AXS, `mechanisch` otherwise). Put the type in option value `metadata` so the facet can use it.

### 3.3 Colour table

- One table: Woo colour name → `{ hex, family }`, where family is one of Schwarz, Weiß, Grau/Silber, Blau, Grün, Rot, Gelb/Gold, Orange, Lila/Pink, Braun/Beige, Mehrfarbig.
- Pre-fill it automatically: take each variation image and compute the dominant non-background colour of the frame. Then have a person review the ~120 rows. The automatic value will be wrong for multi-colour and "fade" paint jobs.
- Store it in option value `metadata` (`{ hex, family }`). The card reads the hex, the filter groups by family. `COLOR_SWATCH_MAP` on the PDP switches to the same metadata, with the map as fallback.

### 3.4 Check

The script prints a report: imported, skipped (drafts), unmapped colours or groupsets, missing images. Run `legal-security-reviewer` because the import changes the prices shown to customers.

## 4. Phase 1: Product card and grid

**Status 2026-11-13: done** in `modules/products/components/bikeone-product-card/index.tsx` (colour util: `lib/util/color-swatches.ts`).

- Card renders `next/image` directly on a fixed `#f1f3f5` 16:10 stage (`object-contain`, `mix-blend-multiply`, 5% padding), also in dark mode. `Thumbnail` unchanged.
- Fixed slots: colour dots (max 6, `+N`), brand, 2-line title, groupset line ("N Ausstattungen" when several), price with "ab" when variant prices differ. "Ansehen" button and stock badge removed.
- Dot colour: `metadata.color_swatches`, then `COLOR_SWATCH_MAP` (moved out of `color-swatch-select.tsx`), then grey. The PDP swatches still use only the map (not switched to metadata yet).
- Grid `grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`; `SkeletonProductGrid` shows sidebar + card-shaped placeholders and is the Suspense fallback of all three listing templates.
- Home "Empfohlen" and related products request `+metadata` so their cards get the dot colours too.
- Not done: the 1-column mobile comparison (4.4) is left for review.

### 4.1 Image: whole bike, same box for every product

- Render the card image directly with `next/image` in `BikeOneProductCard`, not via `Thumbnail`. Leave `Thumbnail` unchanged, because other pages use it.
- Stage: `aspect-[16/10]`, light grey (`bg-bo-surface-2`), `object-contain`, `mix-blend-multiply`, ~5% padding. `multiply` turns the white backgrounds of 26 images into the stage grey. The stage stays light grey in dark mode too, otherwise `multiply` darkens the bike.
- `sizes` for the new grid: about `(min-width:1280px) 30vw, (min-width:768px) 45vw, 50vw`.
- Placeholder (no image): same stage with the existing `PlaceholderImage` icon.

### 4.2 Card body: fixed slots, equal height

Every slot is always rendered (empty slots keep their height), so rows line up:

1. Colour dots (fixed ~18 px row), see 4.3.
2. Brand, from the collection title. Mono caps, 1 line.
3. Title. `line-clamp-2` with a 2-line min-height (titles are 10 to 32 characters, so mostly 1 line).
4. Groupset line, 1-line clamp: one groupset → its name ("Shimano Ultegra Di2"). Several → "4 Ausstattungen". This replaces Canyon's spec line, since there are no descriptions.
5. Price: "ab 4.299 €" when variant prices differ, otherwise "4.299 €". `mt-auto`, so it sits at the bottom.

- Remove the "Ansehen" button. The whole card is a link. Hover: border colour + slight image zoom.
- Remove the static "Ab Lager verfügbar" badge until real stock exists (all Woo products say `instock`, which isn't maintained).
- No badges for now: no tags and no sale prices exist.

### 4.3 Colour dots (display only)

- Read the `Farbe` option's values. Hex from value `metadata.hex` (3.3), fallback to the existing `COLOR_SWATCH_MAP`, then neutral grey. Move the map from `product-actions/color-swatch-select.tsx` to `lib/util/color-swatches.ts` so both use one source.
- 12 px dots, 1 px border (white dots need it). Max 6, then `+N`.
- Accessibility: `<ul aria-label="Erhältlich in: Black Magic, Cloud Burst">`, each dot with `title` = colour name. Not buttons, since display only.
- Data: confirm `options.values` (with `metadata`) is in the `listProducts` fields. Currently it requests `*variants.options`. Add `*options.values` if needed.

### 4.4 Grid

- Columns relative to the content column: `grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`, gap ~16 px desktop, ~10 px mobile.
- Mobile: 2 columns. Check against 1 column in review.
- `SkeletonProductGrid` gets the same card shape.

## 5. Phase 2: Filter sidebar

**Status 2026-11-13: done** with `lib/util/product-filters.ts` (parse, match, facets), `listProductsWithSort` in `lib/data/products.ts`, `modules/store/components/refinement-list/` (layout, toolbar, drawer) and its `filter-panel/`.

- `PaginatedProducts` is now the shared listing body (sidebar + toolbar + grid + pagination) for `/store`, `/categories/...` and `/collections/...`. The page head no longer shows the count; the toolbar does ("N Artikel").
- URL params (shareable, repeatable for OR): `kategorie` (category handle), `marke` (collection handle), `schaltgruppe` (value name), `farbe` (colour family), `material`, `preis_min`, `preis_max`. The old `optionValueIds` param is gone: options are product-scoped, so value ids differ per product.
- All filtering happens in memory on the up to 100 products of the listing, brand included (not `collection_id`), so every group can count disjunctively. Each group counts the products that match all other groups. Values with 0 results are hidden unless selected.
- Matching is per product: "SRAM Force + Schwarz" matches a bike that has both values, even if no single variant combines them. Price matches when any variant price lies in the range.
- Kategorie is hidden on category pages, Marke on collection pages. URL params for a hidden group are ignored there.
- Deviations: no Schaltungstyp group (groupset names don't reliably encode electronic/mechanical, and 3.2 wasn't done in the import). The colour family is derived from the swatch hex by HSL buckets in `colorFamily()`, not stored per value (3.3). It inherits the errors of the auto-suggested hex values (e.g. "Red Hot" lands in Schwarz) and has no "Mehrfarbig".
- Category names come from the data ("Road Bikes", "Gravel Bikes", "Triathlon / TT"), not the German names in 5.2.
- Open: `legal-security-reviewer` for the "ab" price display.

### 5.1 Toolbar above the grid

- `23 Artikel` + `Sortieren ▾`, right-aligned at the top of the grid column. Sort moves out of the sidebar.
- Mobile: sticky toolbar under the header with `Filter (n)` + `Sortieren`, opening the existing drawer.

### 5.2 Sidebar structure

- Heading `Filter`. Active filter chips + `Alle zurücksetzen` right under it.
- Each group is a collapsible card with a `+`/`–` icon. Keep `<details>`/`<summary>` for keyboard support.
- Groups, in this order, all based on the real data:

| Group | Values | Control | Open by default |
| --- | --- | --- | --- |
| Kategorie (only on `/store`) | Rennräder, Gravelbikes, Triathlon & Zeitfahren | checkbox list with counts | yes |
| Marke | 7 brands | checkbox list with counts | yes |
| Preis | min/max of the current listing | two number inputs (€) | yes |
| Schaltgruppe | up to 16 groupsets | checkbox list, first 5 + `Mehr anzeigen` | no |
| Schaltungstyp | elektronisch / mechanisch | checkbox list | no |
| Farbe | colour families (not ~120 names) | swatch + label list | no |
| Rahmenmaterial | Carbon / Aluminium | checkbox list | no |

- Show counts per value and hide values with 0 results in the current context.
- Semantics: OR within a group (SRAM Force or SRAM Rival), AND across groups (SRAM and Carbon).

### 5.3 Facets from the current listing, computed on the server

- Stop fetching global options in the client (`/store/product-options`). `listProductsWithSort` already loads up to 100 products per listing for sorting. From that set, derive facets, counts and price min/max, and pass them as props to `RefinementList`.
- This removes the clothing options, one client request and the loading flicker.
- Filtering on brand uses `collection_id` (Medusa native). Colour family, groupset type, price and material filter in memory on the same set. Option values keep using `option_value_id` if Medusa's semantics match the OR/AND rule above, otherwise also in memory.

> shortcut (already present today): sorting, filtering and counts work on at most 100 products per listing. The largest real category has 23, the whole catalogue 44. Move to a search index (Meilisearch/Algolia) or a backend facet endpoint when one listing exceeds ~100 products.

## 6. Later (needs data that doesn't exist yet)

| Item | Needs |
| --- | --- |
| Rahmengröße facet + "Welche Größe passt?" box | Size data from TriCon or manual entry. WooCommerce has sizes for 1 product only. |
| Stock badge + Verfügbarkeit facet | TriCon/Tridata stock snapshot (PLAN.md). |
| Colour hover: swap card image to that colour's variant image | Variant images from Phase 0 (already in the export). |
| Subcategory image tiles above the grid (Canyon row) | Subcategories (e.g. Endurance, Aero) and category images (`metadata.image`). |
| Sale / Neu badges, strike-through prices | Real campaigns. PAngV §11: show the lowest price of the last 30 days with any reduction, which needs price history. Route through `legal-security-reviewer`. |

## 7. Verification

- 360, 768, 1280, 1920 px: every card in a row has the same height, no bike is cropped (check a 4:3 transparent PNG and a 16:9 white JPG), placeholder cards have the same height.
- White-background and transparent images look the same on the grey stage.
- Filters: no clothing options. Counts match the grid. OR within, AND across groups. Reset clears everything.
- Keyboard: groups toggle with Enter/Space, checkboxes reachable, focus visible. Colour names readable by screen readers.
- `legal-security-reviewer` before shipping the import (prices) and the "ab" price display.

## 8. Order

1. Phase 0: import script + groupset and colour tables. Without it there's nothing real to look at.
2. Phase 1: card, image, colour dots, grid.
3. Phase 2: toolbar, sidebar structure, server-side facets.
4. Section 6 items as data becomes available.
