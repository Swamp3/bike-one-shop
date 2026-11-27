# Stage 1 notes: foundation and vertical slice

Work in `website/`, branch `astro-rebuild`, nothing pushed. Decisions d30 to d45 (`website/docs/plan.md`, `.conversion/state.json`).

## Commits (oldest first)

| Hash | Subject |
|---|---|
| cff19f6 | refactor: move the WordPress layouts aside and list the pages still on the old route |
| f614402 | feat: design tokens, self-hosted fonts, Base, Header, Footer and SEO components |
| d4dc7fc | feat: migrate home, Ueber uns, Impressum and Datenschutz to native Astro |
| 787eb58 | feat: redirect map and generator, native robots.txt and sitemap, CSP for the native pages |
| 56f51ae | feat: checks that replace the parity gates, wired into npm run verify |
| 59c7d5e | fix: show the face in the Ueber uns banner |
| e0ee81e | docs: decisions d30 to d45 for the native redesign, stage 1 |

The first commit also carries the `@fontsource` dev dependencies (package.json, lock) and `tsconfig.json`.

## What exists now

- Native: `src/pages/index.astro`, `ueber-uns.astro`, `[legal].astro` (Impressum, Datenschutz); `src/layouts/Base.astro`; `components/{SEO,Header,Footer,Breadcrumbs,StoreCard,Embed}.astro`; `src/styles/{fonts,tokens,base}.css`; `src/lib/{site.mjs,stores.ts,schema.ts}`; curated photos and logo in `src/assets/` (1.1 MB, resized from `public/wp-content/uploads`, mapping below).
- Collections (`src/content.config.ts`): `stores`, `brands`, `legal`, `blog` (front matter only, bodies Stage 2).
- Old route: `src/pages/[...path].astro` builds exactly `LEGACY_PAGES` from `tools/legacy.mjs`; its layouts/components moved to `src/layouts/legacy`, `src/components/legacy`.
- Checks: `tools/checks/{redirects,links,seo,wp,size,a11y,net}.mjs`, `tools/verify.mjs` (`npm run verify`, `verify:release`), shared `tools/lib/dist.mjs`. Old gates: `npm run verify:legacy` (`tools/verify-legacy.mjs`), fails by design.
- Redirects: `tools/redirect-map.mjs` (IA table as data), `tools/redirects-build.mjs` (writes `redirects.csv`, `cloudflare-query-redirects.csv`, and `dist/_redirects` after the build; `public/_redirects` is gone). `tools/sitemap-build.mjs` (release only). `src/pages/robots.txt.js` native.
- Tests: `test/slice-text.test.mjs` (legal words equal the capture, service texts and facts are the captured ones, blog excerpts are capture prefixes), `test/redirect-map.test.mjs`. `npm test`: 9 pass.
- `public/_headers`: Permissions-Policy global; CSP (no third party, frame-src = the three embed hosts) on `/`, `/ueber-uns/`, `/impressum/`, `/datenschutz/` only.
- Docs updated: `AGENTS.md`, `CLAUDE.md` (identical), `README.md` of `website/`.

## Output of `npm run verify` (dev build, `npm run build` first)

```

> bikeone@0.0.0 verify
> node tools/verify.mjs

verify: dev build
redirects: ok (132 old URLs: 17 built, 59 still on the old route (allowlist), 56 redirected; 73 redirect rules, 42 ?p rows)
links: ok (4 native pages, 6 stylesheets)
seo: ok (4 native pages, dev build)
wp: ok (42 native files scanned, old route allowlisted)
size: ok (home: HTML 23.3 KB (gzip 5.8 KB), CSS 13.5 KB in 3 file(s) (gzip 3.8 KB), JS 0.0 KB in 0 file(s); 13 old-route file(s) over 20 MiB, allowlisted until Stage 2 (public/wp-content/uploads, VidOne.mp4))
a11y: ok (4 native pages)
net: ok (4 native pages x chrome, webkit x 1440, 390; home 1440px: 12 requests, 242 KB (html 23 KB, css 14 KB, image 142 KB, font 64 KB); 390px: 11 requests, 148 KB (html 23 KB, css 14 KB, image 47 KB, font 64 KB);)
verify: all 7 checks passed
```

## Output of the release verify (`PUBLIC_INDEXABLE=true npm run build`, then `npm run verify:release`)

