# The redesign: native Astro

The site was a WordPress theme with a shop plugin, a slider, jQuery and a Google Fonts request. It was rebuilt in four stages (2026-11-25) as
native Astro; the shop is a separate site. The plan and the notes of each stage are in the parent repository under
`.working-files/astro-native-redesign/`. What is still open: [`TODO.md`](TODO.md).

## Goals

- Native Astro (`.astro`, content collections, typed props), static output for Cloudflare Pages, no markup copied from the old theme.
- No request to a third party while a page renders; the three embeds load only after a click (`docs/third-party.md`).
- Fast: before the load event the home page at 1440 px is 15 requests and 170 KB (HTML 28, CSS 16, fonts 42, images 83 with the hero poster), 1.4 KB of JavaScript
  (the hero film's start rules), LCP image preloaded; the film (0.49 MiB) is requested once, after the load event, only on a wide screen with a mouse;
  CSS under 30 KB and JS under 10 KB per page (checked by `size`).
- Every old URL resolves in at most one hop to a built page or the shop (`docs/old-urls.json`, checked by `redirects`).
- Accessible: landmarks, skip link, visible focus, 4.5:1 contrast (computed from the tokens), 44 px targets on phones, reduced motion.

## Information architecture (final mapping)

| Old URL(s) | New | Notes |
|---|---|---|
| `/` | `/` home | Hero (a showroom film behind the headline, poster = its first frame, d83): tagline as h1, "Termin buchen", "Zum Shop"; the two stores, five service blocks, the seven brand names as text, the three newest posts. Product tiles are gone. |
| `/ueber-uns/` | `/ueber-uns/` | Both stores with address, phone, e-mail, hours, click-to-load map; links to service, blog and jobs. |
| `/termin-buchen/`, `/termin-buchen-oldenburg/`, `/termin-buchen-osnabrueck/` | same URLs | Overview of both stores; the two booking pages embed etermin.net behind a click, with a plain link for visitors without JavaScript. |
| `/blog/` and the 5 posts | same URLs and slugs | Markdown collection, text word for word, `Article` data, RSS at `/feed/`. |
| `/impressum/`, `/datenschutz/` | same URLs | Text of the old site unchanged (legal review open, `TODO.md`). |
| `/stellenangebote/` | same URL | The old job list grouped by location; no application contact is invented. |
| `/main-bike/` | 301 `/service/` | New page from the old service copy: fitting, leasing (JobRad calculator behind a click), workshop, Canyon. |
| `/Marke/<brand>/` (7) and `/marke/*` | 301 shop home | The old brand pages held only product listings; no copy exists for local landing pages (d50). Feeds go to `/feed/`. |
| `/alle-fahrrader/`, `/ebikes/`, `/gravel-bikes/`, `/racebikes/`, `/tt-triathlon/`, `/sale/`, `/shop/*`, `/product/*`, `/product-category/*`, `/product-brand/*`, `/brand/*`, `/cart/*`, `/checkout*`, `/my-account*`, `/wishlist/*` and the German slugs | 301 shop home | One row per known URL plus prefix rules; the shop's URL scheme is unknown, so no deep links (`TODO.md`). |
| `/portfolio/*`, `/portfolio-category/*`, `/team-member/*` (theme demo pages) | 301 `/` | Demo content of the purchased theme. |
| `/author/*`, `/category/allgemein/` and feeds | 301 `/blog/` (feeds `/feed/`) | |
| `/feed/`, `/comments/feed/` | `/feed/` (blog RSS, a 200 rewrite to `/feed/index.xml`) | |
| `/wp-sitemap*.xml` | 301 `/sitemap-index.xml` | Written by the release build only (a dev build is noindex and has no sitemap). |
| `/?p=<id>` shortlinks (42) | `redirects.csv`; 20 Cloudflare Single Redirects in `cloudflare-query-redirects.csv` | 22 rows point at `/` and would be no-ops. Owner step in `LAUNCH.md`. |
| uploads, theme and core files, `/VidOne.mp4` | not published, no redirect | They were never content URLs; no old page carried Open Graph images. |

## Design decisions

- Design language of the shop's wireframes (`wireframes/homepage.html` in the parent repository): accent `#e63946` (`#c92a37` for text and buttons,
  4.2:1 on white is too low), dark header and footer `#121212`, light surfaces, mobile first (d35). No dark colour scheme yet.
- Fonts from `@fontsource`: Roboto 400 and 700, Roboto Condensed 700, latin and latin-ext, `font-display: swap`, one preload, metric-matched
  fallbacks so fonts cause no layout shift (d36, d68).
- No inline styles or scripts and no `data:` assets, so the CSP stays `default-src 'self'` (d31). The menu is a popover without JavaScript (d39).
- Images through `astro:assets` from `src/assets/photos/` (AVIF and WebP, width and height set); the LCP image is preloaded with exactly its
  srcset (d67). Home hero: an 8 s loop of the showroom film (AV1 0.49 MiB, H.264 0.67 MiB; the old 17.7 MiB file stalled and was left out, d71) that starts after the load event, with the first frame as the poster (d83, `docs/hero-video.md`); fonts are German-only subsets (d81, `docs/fonts.md`); AVIF quality 45 (d80); internal pages are prefetched on pointer down in Chromium (d82).
- Click-to-load embeds name provider and IP transfer in the placeholder (d40, d66). The map uses the key-free Google embed URL.
- Structured data on every page: Organization and WebSite, a BikeStore per store, Article, BreadcrumbList; no geo, rating, price range or
  invented hours (d59, d60). Titles 30 to 60 and descriptions 70 to 160 characters, unique, from each page's own text.
- Brand spelling: Cervélo with the accent in every label, slugs stay ASCII (d73).

## Structure

```
src/pages/        index, ueber-uns, service, stellenangebote, termin-buchen, blog, 404, [legal], [post], [booking], feed/index.xml.js, robots.txt.js
src/layouts/      Base.astro
src/components/   SEO, Header, Footer, Embed, StoreCard, ServiceBlock, PostCard, Breadcrumbs
src/content/      stores/, brands.json, legal/, blog/        (collections: src/content.config.ts)
src/lib/          site.mjs (origin, shop URL, constants), schema.ts (JSON-LD), stores.ts, posts.ts, preload.ts
src/styles/       tokens.css, base.css, fonts.css
src/assets/       brand/ (logo, icon), photos/
public/           _headers, favicon.ico, apple-touch-icon.png
tools/            redirect-map.mjs, redirects-build.mjs, sitemap-build.mjs, dev-origin.mjs, verify.mjs, checks/, lib/, perf.mjs, screens.mjs, mp4-info.mjs
scripts/          review-serve.mjs, state.mjs, build-redirects.mjs, lib/
test/             unit tests (redirect map, structured data, page text, dev origin)
docs/             this file, plan.md (ledger), third-party.md, LAUNCH.md, TODO.md, old-urls.json
```

## Open questions

All are in [`TODO.md`](TODO.md): the legal texts, the claims to confirm, the film's brand lettering and Cloudflare's terms for video, brand landing pages and shop deep links,
launch and hosting steps, test gaps and the repository history.
