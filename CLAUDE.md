# Working in this repository

This is the static Astro site of BikeOne (https://bike-one.dev while in development, https://bike-one.org in production).
It is being rebuilt from a WordPress copy into native Astro: `.astro` components, content collections, one small
hand-written stylesheet set, self-hosted fonts, no request to any third party while a page renders. The plan is
`.working-files/astro-native-redesign/plan.md` in the parent repository; per-stage notes are next to it.
The old parity goal ("same as live") no longer applies. The capture in `capture/` stays as the content source and as the
list of old URLs until the migration is signed off (Stage 4).

## Branch
- All work happens on `astro-rebuild`. `main` holds only the scaffold until launch.
- Never commit to `main` directly. Never force-push.

## How the site is built now
- Every page is native Astro on `src/layouts/Base.astro` (head via `components/SEO.astro`, `Header`, `Footer`): `index`, `ueber-uns`,
  `service`, `stellenangebote`, `termin-buchen`, `blog`, `404`, `[legal]` (Impressum, Datenschutz), `[post]` (blog posts),
  `[booking]` (the two booking pages), `feed/index.xml.js` (RSS), `robots.txt.js`. Tokens, base styles and fonts: `src/styles/`.
- Content collections (`src/content.config.ts`): `stores`, `brands`, `legal` (the captured legal text, unchanged), `blog` (the five posts, text word for word).
- Third-party content (etermin.net booking, Google Maps, the JobRad calculator) only loads behind the click-to-load `components/Embed.astro`.
  The home hero video is `components/HeroVideo.astro` over the poster photo; `public/hero.mp4` is H.264 without audio (`node tools/mp4-info.mjs public/hero.mp4`).
- WordPress leftovers that nothing builds or publishes: `legacy-public/` (the old `public/` files, outside `public/` so they are not copied to
  `dist/`) and `src/content/{pages,heads,bottoms,parts,index.json}`, `src/styles/{inline,site.css}`. Stage 4 deletes them. Do not edit them.
- Text is copied from `capture/text` and `capture/pages`, never retyped or paraphrased. Legal text is not rewritten.
- Fonts come from `@fontsource` (pinned), Roboto and Roboto Condensed, woff2 via Vite. Nothing loads from googleapis or gstatic.

## Gates on every commit
```
npm run build
npm run verify        # dev build; needs the review server on :4321 (node scripts/review-serve.mjs --background)
npm test
```
- `npm run verify` runs `redirects`, `links`, `seo`, `wp`, `size`, `a11y`, `net` (`tools/checks/`, each also runs alone:
  `npm run seo`), all with no allowlist. `net` loads every page in Chrome and WebKit at 1440 and 390 wide against the review
  server, applies the CSP of `dist/_headers`, fails on any non-local request, and checks the hero video. Never request `//` from the review server (it crashes).
- The release build is `PUBLIC_INDEXABLE=true npm run build` followed by `PUBLIC_INDEXABLE=true npm run verify` (`npm run verify:release`).
- `npm run verify:legacy` is the old parity pipeline against `baseline/`; it fails by design now and goes in Stage 4.
- `baseline/` and `capture/` are not edited.

## Redirects
- `tools/redirect-map.mjs` is the IA table as data; `npm run redirects:build` writes `redirects.csv` and
  `cloudflare-query-redirects.csv` (the `?p=` Single Redirects). A row exists for every old URL the map sends elsewhere; the `redirects` check proves no built page sits at a source.
  `npm run build` writes `dist/_redirects` for the build (dev shop or production shop, `{SHOP_URL}` in the csv). Never hand-edit these files.

## Indexing switch
- Every build is `noindex, nofollow` with a blocking robots.txt and no sitemap unless `PUBLIC_INDEXABLE=true`.
- Only the launch build sets it. Never set it in a preview deployment or commit it to a config file.
- Canonical, Open Graph, JSON-LD and sitemap URLs use the build origin: `https://bike-one.dev` (or `SITE_ORIGIN`), `https://bike-one.org` in the release build.

## Hosting
- Target: Cloudflare Pages. Headers in `public/_headers` (one `/*` rule: security headers and a CSP without third parties; `frame-src` only the three embed hosts).

## Files
- `docs/plan.md`: decisions (one row per behaviour change; also in `.conversion/state.json`, added with `scripts/state.mjs`).
- `docs/third-party.md`, `docs/LAUNCH.md`: still the conversion-kit versions, rewritten in Stage 4.

## Secrets
- No keys, tokens or real email addresses in the repo. Use `.env` (ignored) and `.env.example`.