```

> bikeone@0.0.0 verify:release
> PUBLIC_INDEXABLE=true node tools/verify.mjs

verify: release build
redirects: ok (132 old URLs: 17 built, 59 still on the old route (allowlist), 56 redirected; 73 redirect rules, 42 ?p rows)
links: ok (4 native pages, 6 stylesheets)
seo: ok (4 native pages, release build)
wp: ok (44 native files scanned, old route allowlisted)
size: ok (home: HTML 23.3 KB (gzip 5.7 KB), CSS 13.5 KB in 3 file(s) (gzip 3.8 KB), JS 0.0 KB in 0 file(s); 13 old-route file(s) over 20 MiB, allowlisted until Stage 2 (public/wp-content/uploads, VidOne.mp4))
a11y: ok (4 native pages)
net: ok (4 native pages x chrome, webkit x 1440, 390; home 1440px: 12 requests, 242 KB (html 23 KB, font 64 KB, css 14 KB, image 142 KB); 390px: 11 requests, 148 KB (html 23 KB, css 14 KB, image 47 KB, font 64 KB);)
verify: all 7 checks passed
```

`npm run build` itself (dev) ends with: `redirects: dist/_redirects written for https://shop.bike-one.dev/`, `sitemap: dev build is noindex, no sitemap written`, `dev-origin: 61 files now name https://bike-one.dev`. The release build writes `sitemap: 4 pages` and leaves dist alone. dist/ was left as the dev build.

Negative tests I ran by hand (not committed): an inline `<script>`, an `<img src="http://x.invalid/...">` and an `<iframe src="/nowhere/">` injected into `dist/impressum/index.html` make `net` fail with the CSP errors; the 4 page types, the CSP and the click-to-load embed (clicked with every non-local request aborted by the test) work.

## Allowlist: pages still on the old route (`tools/legacy.mjs`, 52 entries, Stage 2 empties it)

`/404.html`, `/Marke/{cervelo,factor,pinarello,ridley,specialized,trek,wilier}/`, `/alle-fahrrader/`, `/author/lawrencebennier-com/`, `/author/marvin/`, `/blog/`, `/category/allgemein/`, the 5 post URLs, `/ebikes/`, `/gravel-bikes/`, `/main-bike/`, `/portfolio-category/branding-design/` and `/page/2/`, 15 `/portfolio/portfolio-name*/`, `/racebikes/`, `/sale/`, `/stellenangebote/`, 7 `/team-member/*/`, `/termin-buchen/`, `/termin-buchen-oldenburg/`, `/termin-buchen-osnabrueck/`, `/tt-triathlon/`.

Also allowlisted (`LEGACY_FILES`, `LEGACY_SOURCES`): `public/wp-content`, `wp-includes`, `wp-sitemap*`, `VidOne.mp4`, the feed folders, and `src/content/{pages,heads,bottoms,parts,index.json}`, `src/styles/{inline,site.css}`, the legacy layouts/components, `[...path].astro`, `404.astro`. The `wp` check does not scan them; `size` reports 13 old-route files over 20 MiB (VidOne.mp4 26.6 MiB and uploads); `net`, `seo`, `links`, `a11y` skip the old pages. The old pages still request Google Fonts, jQuery, etermin and Google Maps like before; that goes away with them.

## Home page numbers (measured, system Chrome, review server :4321, raw bytes, the server does not compress)

Initial load, no scrolling: 1440 px 12 requests, 242 KB; 390 px 11 requests, 148 KB.
After scrolling through the page (all lazy photos loaded):

| | 1440 | 390 |
|---|---|---|
| requests | 14 | 14 |
| HTML | 23,857 B (gzip 5.7 KB) | 23,857 B |
| CSS | 13,829 B (3 files: 9,201 + 1,522 + 3,106; gzip 3.8 KB) | 13,829 B |
| JS | 0 B (the home page has no script) | 0 B |
| fonts | 65,252 B (Roboto 400, Roboto 700, Roboto Condensed 700, latin) | 65,252 B |
| images | 192,039 B (logo webp 2,194; hero avif 50,786; five photos avif 139,059) | 89,609 B |
| total | 294,977 B | 192,547 B |

Budgets enforced by `size`: home CSS under 30 KB, JS under 10 KB, no inline style or script. Über uns has the only script (the 15 line embed loader).
`dist/` per page: SEO head (30 to 60 character titles, 70 to 160 character descriptions, canonical, OG/Twitter with a 1200x630 JPEG, JSON-LD) checked on all four.

## Image sources (copied from `public/wp-content/uploads`, resized with sharp, nothing fetched)

