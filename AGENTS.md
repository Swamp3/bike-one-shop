# Working in this repository

The static Astro site of BikeOne, a bike retailer with two stores (Oldenburg, Osnabrück): https://bike-one.dev while in development,
https://bike-one.org in production. Native Astro: `.astro` components, content collections, one small hand-written stylesheet set,
self-hosted fonts, and no request to any third party while a page renders. The shop is a separate site (`https://shop.bike-one.dev` in
development, `https://shop.bike-one.org` in production, `SHOP_URL` in `src/lib/site.mjs`).
Start with `README.md` (commands), `docs/redesign.md` (why the site is built this way, the IA table), `docs/TODO.md` (what is open) and
`docs/plan.md` (how it is built, and the ledger of every decision). Plan and stage notes of the redesign are in the parent repository under
`.working-files/astro-native-redesign/`.

## Branch
- All work happens on `astro-rebuild`. `main` holds only the scaffold until launch.
- Never commit to `main` directly. Never force-push, never push without the owner's go-ahead (history still holds big video files, see `docs/TODO.md`).

## How the site is built
- Every page is native Astro on `src/layouts/Base.astro` (head via `components/SEO.astro`, `Header`, `Footer`): `index`, `ueber-uns`,
  `service`, `stellenangebote`, `termin-buchen`, `blog`, `404`, `[legal]` (Impressum, Datenschutz), `[post]` (blog posts), `[booking]` (the two
  booking pages), `feed/index.xml.js` (RSS), `robots.txt.js`. Tokens, base styles and fonts: `src/styles/`. Photos: `src/assets/photos/`
  (`astro:assets`, AVIF and WebP).
- Content collections (`src/content.config.ts`): `stores`, `brands`, `legal` (Impressum and Datenschutz, the old site's text unchanged), `blog` (five posts).
- Third-party content (etermin.net booking, Google Maps, the JobRad calculator) only loads behind the click-to-load `components/Embed.astro`.
- The home hero is the poster photo only: no video, no pause button, no request for a video (decision d71; how to bring it back: `docs/TODO.md`).
- Text is never retyped or paraphrased. Legal text is not rewritten without the lawyer's text (`docs/TODO.md`, Legal).
- Fonts come from `@fontsource` (pinned), Roboto and Roboto Condensed, woff2 via Vite. Nothing loads from googleapis or gstatic.
- Shell scripts that stay: `scripts/review-serve.mjs` (serves `dist/` on :4321 with `dist/_redirects` applied; the checks `net`, `ui`, `embeds`,
  `perf` and `screens` need it), `scripts/state.mjs` (adds decisions to `.conversion/state.json`), `scripts/build-redirects.mjs` (compiles
  `redirects.csv` to `_redirects`) and `scripts/lib/{node-version,redirects-csv,review-routes}.mjs`.

## Gates on every commit
```
npm run build
npm run verify        # dev build; needs the review server on :4321 (node scripts/review-serve.mjs --background)
npm test
```
- `npm run verify` runs `redirects`, `links`, `seo`, `wp`, `headers`, `size`, `a11y`, `ui`, `net`, `embeds` (`tools/checks/`, each also runs
  alone: `npm run seo`), all with no allowlist, about 3 minutes.
  - `redirects`: every URL of `docs/old-urls.json` resolves in at most one hop to a built page or the shop, no built page sits at a redirect
    source, `redirects.csv` is what the generator writes, the frozen list agrees with `tools/redirect-map.mjs`.
  - `links`: every internal link and asset reference resolves to a built file. `seo`: titles, descriptions, claims, JSON-LD types and facts,
    breadcrumbs, Open Graph, link text, inbound links, sitemap, RSS. `a11y`: HTML rules and the contrast of every colour pair of the tokens.
  - `ui` (Chrome): focus rings, 44 px targets at 390, menu with the keyboard, reduced motion, white text on the photos (pixel measurement of the
    hero poster and the Ueber uns banner), no horizontal scrolling.
  - `size`: budgets, image, preload and font rules on every page, no video or audio file in `dist/` and none on a page.
  - `headers`: `_headers`, `_redirects` limits, mixed content. `wp`: no trace of the old site's platform in `dist/` or `src/` (no allowlist; redirect
    sources and `docs/` are not scanned).
  - `net` loads every page in Chrome and WebKit at 1440 and 390 wide against the review server, applies the CSP of `dist/_headers`, fails on any
    non-local request, any video or audio request, any static file fetched twice, any console or page error.
  - `embeds` clicks, Enter-presses and Space-presses every click-to-load embed under the CSP with every foreign request aborted (never register a
    route after `abortForeign`: Playwright asks the newest route first). Never contact an embed host or the old site from a script or a browser.
- Playwright is not an npm dependency: the checks import it from `PLAYWRIGHT_MODULE` or `/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright`
  (system Chrome and WebKit).
- Measuring, not gating: `npm run perf` (LCP element and time, CLS, requests, bytes; `--throttle fast4g|slow4g`, `--browsers chrome,webkit`) and
  `npm run screens` (full-page screenshots at 390, 768, 1440 into `review/`, git-ignored). Never request `//` from the review server (it crashes).
- The release build is `PUBLIC_INDEXABLE=true npm run build` followed by `npm run verify:release`. Rebuild with a plain `npm run build` afterwards so
  `dist/` is the dev build again.

## Redirects
- `docs/old-urls.json` is the frozen list of every old URL (status, fate, hop). `tools/redirect-map.mjs` is the IA table as data;
  `npm run redirects:build` writes `redirects.csv` and `cloudflare-query-redirects.csv` (the `?p=` Single Redirects). `npm run build` writes
  `dist/_redirects` for the build (dev shop or production shop, `{SHOP_URL}` in the csv). Never hand-edit these files.
- The old pages, the crawl and the baseline are in git history, not in the tree: `docs/LAUNCH.md` says how to restore them.

## Indexing switch
- Every build is `noindex, nofollow` with a blocking robots.txt and no sitemap unless `PUBLIC_INDEXABLE=true`.
- Only the launch build sets it. Never set it in a preview deployment or commit it to a config file.
- Canonical, Open Graph, JSON-LD and sitemap URLs use the build origin: `https://bike-one.dev` (or `SITE_ORIGIN`), `https://bike-one.org` in the release build.

## Hosting
- Target: Cloudflare Pages, static output. Headers in `public/_headers` (one `/*` rule: security headers and a CSP without third parties;
  `frame-src` only the three embed hosts). Launch steps: `docs/LAUNCH.md`.

## Files
- `docs/plan.md`: how the site is built and the decision ledger (one row per behaviour change; also in `.conversion/state.json`, added with
  `node scripts/state.mjs --dir . decision '{...}'`). `docs/redesign.md`: IA, design decisions, structure. `docs/third-party.md`: the embeds.
  `docs/LAUNCH.md`: launch. `docs/TODO.md`: open items. `docs/old-urls.json`: the frozen old URLs.

## Secrets
- No keys, tokens or real email addresses in the repo. Use `.env` (ignored) and `.env.example`.
