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
- Native pages: `src/pages/index.astro`, `ueber-uns.astro`, `[legal].astro` (Impressum, Datenschutz) on `src/layouts/Base.astro`
  (head via `components/SEO.astro`, `Header`, `Footer`). Tokens, base styles and fonts: `src/styles/`.
- Content collections (`src/content.config.ts`): `stores`, `brands`, `legal` (the captured legal text, unchanged), `blog` (front matter only until Stage 2).
- The pages not migrated yet are still served by the old route `src/pages/[...path].astro` from captured markup. The
  explicit, shrinking list of them is `tools/legacy.mjs`; migrating a page means deleting its line there. Its layouts and
  components live in `src/layouts/legacy` and `src/components/legacy`. Do not edit `src/content/{pages,heads,bottoms,parts}` by hand.
- Text is copied from `capture/text` and `capture/pages`, never retyped or paraphrased. Legal text is not rewritten.
- Fonts come from `@fontsource` (pinned), Roboto and Roboto Condensed, woff2 via Vite. Nothing loads from googleapis or gstatic.

## Gates on every commit
```
npm run build
npm run verify        # dev build; needs the review server on :4321 (node scripts/review-serve.mjs --background)
npm test
```
- `npm run verify` runs `redirects`, `links`, `seo`, `wp`, `size`, `a11y`, `net` (`tools/checks/`, each also runs alone:
  `npm run seo`). They check the native pages of `dist/` in full and skip the pages and files on the allowlist in
  `tools/legacy.mjs`. `net` loads every native page in Chrome and WebKit at 1440 and 390 wide against the review
  server and applies the CSP of `dist/_headers`.
- The release build is `PUBLIC_INDEXABLE=true npm run build` followed by `PUBLIC_INDEXABLE=true npm run verify` (`npm run verify:release`).
- `npm run verify:legacy` is the old parity pipeline against `baseline/`; it fails by design now and goes in Stage 4.
- `baseline/` and `capture/` are not edited.

## Redirects
- `tools/redirect-map.mjs` is the IA table as data; `npm run redirects:build` writes `redirects.csv` and
  `cloudflare-query-redirects.csv` (the `?p=` Single Redirects). A redirect row exists only for a URL without a page.
  `npm run build` writes `dist/_redirects` for the build (dev shop or production shop, `{SHOP_URL}` in the csv). Never hand-edit these files.

## Indexing switch
- Every build is `noindex, nofollow` with a blocking robots.txt and no sitemap unless `PUBLIC_INDEXABLE=true`.
- Only the launch build sets it. Never set it in a preview deployment or commit it to a config file.
- Canonical, Open Graph, JSON-LD and sitemap URLs use the build origin: `https://bike-one.dev` (or `SITE_ORIGIN`), `https://bike-one.org` in the release build.

## Hosting
- Target: Cloudflare Pages. Headers in `public/_headers` (CSP without third parties for the native pages).

## Files
- `docs/plan.md`: decisions (one row per behaviour change; also in `.conversion/state.json`, added with `scripts/state.mjs`).
- `docs/third-party.md`, `docs/LAUNCH.md`: still the conversion-kit versions, rewritten in Stage 4.

## Secrets
- No keys, tokens or real email addresses in the repo. Use `.env` (ignored) and `.env.example`.
