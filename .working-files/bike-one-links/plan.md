# Plan: remove the remaining links to bike-one.org from the rebuild

Owner report: the rebuild still links to bike-one.org. Work in `website/` (own git repo, branch `astro-rebuild`, read `website/CLAUDE.md` first). Never contact bike-one.org or any live site; everything needed is in `website/capture/`. No push, no merge, never on `main`, do not edit `baseline/`, do not hand-edit `src/content` (change `website/tools/extract.mjs`, rerun `node tools/extract.mjs`). Node: `source ~/.nvm/nvm.sh && nvm use 22.23.4`.

## How the findings were measured

`.working-files/bike-one-links/refs.mjs` (run from `website/`: `node ../.working-files/bike-one-links/refs.mjs`) scans `dist/` (default build, noindex) and classifies every `bike-one.org` reference by element and attribute. Run it before and after. Counts on 2026-11-25 (55 pages + 404, 56 html files):

| # | Where | Count | Example | Treatment |
|---|---|---|---|---|
| A | `<a href>` to the live origin | 899 in 55 files | `https://bike-one.org/termin-buchen/` | Make root-relative (owner approved; the links gate counts both forms as internal). Includes links to `/wp-content/uploads/...` files. Links whose target is a WooCommerce path (`/product/`, `/product-category/`, `/shop/`, `/cart/`, `/checkout/`, `/my-account/`, `/wishlist/`) also become root-relative; do NOT invent shop URLs. List them (path and count) in notes.md as the redirect map the new shop (shop.bike-one.org) needs. |
| B | WordPress head links `rel=https://api.w.org/` (56), `EditURI` (56), `pingback` (55), `shortlink` (43) | 210 | `https://bike-one.org/xmlrpc.php` | Remove from every page: they point at endpoints a static site does not have. Fix the gate records: `exceptions.json` has 284 `link` records written by `npm run links:exceptions` ("WordPress API link kept as captured"); they must be replaced by records that match the new head, and `npm run links:exceptions` must not re-add the old ones (check `scripts/link-exceptions.mjs`). Record a decision. |
| C | `<link rel=alternate>` | 241 | `https://bike-one.org/feed/`, `.../comments/feed/`, `wp-json/oembed/...`, `wp-json/wp/v2/pages/N` | RSS/Atom feed alternates: root-relative (the feeds are built locally). `wp-json` oembed and REST alternates: remove (dead endpoints). Record a decision; gate records as in B. |
| D | Inline `<script>` config JSON (WooCommerce, theme, slider, REST) | 342 in 56 files | `ajax_url`, `ajaxurl`, `nonceEndpoint`, `root` (`https:\/\/bike-one.org`, JSON-escaped), `cart_url`, `permalink`, `src`, `thumbnail`, `srcset`, `canonicalUrl`, `url`, `link` | Same-origin URLs inside inline scripts and JSON become root-relative, both the plain and the JSON-escaped form (`https:\/\/bike-one.org\/`). Keep every script working: run the console probe (below) after the change and compare. Escaped-JSON attributes such as `data-product_variations` (HTML-entity-escaped) too. |
| E | `<form action>` | 7 (GET search forms on `/Marke/*`) | `https://bike-one.org/Marke/cervelo/` | Make root-relative if the forms gate still passes (it compares the full action URL with the baseline); if it fails, keep and say why in notes.md. |
| F | `<img src>` | 3 in `dist/index.html` | `.../themes/cosy/assets/images/wc-placeholder.png` | Find out why the extractor missed it (it should already localise `img src`), fix the cause, and confirm the file exists in `public/` (copy from `capture/`/`.conversion/media-cache` only if it is in the capture; no network). |
| G | Visible text on `/` | 1 | `https:\/\/bike-one.org` | Find where it comes from. If it is a captured shortcode/JSON leak shown to visitors, the text gate (baseline) requires it: keep it and list it in notes.md. Do not change text without a gate-accepted exception. |
| H | Keep on purpose (production identity) | `link[rel=canonical]` 43, `og:*`/`twitter:*`/JSON-LD (none today), sitemap and feed XML files (22), `robots.txt` Sitemap line, `ORIGIN` in `src/lib/site.mjs` | `https://bike-one.org/blog/` | Not links to the old site: they name the production domain, the SEO and sitemap gates require them. Do not change. Write the list down so a later scan can ignore them. |

## Tasks

1. Run the scan, save the output as `.working-files/bike-one-links/before.txt`.
2. Implement A to G in `tools/extract.mjs` (and `src/` components only if a component injects a URL). Reuse the helpers already there (`localise`, `ORIGIN_RE`, `FILE_RE`, `dropScript`, `shopMenu`). One decision row per behaviour change (`docs/plan.md`, state via `node ../../astro-conversion-kit/skills/convert-site/scripts/state.mjs --dir . decision '{...}'`; copy the shape of d21 to d26 in `.conversion/state.json`).
3. Rebuild, rerun `node tools/extract.mjs` first. `npm run verify` (it already carries `--allow-extra /VidOne.mp4`) and `PUBLIC_INDEXABLE=true npm run verify:release` must pass; the visual diff must not move (spot check with `npm run review:shoot` / `review:diff` on 4 pages: `/`, `/main-bike/`, `/blog/`, one `/Marke/*`; the review server is already on :4321 and serves `dist/`, leave it running).
4. Console regression check: the probe `.working-files/bike-one-links/refs.mjs` is only a link scan; for the console use Playwright (`/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright`) against `http://localhost:4321` on `/`, `/main-bike/`, `/blog/`, `/termin-buchen/`, `/Marke/trek/` at 1440 and 390 and report any new `pageerror`, console error or failed request compared with before (known and accepted: jobrad.org frame-ancestors on `/main-bike/`, a Google Maps debug line, `JQMIGRATE` log).
5. Run the scan again, save as `after.txt`; the only remaining references must be the H list plus anything you documented as kept (E, G). Write `.working-files/bike-one-links/notes.md`: changes, decisions, before/after counts, the WooCommerce redirect-map list (A), what was kept and why.
6. Commit in `website/` (`feat: stop linking to the live site`), no push.

## Done when

The after-scan lists only category H and the documented keeps; gates, release gates and the 4-page visual spot check pass; the console check shows no regression; notes.md is written; the commit hash is reported.
