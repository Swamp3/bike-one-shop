# Technical SEO Audit — Storefront

Findings from a technical SEO review of `backend/apps/storefront` (Next.js
App Router), and their current state. Scope: Next.js Metadata API, Core Web
Vitals (`next/image`/`next/font`), semantic HTML/a11y, structured data,
crawling/indexing controls, and brand-name consistency.

Status legend: **Fixed** (change is in this branch) · **Deferred** (known,
not fixed here — reason given) · **N/A** (reviewed, no action needed).

## Critical SEO blockers

| # | Issue | File(s) | Status |
|---|---|---|---|
| 1 | `images.unoptimized: true` disabled Next.js image optimization site-wide (no AVIF/WebP, no responsive resizing) | `next.config.js` | **Fixed** — removed the flag; added `sharp` as a dependency (required for self-hosted image optimization, wasn't installed) |
| 2 | Homepage LCP hero was a CSS `background-image`, not `next/image` — no preload, no format optimization | `src/modules/home/components/hero/index.tsx` | **Fixed** — replaced with `next/image` (`fill`, `priority`, descriptive `alt`) |
| 3 | `priority` never set on any `<Image>` — LCP candidates lazy-loaded by default | `src/modules/products/components/thumbnail/index.tsx`, `bikeone-product-card/index.tsx`, `store/templates/paginated-products.tsx` | **Fixed** — `Thumbnail`/`BikeOneProductCard` now accept `priority`; the first card in the PLP/collection/category grid (`paginated-products.tsx`) sets it. (Homepage's "Empfohlen für dich" grid intentionally left non-priority — it's below the Hero, which is the actual homepage LCP element; marking it too would compete for bandwidth.) |
| 4 | Category page title built as `"{name} \| Medusa Store"` then wrapped again → rendered `Name \| Medusa Store \| Medusa Store` | `src/app/[countryCode]/(main)/categories/[...category]/page.tsx` | **Fixed** |
| 5 | Collection & category pages shipped unbranded leftover starter copy ("Medusa Store") instead of "BikeOne" | `categories/[...category]/page.tsx`, `collections/[handle]/page.tsx` | **Fixed** (also see brand-name section below — two more instances found while fixing this) |
| 6 | Category page canonical was malformed: missing leading slash, `countryCode`, and the `/categories` segment — resolved to the wrong URL | `categories/[...category]/page.tsx` | **Fixed** — now `/${countryCode}/categories/${category.join("/")}` |
| 7 | No `sitemap.ts` / `robots.ts` — no discovery signal for products/categories/collections, no way to block crawling of cart/checkout/account | *(new files)* | **Fixed** — added `src/app/sitemap.ts` (products, collections, categories, per region/country) and `src/app/robots.ts` (disallows `/*/cart`, `/*/checkout`, `/*/account`, `/api/`) |
| 8 | Cart/checkout/account pages had no `robots: noindex` — transactional/PII pages indexable by default | `cart/page.tsx`, `checkout/page.tsx`, `account/@dashboard/{orders,orders/details/[id],payment,profile,logout}/page.tsx` | **Fixed** — added `robots: { index: false, follow: false }` to each |
| 9 | Hardcoded, non-descriptive `alt="Thumbnail"` on every product image | `src/modules/products/components/thumbnail/index.tsx` | **Fixed** — `Thumbnail` now takes an `alt` prop; `BikeOneProductCard` passes `product.title` |
| 10 | No `application/ld+json` structured data anywhere — no `Product`/`Offer` rich-result eligibility on any PDP | `src/modules/products/templates/index.tsx` | **Fixed** — added a typed `buildProductJsonLd()` helper (`product-json-ld.ts`) emitting `Product` + `Offer` (price, currency, availability) per variant; PDP renders it via `<script type="application/ld+json">` |

## Company name correction (Bike One → BikeOne)

The company name was inconsistently rendered as "Bike One", "BIKE ONE", and
"BIKE-ONE" across user-facing copy. Standardized to **BikeOne** everywhere
found (component/identifier names like `BikeOneGallery` already used this
form and were untouched):

| File | Was | Status |
|---|---|---|
| `products/[handle]/page.tsx` (PDP title) | `Bike One` | **Fixed** |
| `store/page.tsx` (description) | `Bike One` | **Fixed** |
| `(main)/page.tsx` (homepage title) | `Bike One` | **Fixed** |
| `click-collect/page.tsx` (description + body copy) | `BIKE ONE` / `BIKE-ONE` | **Fixed** |
| `modules/layout/templates/footer/index.tsx` (copyright line) | `BIKE ONE` | **Fixed** |
| `modules/cart/components/sign-in-prompt/index.tsx` | `BIKE ONE` | **Fixed** |
| `modules/account/components/register/index.tsx` (signup copy) | `BIKE-ONE` | **Fixed** |
| `account/@dashboard/logout/page.tsx` (description) | `BIKE ONE` | **Fixed** |
| `account/@login/page.tsx` (title/description) | English, "Medusa Store" | **Fixed** — rebranded to German/BikeOne, matching the rest of the storefront's copy |
| `modules/layout/components/side-menu/index.tsx` | `Medusa Store` | **Fixed** — dead code (component isn't imported anywhere, superseded by the BikeOne nav), fixed anyway so it can't be revived with stale branding |

Left unchanged, deliberately: the discount-code placeholder text
`"z. B. BIKEONE10"` in `checkout/components/discount-code/index.tsx` — a
coupon-code example (all-caps convention like "SAVE10"), not a rendering of
the brand name. Email domains (`@bike-one.de`) also left as-is — those are
real addresses, not display copy.

## Legal / placeholder links

| Issue | File(s) | Status |
|---|---|---|
| "Datenschutzerklärung" / "Datenschutz" links were `href="#"` placeholders | `modules/account/components/register/index.tsx`, `modules/layout/templates/footer/index.tsx` | **Fixed** — pointed at `https://bike-one.org/datenschutz/` (external, `target="_blank" rel="noopener noreferrer"`) per instruction to use that as a starting point. **Note:** this is a placeholder domain given for now — confirm the real production privacy-policy URL before launch and update both links if it differs. |
| "Impressum", "AGB", "Widerrufsrecht" links are still `href="#"` | `modules/layout/templates/footer/index.tsx` | **Deferred** — no target URL provided; Impressumspflicht (legal disclosure requirement) makes the Impressum link a legal blocker, not just an SEO one — needs a real URL before launch |
| Register form's "AGB" link still `href="#"` | `modules/account/components/register/index.tsx` | **Deferred** — same reason |
| Hero secondary CTA ("Beratungstermin buchen.") links to `href="#"` | `modules/home/components/hero/index.tsx` | **Deferred** — no booking route exists yet |

## Opportunities (non-blocking)

| Issue | File(s) | Status |
|---|---|---|
| Root `metadata` has no `title.template`/default, no `openGraph`/`twitter` block | `src/app/layout.tsx` | **Deferred** — `opengraph-image.jpg`/`twitter-image.jpg` are already auto-wired by Next's file convention; a default title template would help pages that omit their own metadata |
| `getBaseURL()` falls back to `https://localhost:8000` in production if `NEXT_PUBLIC_BASE_URL` is unset | `src/lib/util/env.ts` | **Deferred** — would silently poison every absolute OG/canonical/sitemap URL; worth a hard failure in production builds |
| No self-referencing canonical on `store/page.tsx` or the homepage; collection/category canonicals ignore facet query params (`sortBy`, `page`, `optionValueIds`) | `store/page.tsx`, `collections/[handle]/page.tsx`, `categories/[...category]/page.tsx` | **Deferred** — the malformed/missing canonical (blockers #4–#6) is fixed; params-aware de-duplication is a follow-up |
| `eslint.ignoreDuringBuilds: true`, `typescript.ignoreBuildErrors: true` | `next.config.js` | **Deferred** — not SEO itself, but it's how bug #4 (double "Medusa Store" in a title) shipped silently; worth tightening separately |
| `<html lang="de">` hardcoded despite locale-aware `[countryCode]` routing | `src/app/layout.tsx` | **Deferred** — fine while DE is the only market; revisit if a non-DE locale ships |

## Verification performed

- `npx tsc --noEmit` — clean, no errors introduced.
- `npx next lint` — no new lint errors (pre-existing errors in unrelated files: `global-error.tsx`, `lib/data/cart.ts`, `language-select/index.tsx`).
- Could not run a full `npm run build`/`npm run storefront:dev` in this session (no Postgres/Redis/Medusa backend running here, no `.env` configured) — PLAN.md also documents a pre-existing, unrelated Next.js production-build issue with the auto-generated `/404`/`/500` pages in this monorepo layout. The image-optimization fix (dependent on `sharp`) and the new `sitemap.ts`/`robots.ts` routes should be smoke-tested against a running backend before merge.