| src/assets | from | use |
|---|---|---|
| photos/hero.jpg (1920x1080) | revslider/video-media/Unbenanntes-Video_1.jpeg (the video poster) | home hero, default OG image |
| photos/beratung.jpg | 2025/10/Screenshot-2025-10-15-185857.png | service Beratung |
| photos/fitting.jpg (2000x3000, from a 28.9 MiB original) | 2026/02/DSC_0268.jpg | service Fitting, Ueber uns banner, OG image of Ueber uns |
| photos/konfiguration.jpg | 2025/10/Screenshot-2025-10-09-092823.png | service Konfiguration |
| photos/werkstatt.jpg | 2025/10/Screenshot-2025-10-15-190848.png | service Werkstatt |
| photos/leasing.jpg | 2025/10/Screenshot-2025-10-15-190642.png | service Leasing |
| brand/logo-white.png | 2025/08/NoTextWBikeOne-1.png, trimmed to its ink | header |
| brand/icon.png, public/apple-touch-icon.png | 2026/02/favicon.png | Organization logo, apple-touch-icon |

Alt texts are written plainly by me from looking at the images (hero and banner are decorative, alt empty). The five section photos were screenshots in the old media library at 1024 px wide, so they are not sharp above that.

## Decisions where the plan left room

- Fonts (owner decision of the coordinator): `@fontsource/roboto` 5.3.0 (400, 700) and `@fontsource/roboto-condensed` 5.3.0 (700), pinned without `^`, dev dependencies. Reason: the live site used Roboto Condensed and Roboto; the wireframes use Inter and Oswald, I stayed with the brand fonts. I wrote the `@font-face` rules by hand (`src/styles/fonts.css`) pointing at the packages' woff2 files instead of importing their per-weight CSS: those add a `.woff` fallback per weight (Vite would ship it) and have no `unicode-range`. latin and latin-ext are declared; latin-ext is only fetched if a character needs it (the Datenschutz text has two U+01AF characters, see below). One preload: Roboto Condensed 700 latin. Playfair Display is not used.
- Tokens: shop wireframe colours, light surfaces, dark header/footer/hero, no dark colour scheme yet. `#e63946` is 4.2:1 on white, so text and buttons use `--accent-strong` `#c92a37` (5.4:1).
- Menu: a popover (no JavaScript): button below 48 rem, always visible from 48 rem. Header: Termin buchen, Blog, Über uns, Shop (SHOP_URL, styled as a button on wide screens). `/service/` is not linked anywhere yet because the page does not exist; Stage 2 adds the links (home service section, header or footer).
- Home: hero is poster-only (video helper is Stage 2). The h1 is the captured footer tagline without its full stop, with "BikeOne" as eyebrow. Partner logos, product tiles, slider dropped. The seven brands are plain text (no link: brand page decision is Stage 2). "Aus dem Blog" shows the three newest posts from the collection and links to the old-route post URLs.
- The captured CTAs ended with a full stop ("Beratungstermin buchen."); the buttons do not.
- Maps on Ueber uns: key-free `https://www.google.com/maps?q=...&output=embed` behind a click (the captured URL carried an API key, `AIzaSy...`, which I did not copy into the repo). Not testable offline. The German consent sentence on the placeholder is mine; for legal review.
- Store address spelling: "Rheinstraße 16", "Lengericher Landstraße 30" everywhere on new pages (seo-review M10); legal texts keep their own.
- Hours in the footer: "Di–Fr" with an en dash (the capture had a hyphen there).
- `?p=` shortlink rows keep their captured sources and are re-pointed to the final destination once the page they name is gone.
- Sitemap: generated from `dist/` after the build (walk the native pages, skip noindex) instead of an npm integration; release build only. robots.txt: dev Disallow all, release `Allow: /` plus the Sitemap line (the captured WordPress robots.txt had WordPress paths and tripped the `wp` check).
- `redirect` check treats `/sitemap-index.xml` and `/sitemap-0.xml` as valid targets in a dev build although only the release build writes them (the old `wp-sitemap*` URLs redirect there in Stage 2).
- CSP only on the four native paths (see d44); `net` applies the same header in Playwright (any violation is a console error).
- The `net` check uses the review server and compares its `/` with `dist/index.html`; if the server serves something else it stops with a message instead of testing the wrong build. Playwright is imported from `/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright` (override with `PLAYWRIGHT_MODULE`), both browsers from it.
- `.ts` files (`content.config.ts`, `lib/stores.ts`, `lib/schema.ts`, the `.astro` frontmatter) are typed, but there is no type checker in the project (no `typescript`, no `@astrojs/check`), so `astro check` / `tsc --noEmit` were not run; the Astro build compiles them.

## Redirect rows written in Stage 1

