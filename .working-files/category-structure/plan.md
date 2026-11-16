# Category structure: Fahrräder / Komponenten / Zubehör

Implementer: `expert-developer` agent. Step 0 is to copy this plan to `.working-files/category-structure/plan.md` and link it from `TODO.md`. Project rule: in-progress feature plans live in `.working-files/`.

## Context

The storefront menu currently shows six flat top-level categories: Road Bikes, Gravel Bikes, Mountain Bikes, Accessories, Laufräder and Triathlon / TT. Three problems with that:

- **"Laufräder" returns 404.** Its handle is `laufräder`, with an umlaut. Next.js passes the route param percent-encoded (`laufr%C3%A4der`), and `getCategoryByHandle` (`storefront/src/lib/data/categories.ts:29`) sends that encoded string to the Store API, so no category matches. Locally, `/de/categories/laufr%C3%A4der` returns 404 and `/de/categories/accessories` returns 200.
- **"Accessories" is empty but still shown** in the menu, the footer and the `/store` category filter.
- **No hierarchy.** Wheelsets are components, not bikes, but they sit next to the bike categories. The category breadcrumb hard-codes "Fahrräder → /store" for every category, including Laufräder (`modules/categories/templates/index.tsx`).

Target structure (decided with the user, matches `planning/5-Database_Schema/schema-design.md`):

```
Fahrräder        /categories/fahrraeder
  Rennräder                 rennraeder         (was Road Bikes / road-bikes)
  Gravelbikes               gravelbikes        (was Gravel Bikes / gravel-bikes)
  Triathlon & Zeitfahren    triathlon-zeitfahren (was Triathlon / TT / triathlon-tt)
  Mountainbikes             mountainbikes      (was Mountain Bikes / mountain-bikes)
Komponenten      /categories/komponenten
  Laufräder                 laufraeder         (was laufräder; Miche + Zipp stay normal, buyable products)
Zubehör          /categories/zubehoer          (was Accessories / accessories; no subcategories until products exist)
```

Decisions:

- **Hide empty categories** in the menu, the footer and the mobile menu. A category counts as non-empty when it or any of its descendants has at least one product. With today's data, Zubehör is hidden automatically and appears once it has products.
- **Desktop menu: one dropdown per top-level category.** It opens on hover and on keyboard focus and lists the subcategories. The mobile menu shows the subcategories as expandable groups.
- **Handles are ASCII only** (ä→ae, ö→oe, ü→ue, ß→ss). The site isn't live, so changing URLs needs no redirects.

## Changes

### 1. Backend: restructure the category data

- **New migration script** `backend/apps/backend/src/migration-scripts/restructure-categories.ts`. Medusa runs each file in `src/migration-scripts/` once on `db:migrate` and records it as done.
  - Look up the existing categories by their current handle and update them: new name, new handle, `parent_category_id` and `rank`.
  - Create the two parents Fahrräder and Komponenten. Turn Accessories into the top-level Zubehör.
  - Make it idempotent: skip anything that is already in the target state, and create anything that is missing. Fresh setups also run `initial-data-seed.ts` first, and this script then restructures what the seed created.
  - Use the core workflows `updateProductCategoriesWorkflow` and `createProductCategoriesWorkflow`, in the same style as `initial-data-seed.ts`.
  - Check that Medusa runs the migration scripts in file-name order, so that this one runs after `initial-data-seed.ts`. If it doesn't, have the script create whatever is missing itself.
- **`initial-data-seed.ts`:** leave it unchanged. The migration script converts what it creates, and rewriting the seed would only duplicate the logic.
- **`import-woo-catalog.ts`:** don't touch it. It was a one-time import to get data and images, and the WordPress instance is being shut down. At the top of the file, add a one-line note that it is a one-time import whose category handles predate this restructure, so nobody runs it again by mistake.

**Later: the TriData article import.** Products will come from TriData (`DownloadArtikel`). Every article has the fields `Warengruppe` and `Kategorien` (`planning/3-Architecture_Tech_Stack/tricon-integration-notes.md`; in the mock, for example, "Fahrräder" and "Teile"). This category tree is the target that import maps onto, with the handles as the stable key. Record the mapping rule (TriData value → shop category handle; unknown values get no category and are logged) in `decisions.md` together with the tree. Building that import is not part of this task. Analysis, open questions and the `decisions.md` text: [tridata-category-mapping.md](tridata-category-mapping.md).

### 2. Storefront: category helpers (one new util)

`storefront/src/lib/util/category-tree.ts`. It works on the flat list that `listCategories()` already returns, which includes `*products`, `*category_children` and `*parent_category`.

