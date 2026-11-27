# Remove the links to bike-one.org: result

Commit: see the commit hash in the final report (website/, branch astro-rebuild). Decisions d27, d28, d29 (docs/plan.md, .conversion/state.json).

## Changes

- `tools/extract.mjs` (rerun `node tools/extract.mjs`, `src/content` regenerated, not hand-edited):
  - A: `a`/`area` href and `form` action on the live origin become root-relative (bare origin becomes `/`); `link rel=alternate` feeds too (C).
  - B/C: head links `https://api.w.org/`, `EditURI`, `pingback`, `shortlink` and `rel=alternate` to `wp-json` (oEmbed, REST) are dropped.
  - D: `INLINE_RE` / `ENCODED_RE` strip the origin from inline script text (plain, JSON-escaped `https:\/\/host\/`, URL-encoded `https%3A%5C%2F%5C%2Fhost`) and from `data-*` attributes (the WooCommerce variation JSON). Not after `= ? &`, so a share URL stays whole.
  - F: cause found: the extractor never entered `<template>` contents (parse5 keeps them in `.content`, not `childNodes`); the WooCommerce gallery placeholder `<img>` and `<a>` sat in one. `localise` now recurses into `.content`. `public/wp-content/themes/cosy/assets/images/wc-placeholder.png` already exists.
- `tools/dev-origin.mjs` (npm `postbuild`): dev builds only. Every form of `bike-one.org` in dist text files (html xml txt json xsl js css, `_redirects`, `_headers`; not `wp-content/uploads`) becomes `SITE_ORIGIN`. A release build (`PUBLIC_INDEXABLE=true`) is untouched. `shop.bike-one.org` and `x@bike-one.org` are never rewritten (none exist in dev builds: `SHOP_URL` is `shop.bike-one.dev`). Unit test: `test/dev-origin.test.mjs`.
- `tools/verify.mjs`: `npm run verify`, `verify:proposals` and `verify:release` go through it. Dev build: gates get `--origin $SITE_ORIGIN`; release build: no `--origin` (baseline canonical origin). `--allow-extra /VidOne.mp4` stays.
- `scripts/link-exceptions.mjs`: new `--skip-api` (set in `npm run links:exceptions`). `exceptions.json`: the 284 "WordPress API link kept as captured" records removed (56 favicon records stay).

## Setting SITE_ORIGIN

Default is `https://bike-one.dev`. Another test host: `SITE_ORIGIN=https://staging.example.com npm run build` and the same variable for `npm run verify` (it must match, the gates read it). No trailing slash needed. Run `npm run build`, not `npx astro build`, or the postbuild step is skipped.

## Scan counts (`.working-files/bike-one-links/refs.mjs`)

| Cat | Before (old default build) | After, dev build | After, release build |
|---|---|---|---|
| A a[href] | 899 | 0 | 0 (110 `a[href]` to `https://shop.bike-one.org/`: the Shop menu, d23, a different site) |
| B head links (api.w.org 56, EditURI 56, pingback 55, shortlink 43) | 210 | 0 | 0 |
| C link[rel=alternate] | 241 | 0 | 0 |
| D inline script config | 342 in 56 files | 0 | 0 |
| E form[action] | 7 | 0 | 0 |
| F img[src] | 3 | 0 | 0 |
| G visible text | 1 | 0 | 0 |
| data-product_variations | 2 | 0 | 0 |
| H canonical | 43 | 0 (bike-one.dev) | 43 |
| H .xml files (sitemaps, feeds) | 22 | 0 | 22 |
| H robots.txt Sitemap line | 1 (release only) | 0 | 1 |

`before.txt`, `after.txt` (dev), `after-release.txt`. The refs scan now also covers extension-less files (`_redirects`, `_headers`) and uses real text nodes for "visible text".

## Kept, and why

- E: nothing kept. The forms gate compares GET form actions by path and query for an action on the site's own origin, so root-relative `/Marke/<brand>/` passes.
- G: not visible text. The old scanner stripped tags with `<[^>]+>`, which broke on a `>` inside the `data-product_variations` attribute and reported its `https:\/\/bike-one.org` as text. parse5 finds no text node with `bike-one.org` in any page, before or after. Fixed in the scanner; the attribute is covered by D.
- H, release build only: `link[rel=canonical]` (43), the 22 sitemap/feed XML files, `robots.txt` Sitemap line, `ORIGIN` in `src/lib/site.mjs` and `site` in `astro.config.mjs` (not in dist), the 110 `shop.bike-one.org` Shop menu links. A later scan of a release build can ignore exactly these.
- Dev build: nothing.

## WooCommerce redirect map (shop.bike-one.org needs these paths)

Root-relative links on kept pages (counts are anchors in the built pages, all were absolute `https://bike-one.org/...` before):

| Path prefix | Links | Distinct targets | Pages |
|---|---|---|---|
| `/product/` | 206 | 44 | 9 |
| `/product-category/` | 30 | 3 (`/product-category/gravel-bikes/`, `road-bikes/`, `tt-bikes/`) | 10 |
| `/shop/`, `/cart/`, `/checkout/`, `/my-account/`, `/wishlist/` and the German names | 0 | 0 | 0 |

No shop URL was invented in the build; the new shop must answer these paths (or redirect them) on the host the links land on. The inline script config (module data `permalink`, `cart_url`, `canonicalUrl`) names the same prefixes plus `/cart/`, `/my-account/`, `/shop/`, `/checkout/` as root-relative paths.

## Verification

- `npm run verify` (dev build), `PUBLIC_INDEXABLE=true npm run verify:release` (release build): `verify-dev.txt`, `verify-release.txt`.
- Console probe `console.mjs` (5 pages x 1440/390, every non-local request aborted): `console-before.json` vs `console-after.json`, no new or gone message.
- Visual: `/`, `/main-bike/`, `/blog/`, `/Marke/trek/` at 390 and 1440, build before vs after: 0% on all 8.