Only for URLs without a page: 46 known WooCommerce URLs (43 `/product/*`, 3 `/product-category/*`, plus `/shop/`, `/cart/`, `/checkout/`, `/my-account/`, `/checkout-2/`, `/my-account-2/`), two product sitemap names, 15 prefix rules (`/shop/*`, `/product/*`, `/product-category/*`, `/product-brand/*`, `/brand/*`, `/cart/*`, `/checkout/*`, `/my-account/*`, `/wishlist/*`, `/checkout-2/*`, `/my-account-2/*` and the German names `/produkt/*`, `/produkt-kategorie/*`, `/warenkorb/*`, `/kasse/*`, `/mein-konto/*`, `/wunschliste/*`) all to the shop home (the shop's URL scheme is unknown, so no deep link was invented; refine once the shop has stable handles). Not yet written (the page is still built; they apply by themselves when the line leaves `tools/legacy.mjs` and `npm run redirects:build` runs): `/alle-fahrrader/`, `/ebikes/`, `/gravel-bikes/`, `/racebikes/`, `/tt-triathlon/`, `/sale/` to the shop, `/main-bike/` to `/service/`, `/portfolio*`, `/team-member/*` to `/`, `/author/*`, `/category/allgemein/` to `/blog/`, feeds, `wp-sitemap*` to `/sitemap-index.xml`. `/Marke/*` has no rule: undecided (Stage 2).

## Text defects I did not touch (for the owner / legal review)

- Impressum: still cites "§ 5 Telemediengesetz (TMG)" (replaced by the DDG in 2024); names Oldenburg only, writes "Rheinstrasse 16" and "Oldenburg(Oldb)"; the ODR URL is cut by a manual line break ("index.cfm? event=..."), so it is rendered as the captured text with a space and is not a link. The platform itself is, as far as I know, discontinued; that is a legal question, not mine.
- Datenschutz: "Stand: Juli 2026"; "ZugriƯ" (twice, a ff ligature glyph U+01AF from a PDF copy) and "IPAdresse" (missing hyphen) are verbatim; it still says "Sofern wir eine Website betreiben" and does not mention what the new site does or does not do (no Google Fonts, no analytics, click-to-load Google Maps/etermin embeds, the shop on a separate host). It also lists "Zahlungsdaten", "Versand" and "Kundenkonto" while this site has none. Needs the re-check the plan names. The Impressum and Datenschutz addresses spell the street "Rheinstrasse" / "Rheinstr.".
- Home service text promises "bis zu 40 %" Ersparnis twice (live copy, kept as the plan says "copy"); the SEO review says not to put it into descriptions without confirmation, I did not.
- The posts' excerpts (used on the home page) are the WordPress excerpts; the safety post speaks of "Wien" although the shops are in Oldenburg/Osnabrück (copied text, flag only).

## Open questions

1. Design basis: wireframe tokens (assumed) and Roboto/Roboto Condensed instead of Inter/Oswald: right direction? A dark colour scheme as in the wireframes is not built.
2. Brand pages: still undecided (Stage 2). The home page lists the brand names as plain text.
3. Legal: Impressum (TMG to DDG, Osnabrück branch) and Datenschutz re-check; wording of the click-to-load consent text; whether the Datenschutz must name Google Maps and etermin once the embeds are on. Route the CSP, the new embed text and the font packages through the `legal-security-reviewer` before merge (I could not call it from here).
4. Which brand/service claims may appear in titles and descriptions ("E-Bike" and "Rennrad" are not in the home title; "bis zu 40 %" is only in the body).
5. Real photos: the five section photos are 1024 px screenshots; the originals of the studio shots (`DAY2_*`, `ETS16549.jpg`, …) exist in the media cache but I did not look for better ones.
6. Partner logos for Dienstradleasing (JobRad, BusinessBike, …) were on the old home page and are not on the new one; they need the owner's confirmation of names/alt texts before they come back (Stage 3?).
7. `public/VidOne.mp4` (27.8 MB, HEVC) is committed in history (6e06eac) and exceeds the Pages limit; it is on the allowlist until Stage 2 produces the H.264 file. Squash it out before any push, as `hero-video/notes.md` says.
8. Hero: if `avconvert` cannot reach the target, poster only (Stage 2). The poster is the dark first video frame; the hero uses a gradient overlay.

## Things to know for Stage 2

- Delete a page from `tools/legacy.mjs` when it becomes native or is removed, then `npm run redirects:build`, `npm run build`, `npm run verify`. A stale allowlist entry fails `redirects`.
- When the allowlist is empty: delete `LEGACY_FILES`/`LEGACY_SOURCES`, make the CSP block in `public/_headers` one `/*` rule, drop the `[...path].astro` route, 404 page native (`/404.html` is still legacy), move `wp-sitemap*` to redirects, add `/feed/` as native RSS, then the `wp` check has no allowlist.
- `net` currently skips the old pages because they call third parties; once they are native it covers every page.
- The blog entries have empty bodies; the `blog` pages and `/service/` links are the first things the home page and header will want.