- `descendantIds(category, all)`: the category's id plus the ids of every category below it.
- `hasProducts(category, all)`: whether `products?.length` is non-zero for the category or any descendant.
- `visibleTopLevel(all)`: the top-level categories that have products, each with only its children that have products, sorted by `rank`.

Add one small test or assert-based self-check for these functions. The recursion and the empty filtering are real logic.

Before relying on `*products`, check that the Store API returns only published products for it. If it doesn't, drafts would make a category look non-empty.

### 3. Storefront: fix the routes

- **`lib/data/categories.ts:29` `getCategoryByHandle`:** decode each segment with `decodeURIComponent` before the lookup. Handles are ASCII after step 1, but the decode makes the route robust.
- **`app/[countryCode]/(main)/categories/[...category]/page.tsx` and `modules/categories/templates/index.tsx`:**
  - Pass `descendantIds(...)` to `PaginatedProducts`. `paginated-products.tsx:35` takes a single `categoryId` today; change it to `categoryIds: string[]`, so `/categories/fahrraeder` lists every bike and not 0 products.
  - Build the breadcrumb from the real chain of parents (Start → Fahrräder → Rennräder) instead of the hard-coded "Fahrräder → /store".
  - On a parent category, show the subcategories as chips or links above the grid. Medusa's starter already loads `category_children`.
  - Keep `hiddenFacets={["kategorie"]}` on leaf categories. On parent categories, show the Kategorie facet so visitors can narrow down to a subcategory.
- **`/store` page (`modules/store/templates/index.tsx`):**
  - The Kategorie facet (`lib/util/product-filters.ts:96`) builds its values from `p.categories`. That already gives leaf names once the products move. Nothing to change there except checking that the labels are now German.
  - The page title or meta "Alle Bikes und Zubehör" (`app/[countryCode]/(main)/store/page.tsx:11`) can stay.

### 4. Storefront: navigation

- **`modules/layout/templates/nav/index.tsx`:** replace `topLevelCategories` with `visibleTopLevel(categories)`.
  - Render each top-level category as a link plus a dropdown panel listing its children.
  - The dropdown opens on `:hover` and `:focus-within`, using pure CSS with Tailwind's `group` / `group-hover` / `group-focus-within`. No client JavaScript is needed, so the nav stays a server component.
  - A top-level category without children (Zubehör later) is a plain link.
  - Keep the existing styling of the menu bar.
- **`modules/layout/components/mobile-menu/index.tsx`:** use the same `visibleTopLevel`. Each top-level category becomes a `<details>`/`<summary>` group with its children inside, plus an "Alle <Name>" link to the parent page. Native `<details>` is accessible and needs no extra state.
- **`modules/layout/templates/footer/index.tsx:85` (Kategorien column):** list `visibleTopLevel` and drop the `slice(0, 6)`.

### 5. Docs

- `PLAN.md`: add a short task entry (structure, handles, migration script), linking to the working folder.
- When the work is done, record the category tree and the ASCII-handle rule in `planning/3-Architecture_Tech_Stack/decisions.md`, then delete `.working-files/category-structure/` in the same change.

## Out of scope

- Real accessory or component subcategories (Helme, Pedale, Schaltgruppen, …): add them once BikeOne has those products.
- Bekleidung and Werkstatt/Service categories.
- Redirects from the old handles: not needed, the site isn't live.
- A brand mega-menu.
- The TriData article import itself, and the mapping of `Warengruppe`/`Kategorien` in code.
- Changes to `import-woo-catalog.ts` beyond the one-line note.

## Verification

1. Run `make migrate`, or `npx medusa db:migrate` in `backend/apps/backend`. Then confirm the tree in Postgres:
   `select name, handle, parent_category_id, rank from product_category where deleted_at is null order by parent_category_id nulls first, rank;`
   Run the migration a second time and confirm that nothing changes.
2. Run the `curl -s -o /dev/null -w '%{http_code}'` check:
   - Expect 200 for `/de/categories/fahrraeder`, `/rennraeder`, `/komponenten` and `/laufraeder`.
   - Expect 200 for `/zubehoer`, which shows the "no products" state but is not linked from anywhere.
3. Take Playwright screenshots at 1440px and 390px, using the existing pattern in the scratchpad `shot.mjs`:
   - The menu bar shows Fahrräder and Komponenten, not Zubehör.
   - The dropdown opens on hover and on Tab focus.
   - In the mobile menu, the groups expand.
   - The footer column matches the menu.
   - The breadcrumb on `/de/categories/laufraeder` reads Start › Komponenten › Laufräder.
   - `/de/categories/fahrraeder` shows all bikes.
4. Run the storefront typecheck (`npx tsc --noEmit` in `apps/storefront`) and the new self-check for `category-tree.ts`.
5. Run `npm run build` from `backend/`. The category pages are statically generated from the new handles.
