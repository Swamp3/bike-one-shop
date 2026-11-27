# Stage 3 notes: SEO, accessibility, performance, security, visual review

Work in `website/`, branch `astro-rebuild`, nothing pushed. Decisions d59 to d70 (`website/docs/plan.md`, `.conversion/state.json`).
Chrome is the system Chrome 158.0.8127.89, WebKit the Playwright build 27.2, review server :4321 (raw bytes, no compression). "Local" LCP times are without throttling; throttled runs use CDP network emulation.

## Read this first: two things that went wrong

1. **Real requests to the three embed hosts (my bug).** The first run of the new `embeds` check was meant to click every click-to-load embed with all non-local requests aborted. I registered the abort rule first and the CSP-header rule second; Playwright asks the newest route first and the header rule called `route.continue()`, so the abort never ran. That run (30 activations in Chrome and WebKit, roughly 60 s) therefore really loaded `www.etermin.net`, `www.google.com` (Maps embed, with Google's own sub-requests to `maps.googleapis.com` and `maps.gstatic.com`) and `www.jobrad.org` / `bike-leasing-calculator.jobrad.org`, from this machine, with a fresh browser profile each time, no cookies, no form input and no credentials of ours. This is the exception to "embed hosts only with requests aborted/observed". Fixed in `tools/lib/browser.mjs` (`applyHeaders` uses `route.fallback()`, `abortForeign` is registered last) and the check now fails if a foreign request was not aborted (`requestfailed`); I proved by hand that the corrected setup sends exactly one request, which fails with `net::ERR_FAILED`. No other run of mine contacted a third party (the `perf`, `ui` and `net` runs never click an embed). If this matters for the Datenschutz or for any host log, it is the 30 requests of one run on 2026-11-25.
2. **Firefox could not be run.** `npx playwright install firefox` from the kit worked (Firefox 157.0, `firefox-1555`), but the binary exits at once with `Could not find profile folder` (its new `ProfilesDatastoreService` fails with `ServiceManager::GetService returned failure code`), headless and headed, with and without `-profile`, with a fake `HOME`, and with the sandbox of my shell disabled (headed: `sandbox_extension_issue_file_to_process failed ... Operation not permitted`). The older `firefox-1489` in the cache starts but does not speak this Playwright's protocol (launch times out). So there is **no Firefox result** (see Hero below for what is known by design).

## Commits (oldest first, on top of ece45f6)

| Hash | Subject |
|---|---|
| b13c845 | feat: complete the structured data and tighten the seo check |
| ef7182b | fix: contrast, touch targets and focus hand-over; consent text in the site's voice |
| 0f57930 | feat: embeds and headers checks wired into verify |
| 5103883 | perf: preload the LCP image, metric-matched fallback fonts, data-conscious hero video |
| f0dec3e | fix: layout defects found in the screenshot review |
| 17c437a | docs: decisions d59 to d70 and the checks after Stage 3 |

Every commit leaves `npm run build`, `npm run verify` and `npm test` green (the last full runs are below; the commit between `ef7182b` and `0f57930` does not wire `ui` into `verify` yet, which is why `ui` is in the second one).

## Output of `npm run verify` (dev build, after `npm run build`, tree at 17c437a)

```
> bikeone@0.0.0 verify
> node tools/verify.mjs

verify: dev build
redirects: ok (132 old URLs: 15 built, 117 redirected; 140 redirect rules, 42 ?p rows)
links: ok (16 native pages, 16 stylesheets)
seo: ok (16 native pages, dev build)
wp: ok (79 files scanned)
headers: ok (4 header rules, 141 redirect rules (23 dynamic), 38 files scanned for http://)
size: ok (home: HTML 25.6 KB (gzip 6.3 KB), CSS 16.2 KB in 6 file(s) (gzip 4.9 KB), JS 1.4 KB in 1 file(s))
a11y: ok (16 native pages)
ui: ok (16 pages x 1440, 390: 332 focus stops; touch targets, menu, hero button, reduced motion; 23 text boxes on photos)
net: ok (16 native pages x chrome, webkit x 1440, 390; home 1440px: 17 requests, 18347 KB (html 26 KB, css 16 KB, image 142 KB, js 1 KB, font 64 KB, other 18098 KB); 390px: 14 requests, 139 KB (html 26 KB, css 16 KB, image 32 KB, js 1 KB, font 64 KB);)
embeds: ok (30 activations (click, Enter, Space) in chrome and webkit, hosts bike-leasing-calculator.jobrad.org, www.etermin.net, www.google.com)
verify: all 10 checks passed
```

## Output of `npm run verify:release` (`PUBLIC_INDEXABLE=true npm run build` first: `sitemap: 15 pages`; tree at f0dec3e, the later commit only changes docs)

```
> bikeone@0.0.0 verify:release
> PUBLIC_INDEXABLE=true node tools/verify.mjs

verify: release build
redirects: ok (132 old URLs: 15 built, 117 redirected; 140 redirect rules, 42 ?p rows)
links: ok (16 native pages, 16 stylesheets)
seo: ok (16 native pages, release build)
wp: ok (81 files scanned)
headers: ok (4 header rules, 141 redirect rules (23 dynamic), 40 files scanned for http://)
size: ok (home: HTML 25.6 KB (gzip 6.3 KB), CSS 16.2 KB in 6 file(s) (gzip 4.9 KB), JS 1.4 KB in 1 file(s))
a11y: ok (16 native pages)
ui: ok (16 pages x 1440, 390: 332 focus stops; touch targets, menu, hero button, reduced motion; 23 text boxes on photos)
net: ok (16 native pages x chrome, webkit x 1440, 390; home 1440px: 17 requests, 18347 KB (html 26 KB, font 64 KB, image 142 KB, css 16 KB, js 1 KB, other 18098 KB); 390px: 14 requests, 139 KB (html 26 KB, css 16 KB, image 32 KB, js 1 KB, font 64 KB);)
embeds: ok (30 activations (click, Enter, Space) in chrome and webkit, hosts bike-leasing-calculator.jobrad.org, www.etermin.net, www.google.com)
verify: all 10 checks passed
```

## `npm test`

```
> bikeone@0.0.0 test
> node --test "test/**/*.test.mjs"
# tests 17
# suites 0
# pass 17
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

17 tests (14 from Stage 2, 3 new in `test/seo-data.test.mjs`: `berlinIso`, BikeStore facts against the captured Ueber uns text, Organization brands and e-mail). dist/ was left as the dev build.

## 1. SEO

### What I reviewed and changed

Every title and description was read against `seo-review.md` section 5 and the page's own captured text. Result: they were already built from page copy and mostly stay. Changes (d62): the legal titles use the same en dash as every other title and the privacy title no longer says "Oldenburg" ("Datenschutzerklärung – BikeOne GmbH"), the Impressum description uses "Rheinstraße" like the rest of the site (NAP, M10), the E-Bike post description reads "Ein Vergleich von Unterstützung, Gewicht, Wartung und Kosten ...", and `og:image:alt` of the default hero says what the photo shows ("Radfahrer auf einer Bergstraße vor schneebedeckten Gipfeln"). The legal texts themselves are untouched. The seo-review proposals "Rennrad, Gravel & E-Bike" (home title) and "Trek in Oldenburg & Osnabrück kaufen" (brand pages) were **not** applied: neither the home copy nor any page says the shops sell E-Bikes or Rennräder, and the brand pages are redirects. Candidate claims are listed at the end.

JSON-LD (d59): `Organization` (logo 512x512, the seven captured brands, `department` only for the stores in the same graph) and `WebSite` on every page except the 404; `BikeStore` for both stores on home, Ueber uns and `/termin-buchen/`, one on each booking page, its `url` now the store's booking page (it was `/ueber-uns/` for both); `BreadcrumbList` on every inner page with the visible crumbs; `Article` on the five posts (author and publisher: the Organization). No `JobPosting`, rating, geo, price range, `sameAs`, `hasMap` or invented hours. `datePublished`/`dateModified` are now written in Berlin time (`2025-10-17T01:25:05+02:00`); `toISOString()` had given the 16th for posts published at 01:25 on the 17th, which also went into a first sitemap draft. Posts get `article:published_time`/`modified_time`, the release sitemap gets `lastmod` for the posts only.

Open Graph and Twitter: all fields agree with title/description, 1200x630 JPEG from the page image (home, 404, legal and the booking pages use the hero crop, Ueber uns the fitting photo, posts their own photo), `og:image:width/height/alt` set, every share image under 300 KB (largest: see `dist/_astro`, all pass), `og:locale de_DE`. `twitter:card summary_large_image`.

Canonical / noindex / sitemap / RSS: dev build noindex on all 16 pages with `Disallow: /` and no sitemap; release build indexable on 15 pages, 404 noindex in both, no canonical on the 404, canonical = build origin + path (trailing slash); `sitemap-index.xml` + `sitemap-0.xml` list exactly the 15 indexable pages; the RSS feed (`/feed/`, 200 rewrite to `/feed/index.xml`) is checked against the posts (one item each, same URL, guid, title, date). Single language, `lang="de"`, no hreflang (the check fails if one appears).

Internal linking (d61): home to Ueber uns; Ueber uns "Mehr über BikeOne" (Service, Blog, Stellenangebote; the jobs page had no content link); `/service/` "Mehr dazu im Blog" with the three posts about leasing, workshop and fitting; blog index to booking and service; 404 "Zum Blog". Anchor text names the target; the check rejects "hier", "mehr", "weiter" and the like, one text pointing at two targets, and any page (except Impressum and Datenschutz, footer-only on purpose) that no other page links to from its content.

Heading hierarchy: one h1 per page, no skipped level, no empty heading (unchanged and still checked in `a11y`).

### Checks added to `tools/checks/seo.mjs` (d60)

Slug-like titles; **claim words** (E-Bike, Rennrad, Gravel, Leasing, Fitting, Werkstatt, Canyon, Konfiguration, the seven brands, percentages, prices, "bester", ratings) in a title or description must occur in the page's own text; Open Graph/Twitter consistency and image size, weight and tags; JSON-LD type whitelist, node set per page type, `@id` references must resolve inside the page, every URL on the build origin and built, breadcrumbs equal the visible crumbs and end at the canonical URL, Article equals h1, canonical, visible date and image, BikeStore address/phone/e-mail/hours must be in the visible page text; link rules above; sitemap namespace, absolute URLs, trailing slash, `lastmod` of the posts; RSS. I proved by hand (injected into a copy of `dist/`) that a JobPosting type, a missing WebSite node, a dangling `@id`, a wrong breadcrumb name, an `og:image:width` of 1000, a "Rennrad" / "ab 99 €" claim in a description, a link "hier" and an orphaned page each fail the check.

### Before / after per page (head data; description and title lengths in characters)

| Page | Title (after) | Title chars | Description chars | JSON-LD before | JSON-LD after | h1 |
|---|---|---|---|---|---|---|
| `/` | BikeOne: Bikes, Beratung & Service in Oldenburg & Osnabrück | 59 to 59 | 143 to 143 | Org+Site+Store+Store | Org+Site+Store+Store | Erstklassige Bikes, Beratung & Service in Oldenburg & Osnabr |
| `/404.html` | Seite nicht gefunden – BikeOne | 30 to 30 | 111 to 111 | - | - | Seite nicht gefunden |
| `/blog/` | Blog: Technik, Fitting, E-Bikes und Service – BikeOne | 53 to 53 | 129 to 129 | Crumbs | Org+Site+Crumbs | Willkommen im BikeOne-Blog |
| `/datenschutz/` | Datenschutzerklärung – BikeOne GmbH (was: Datenschutzerklärung \| BikeOne GmbH Oldenburg) | 45 to 35 | 132 to 132 | Crumbs | Org+Site+Crumbs | Datenschutzerklärung |
| `/e-bike-oder-klassisches-rad-welche-ents` | E-Bike oder klassisches Rad: So entscheidest du | 47 to 47 | 138 to 138 | Article+Crumbs | Org+Site+Article+Crumbs | E-Bike oder klassisches Rad? Welche Entscheidung für deine M |
| `/fahrrad-leasing-die-smarte-alternative-` | Fahrrad-Leasing: Vorteile, Ablauf und Ersparnis | 47 to 47 | 131 to 131 | Article+Crumbs | Org+Site+Article+Crumbs | Fahrrad-Leasing: Die smarte Alternative zum Autopendeln – un |
| `/impressum/` | Impressum – BikeOne GmbH Oldenburg (was: Impressum \| BikeOne GmbH Oldenburg) | 34 to 34 | 143 to 142 | Crumbs | Org+Site+Crumbs | Impressum |
| `/service/` | Service: Bike-Fitting, Dienstradleasing, Werkstatt | 50 to 50 | 119 to 119 | Crumbs | Org+Site+Crumbs | Service bei BikeOne |
| `/sicherheit-auf-zwei-raedern-so-faehrst-` | Sicherheit im Stadtverkehr: Tipps für Radfahrer | 47 to 47 | 123 to 123 | Article+Crumbs | Org+Site+Article+Crumbs | Sicherheit auf zwei Rädern: So fährst du entspannt und gesch |
| `/so-erkennst-du-fruehzeitig-fahrrad-ermu` | Fahrrad-Ermüdung früh erkennen und vorbeugen | 44 to 44 | 140 to 140 | Article+Crumbs | Org+Site+Article+Crumbs | So erkennst du frühzeitig Fahrrad-Ermüdungserscheinungen – u |
| `/stellenangebote/` | Stellenangebote bei BikeOne in Oldenburg & Osnabrück | 52 to 52 | 145 to 145 | Crumbs | Org+Site+Crumbs | Stellenangebote |
| `/termin-buchen-oldenburg/` | Termin buchen in Oldenburg – BikeOne | 36 to 36 | 131 to 131 | Store+Crumbs | Org+Site+Store+Crumbs | Termin buchen in Oldenburg |
| `/termin-buchen-osnabrueck/` | Termin buchen in Osnabrück – BikeOne | 36 to 36 | 142 to 142 | Store+Crumbs | Org+Site+Store+Crumbs | Termin buchen in Osnabrück |
| `/termin-buchen/` | Termin buchen in Oldenburg & Osnabrück – BikeOne | 48 to 48 | 146 to 146 | Store+Store+Crumbs | Org+Site+Store+Store+Crumbs | Termin buchen |
| `/ueber-uns/` | Über uns: Standorte & Öffnungszeiten – BikeOne | 46 to 46 | 120 to 120 | Org+Site+Store+Store+Crumbs | Org+Site+Store+Store+Crumbs | Herzlich willkommen bei BikeOne! |
| `/wann-sich-ein-professioneller-fahrradse` | Fahrradservice: Wann er sich wirklich lohnt | 43 to 43 | 136 to 136 | Article+Crumbs | Org+Site+Article+Crumbs | Wann sich ein professioneller Fahrradservice wirklich lohnt  |

(Home h1 is the captured footer tagline without its full stop; `/ueber-uns/` keeps the captured h1 "Herzlich willkommen bei BikeOne!".)

## 2. Accessibility

- Landmarks (header, nav with labels where there are several, one main, footer), skip link first Tab stop and visible when focused (checked on every page, both widths), `lang`, one h1: `a11y` and `ui`.
- Focus: `:focus-visible` 3 px ring (`#e63946` on light, white on `.dark`); `ui` tabs through every page at 1440 and 390 (332 stops) and fails on a stop without a ring (proved: with the ring removed 328 failures).
- Keyboard: popover menu (Enter opens, first Tab lands in the menu, Escape closes and returns the focus to the button), embed buttons (Enter and Space, and the focus now moves to the inserted iframe: before, the focused button was removed and the focus fell back to the page start), hero pause button (reachable, Space pauses, Enter plays, `aria-pressed` and the label follow). The menu button has no `aria-expanded` (a popover opened by `popovertarget` exposes it natively in Chrome; I did not add a script for it).
- `prefers-reduced-motion`: smooth scrolling off, transitions 0.01 ms, the hero video neither requested nor played (both browsers).
- Touch targets at 390: links on their own line, footer rows, logo, breadcrumb links, the "bei eTermin öffnen" fallbacks are at least 44 px high and wide (inline links inside a sentence are exempt). The 44 px rule applies on phones and touch screens only (`@media (max-width: 47.99rem), (pointer: coarse)`), so desktop keeps compact rows.
- Alt text: empty `alt` only on the hero/banner photos and the post thumbnails (`bg`/`thumb` classes; the thumbnail sits beside its linked title), every other image has a description of at least 8 characters that is not a file name; the check enforces that. Link purpose: unique anchor texts per target (see SEO).

### Contrast (WCAG 2.2, computed from `tokens.css` by `tools/lib/contrast.mjs`, enforced in `a11y`)

| Pair | Ratio | Needs |
|---|---|---|
| ink #212529 on bg #f8f9fa / surface #fff / surface-2 #f1f3f5 | 14.63 / 15.43 / 13.87 | 4.5 |
| ink-muted #495057 on the same three | 7.76 / 8.18 / 7.35 | 4.5 |
| accent-strong #c92a37 (links, eyebrows, buttons) on the same three | 5.15 / 5.43 / 4.88 | 4.5 |
| accent-strong-hover #a8222d on the same three | 6.80 / 7.16 / 6.44 | 4.5 |
| white on accent-strong / accent-strong-hover (button label) | 5.43 / 7.16 | 4.5 |
| header-text white on header #121212 / menu panel #1e1e1e | 18.73 / 16.67 | 4.5 |
| header-muted #c2c2c2 on header / menu panel | 10.52 / 9.36 | 4.5 |
| focus ring #e63946 on bg / surface / surface-2 | 3.95 / 4.17 / 3.75 | 3 |
| white focus ring on header | 18.73 | 3 |
| current-page bar #e63946 on header | 4.49 | 3 |
| ghost button border (--line-strong) **was #adb5bd: 1.97 / 2.07 / 1.87, now #7b848c** on bg / surface / surface-2 | 3.61 / 3.80 / 3.42 | 3 |
| menu button and dark ghost border #6b6b6b on header | 3.52 | 3 |
| footer button hover (grey #c2c2c2 on #a8222d) **was 4.02, fixed** (footer links no longer restyle `.btn`) | white on #a8222d 7.16 | 4.5 |
| `--accent` #e63946 as text on white | 4.17 (so it is never text; text uses accent-strong) | |
| white text on the hero photo, worst 98th-percentile pixel behind the text: h1 / eyebrow / ghost button, poster 1440 | 9.00 / 5.47 / 17.69 | 3 / 4.5 / 4.5 |
| same at 390 (poster) | 12.54 / 10.18 / 17.06 | |
| same, five frames of the video at 1440 (5 %, 25 %, 50 %, 75 %, 95 %) | h1 14.6 to 14.9, eyebrow 5.7 to 5.8, button 17.7 | |
| Ueber uns banner h1 (1440 / 390) | 10.15 / 11.51 | 3 |

The hero eyebrow had only 4.91:1 with the first shade; the shade is now strongest where the text is (from the left on wide screens).

## 3. Performance

Budgets (all pages now, enforced in `size`): CSS under 30 KB (home 16.2 KB in 6 files, gzip 4.9 KB), JS under 10 KB (1.4 KB, one file: the hero helper; the embed loader is the second script on Ueber uns, booking and service), nothing inline, no `style` attribute.

LCP images (d67): the LCP image of home, Ueber uns, the five posts and `/service/` is `fetchpriority="high"`, `loading="eager"`, has width/height, comes as AVIF/WebP/JPEG `srcset` in a `<picture>`, and is **preloaded with exactly its AVIF srcset and sizes** (`src/lib/preload.ts`); `/service/`'s first block was lazy before (it was the LCP element), now eager. `size` checks all of this on every page; `net` checks that no `/_astro/` file is requested twice in either browser (one preload that did not match its image would double the download). Every content image is AVIF + WebP + JPEG fallback with a `srcset`; the logo is a 2 KB WebP.

Fonts (d68): one preload (Roboto Condensed 700 latin, `crossorigin`, a file a `@font-face` names), every `@font-face` `font-display: swap`, three font files per page (64 KB), latin-ext fetched only on demand. New: Arial-based fallback faces with `size-adjust` (99.1 %, 93.5 %, 83.3 %, measured width ratios on German copy) and the web fonts' hhea ascent/descent overrides. With the font files delayed by 1.8 s, CLS of the blog page went from 0.0089 to 0 and the other pages to exactly 0.

Measured, Chrome, before (Stage 2 tree, ece45f6) to after, `tools/perf.mjs`:

| Page (1440 px) | LCP element | LCP ms | requests | KB at load | KB after scrolling | CLS |
|---|---|---|---|---|---|---|
| `/` | img hero | 68 to 76 | 16 to 16 | 18317 to 18319 (home 1440 includes the 17.67 MiB video) | 18391 to 18393 | 0 to 0 |
| `/404.html` | h1 | 36 to 60 | 7 to 7 | 82 to 83 | 82 to 83 | 0.0002 to 0 |
| `/blog/` | p | 52 to 52 | 14 to 14 | 132 to 135 | 132 to 135 | 0.0091 to 0 |
| `/datenschutz/` | p | 48 to 36 | 9 to 9 | 103 to 105 | 103 to 105 | 0 to 0 |
| `/e-bike-oder-klassisches-rad-welche-ents` | img beratung | 48 to 48 | 10 to 10 | 168 to 171 | 168 to 171 | 0 to 0 |
| `/fahrrad-leasing-die-smarte-alternative-` | img leasing | 52 to 52 | 10 to 10 | 164 to 167 | 164 to 167 | 0 to 0 |
| `/impressum/` | p | 36 to 52 | 8 to 8 | 87 to 90 | 87 to 90 | 0.0004 to 0 |
| `/service/` | img fitting | 64 to 40 | 14 to 15 | 168 to 175 | 168 to 175 | 0 to 0 |
| `/sicherheit-auf-zwei-raedern-so-faehrst-` | img sicherheit | 52 to 56 | 10 to 10 | 127 to 130 | 127 to 130 | 0 to 0 |
| `/so-erkennst-du-fruehzeitig-fahrrad-ermu` | img fitting | 56 to 48 | 10 to 10 | 170 to 173 | 170 to 173 | 0 to 0 |
| `/stellenangebote/` | h1 | 48 to 52 | 8 to 8 | 84 to 87 | 84 to 87 | 0 to 0 |
| `/termin-buchen-oldenburg/` | h1 | 52 to 44 | 10 to 10 | 88 to 91 | 88 to 91 | 0 to 0 |
| `/termin-buchen-osnabrueck/` | h1 | 40 to 52 | 10 to 10 | 88 to 91 | 88 to 91 | 0 to 0 |
| `/termin-buchen/` | h1 | 48 to 56 | 10 to 10 | 89 to 92 | 89 to 92 | 0 to 0 |
| `/ueber-uns/` | img fitting | 60 to 56 | 12 to 12 | 165 to 168 | 165 to 168 | 0 to 0 |
| `/wann-sich-ein-professioneller-fahrradse` | img service | 60 to 60 | 10 to 10 | 121 to 124 | 121 to 124 | 0 to 0 |

| Page (390 px) | LCP element | LCP ms | requests | KB at load | KB after scrolling | CLS |
|---|---|---|---|---|---|---|
| `/` | img hero | 52 to 40 | 14 to 13 | 137 to 122 | 192 to 194 | 0.0002 to 0 |
| `/404.html` | p | 56 to 52 | 7 to 7 | 82 to 83 | 82 to 83 | 0 to 0 |
| `/blog/` | p | 48 to 44 | 12 to 12 | 111 to 114 | 132 to 135 | 0 to 0 |
| `/datenschutz/` | p | 52 to 52 | 9 to 9 | 103 to 105 | 103 to 105 | 0 to 0 |
| `/e-bike-oder-klassisches-rad-welche-ents` | h1 | 52 to 52 | 10 to 10 | 117 to 120 | 117 to 120 | 0 to 0 |
| `/fahrrad-leasing-die-smarte-alternative-` | img leasing | 56 to 52 | 10 to 10 | 112 to 115 | 112 to 115 | 0.0003 to 0 |
| `/impressum/` | p | 44 to 40 | 8 to 8 | 87 to 90 | 87 to 90 | 0 to 0 |
| `/service/` | img fitting | 52 to 48 | 14 to 15 | 133 to 140 | 133 to 140 | 0 to 0 |
| `/sicherheit-auf-zwei-raedern-so-faehrst-` | p | 52 to 48 | 10 to 10 | 106 to 109 | 106 to 109 | 0 to 0 |
| `/so-erkennst-du-fruehzeitig-fahrrad-ermu` | img fitting to p | 60 to 48 | 10 to 10 | 114 to 117 | 114 to 117 | 0 to 0 |
| `/stellenangebote/` | li | 48 to 56 | 8 to 8 | 84 to 87 | 84 to 87 | 0 to 0 |
| `/termin-buchen-oldenburg/` | address to p | 56 to 44 | 10 to 10 | 88 to 91 | 88 to 91 | 0.0011 to 0 |
| `/termin-buchen-osnabrueck/` | address to p | 48 to 44 | 10 to 10 | 88 to 91 | 88 to 91 | 0 to 0 |
| `/termin-buchen/` | address to h2 | 44 to 52 | 10 to 10 | 89 to 92 | 89 to 92 | 0 to 0 |
| `/ueber-uns/` | img fitting | 52 to 44 | 12 to 12 | 115 to 118 | 115 to 118 | 0 to 0 |
| `/wann-sich-ein-professioneller-fahrradse` | img service | 52 to 52 | 10 to 10 | 105 to 108 | 105 to 108 | 0 to 0 |

(KB are raw bytes, the server does not compress; "load" is the load event plus 1.5 s without scrolling, "scrolled" after scrolling through the page. The ~3 KB growth per page is the fallback-font CSS, the preload tag and the larger footer markup. WebKit, same tool: LCP 29 to 60 ms local, CLS 0 on every page, requests and bytes about the same as Chrome (home 390 px 13 requests, 122 KB).)

Throttled (CDP emulation, Chrome, LCP in ms, CLS, KB at load):

| Profile | Page | Width | LCP | CLS | KB at load |
|---|---|---|---|---|---|
| fast 4G (9 Mbit/s, 60 ms) | post (leasing) | 1440 | 264 to 248 | 0 to 0 | 164 to 167 |
| fast 4G (9 Mbit/s, 60 ms) | home | 1440 | 272 to 276 | 0 to 0 | 18317 to 18319 |
| fast 4G (9 Mbit/s, 60 ms) | post (leasing) | 390 | 220 to 212 | 0.0003 to 0 | 112 to 115 |
| fast 4G (9 Mbit/s, 60 ms) | home | 390 | 284 to 252 | 0.0002 to 0 | 137 to 122 |
| slow 4G (1.6 Mbit/s, 150 ms, the Lighthouse mobile profile) | post (leasing) | 1440 | 1052 to 948 | 0 to 0 | 164 to 167 |
| slow 4G (1.6 Mbit/s, 150 ms, the Lighthouse mobile profile) | home | 1440 | 1128 to 824 | 0 to 0 | 18317 to 18319 |
| slow 4G (1.6 Mbit/s, 150 ms, the Lighthouse mobile profile) | post (leasing) | 390 | 644 to 620 | 0.0003 to 0 | 112 to 115 |
| slow 4G (1.6 Mbit/s, 150 ms, the Lighthouse mobile profile) | home | 390 | 612 to 628 | 0.0002 to 0 | 137 to 122 |

Also at slow 4G, measured earlier in the session with the same tool: `/service/` 1440 px 1296 to 700 ms, 390 px 1050 to 650 ms. Home at 1440 slow 4G: preload alone took LCP from 1.17 s to 0.81 s (three runs each: 1196/1172/1168 before, 800/808/812 after). A single merged stylesheet (`cssCodeSplit: false`: 1 file of 22.9 KB instead of 6 of 16 KB, 5 requests fewer) was measured and rejected: first view at slow 4G was 25 to 50 ms slower.

### Hero video (d69)

Policy now: no download before the `load` event; only from 48 rem up; never with `prefers-reduced-motion`; and not when `navigator.connection` says `saveData`, `type: 'cellular'` or `effectiveType` `slow-2g`/`2g`/`3g`; without the API (Safari, Firefox) the previous behaviour applies; the connection is re-read on its `change` event (a video that is playing when the connection turns metered stops). `net` tests five cases with a mocked connection (saveData, cellular, 3g, 2g: no request, not playing; wifi 4g: plays). Limit found by measuring: **desktop Chrome does not expose `type` and reports `effectiveType: "4g"` even under 1.6 Mbit/s emulation** (rtt 150, downlink 1.55), so the policy protects Android Chrome users and Save-Data users, not a slow desktop line, and an iPad on cellular (no API, 48 rem wide) still downloads the file. `(pointer: fine)` as an extra condition would cover tablets; I did not add it (owner decision).

Real bytes of `hero.mp4` after the load event (CDP, home at 1440 px, the file is 18,532,324 B = 17.67 MiB; the review server has no range support, so the browser takes the whole file, Cloudflare Pages should serve ranges, but a looping `<video>` buffers ahead anyway):

| Network | 1 s | 3 s | 10 s after load |
|---|---|---|---|
| no throttling | 17.67 MiB | 17.67 MiB | 17.67 MiB |
| fast 4G (9 Mbit/s) | 1.04 MiB | 3.24 MiB | 10.86 MiB (done after about 17 s) |
| slow 4G (1.6 Mbit/s) | 0.16 MiB | 0.56 MiB | 1.96 MiB (would take about 90 s) |

Home page at 1440 px, whole first view: 18,319 KiB (17.89 MiB) with the video, 249 KiB without; at 390 px 122 KiB (no video). All "KB" in this file are KiB (bytes / 1024).

**The three options for the owner** (the encode was not changed; 540p is the Stage 2 `Preset960x540` result, not re-made):

| Option | Video bytes | Home 1440 first view | Notes |
|---|---|---|---|
| A: 720p H.264 (now) | 18,532,324 B (17.67 MiB) | 17.89 MiB (18,319 KiB measured) | visibly softer than the 1080p original on a 1440 px hero; plays on desktop only, not on metered Chrome connections |
| B: 540p H.264 | 11.39 MiB (Stage 2 figure) | about 11.63 MiB | 36 % less (6.3 MiB per desktop visit); softer still behind the dark shade |
| C: poster only, no video | 0 B | 0.24 MiB (249 KiB) | the poster (hero AVIF) is the LCP element anyway; no motion, no pause button, no data question, simplest to host |

Browser results for the hero (home, 1440 px unless stated):

| Browser | Result |
|---|---|
| Chrome 158 (system) | starts without a click about 1.5 to 3 s after load (`paused=false`, `currentTime` advances), button appears; 390 px: never requested; reduced motion: never requested; mocked saveData/cellular/3g/2g: never requested; real CDP `cellular4g` emulation: `type` not exposed, so it plays |
| WebKit 27.2 (Playwright) | refuses muted autoplay (NotAllowedError) without a gesture, as in Stage 2; plays after the first click, `canPlayType('video/mp4; codecs="avc1.640028"')` is "probably"; 390 px and reduced motion: never requested |
| Firefox | **not run** (see the top of this file); by design: no `navigator.connection`, so it plays like Chrome does if its autoplay policy allows muted video (Firefox allows it by default) and its H.264 decoder is available (Firefox uses the operating system's decoders on macOS and Windows; I could not check) |

## 4. Security and robustness

- **CSP** (`public/_headers`, one `/*` rule): applied to every document in the `net`, `ui` and `embeds` runs, in Chrome and WebKit, on all 16 pages at 1440 and 390: 0 console errors, so no violation. `headers` checks the policy statically: every source `'self'`, `img-src 'self' data:`, no `unsafe-inline`, `unsafe-eval`, wildcard, `https:` or `http:` source, `frame-src` exactly `https://www.etermin.net https://www.google.com/maps https://www.google.com/maps/ https://bike-leasing-calculator.jobrad.org`, `object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors`.
- **Embed flow** (`embeds`, Chrome and WebKit, mouse, Enter, Space on the focused button, 5 embeds): before the activation 0 non-local requests; after it exactly one, to the embed host (`www.etermin.net` x2, `www.google.com` x2 maps, `bike-leasing-calculator.jobrad.org` x1), aborted by the test; no CSP error; one iframe, gate removed, focus on the iframe. Negative test: removing the Google entries from `frame-src` makes 24 activations fail with "Framing 'https://www.google.com/' violates ...". Not testable offline: that the real Google Maps embed URL `https://www.google.com/maps?q=...&output=embed` keeps working after redirects (the CSP allows `/maps` and `/maps/`, which covers a redirect to `/maps/embed?...`).
- Headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Frame-Options: SAMEORIGIN` plus `frame-ancestors 'self'`, `Cache-Control: public, max-age=31536000, immutable` on `/_astro/*`, `X-Robots-Tag: noindex` on `https://bike-one.dev/*` and `https://*.pages.dev/*` (all in the file, checked; the production host has no such rule and the release build is indexable by meta). What I could not verify: that Cloudflare Pages applies them (no deployment), and no `Strict-Transport-Security` is set (it is a zone setting on Cloudflare; `includeSubDomains` would also hit the shop, owner decision).
- Mixed content: no `http://` URL in any text file of `dist/` other than XML namespaces; `links` forbids third-party requests while rendering; `net` fails on any non-local request.
- `_redirects`: 141 rules (23 dynamic), limits are 2000 static and 100 dynamic; no rule's target is itself redirected (so no loop, at most one hop), every internal target is a built page or the sitemap file of the release build, every old URL resolves (`redirects` check, unchanged and green); `_headers` has 4 rules (limit 100).
- Robustness: the legal text's long ODR URL widened the Impressum by 13 px at 390 (fixed, and `ui` now fails on any horizontal scrolling).

## 5. Copy consistency (d66)

The three embed consent sentences are now: "Die Karte wird von Google Maps bereitgestellt. Beim Laden verbindet sich dein Browser mit Google Maps und deine IP-Adresse wird übertragen." (same with "Die Terminbuchung ... eTermin" and "Der Beispielrechner ... JobRad"). They say what is loaded, from whom, that a connection is made and the IP address is sent. Impressum, Datenschutz and the captured blog and service text were not touched. Still true: the Datenschutz does not name these providers (legal review).

## 6. Visual review

Screenshots of all 16 pages at 390, 768 and 1440 (system Chrome, `scroll-behavior: auto`, fonts awaited, scrolled so lazy images load, reduced motion so the poster shows) in `website/review/stage3/` (git-ignored; slices of 1500 to 2400 px in `review/slices/`), `node tools/screens.mjs`. I read the full pages of home (1440, 768, 390), Ueber uns (1440, 768, 390), service (1440, 390), the overview and both booking pages (1440, 768, 390), blog index (1440, 390), the posts (leasing 1440; e-bike 390; sicherheit 1440; wann 768; so-erkennst 390), jobs (390), Impressum (390), Datenschutz (390), 404 (1440). The other combinations are the same templates; `ui` and `net` pass on all of them.

Defects found and fixed:

| # | Where | Defect | Fix |
|---|---|---|---|
| 1 | Impressum 390 | the ODR link (one unbreakable string) made the page 13 px wider than the screen | `overflow-wrap: anywhere` on the legal text; `ui` fails on horizontal overflow on every page |
| 2 | home 1440 | after darkening the hero for 4.5:1 the photo was a dark mud; the first shade gave the eyebrow 4.91:1 | shade strongest bottom left on wide screens (two gradients), photo visible on the right; eyebrow 5.47:1, video frames checked |
| 3 | footer 1440 | the two stores stacked in a narrow column, a tall footer with a big gap | wider contact column, two stores side by side |
| 4 | footer 768 | 2x2 grid left "Rechtliches" alone in a third row | 3 columns (intro, Seiten, Rechtliches) under the full-width stores |
| 5 | store cards, footer, desktop | after the 44 px rule phone and e-mail lines sat 44 px apart on desktop | 44 px only on phones and touch screens |
| 6 | posts 390 | the long breadcrumb wrapped and left a lone "›" at the start of a line | one line, the current page cut with an ellipsis, separators symmetric |
| 7 | Ueber uns 390 | the map placeholder text just fitted its 16:9 box | minimum height 14 rem |
| 8 | all pages | ghost button border 1.97:1, footer button hover 4.02:1 | tokens, see contrast |
| 9 | header, footer, breadcrumbs, links | logo 28 px high, footer links and many standalone links 19 px high | 44 px targets on phones |
| 10 | embeds | keyboard focus fell to the page start after "Karte laden" | focus moves to the iframe |
| 11 | /service/ | its first photo (the LCP element) was lazy | eager, high priority, preloaded |

Open after the review: none that I can see. Small things I left: the hero at 390 px starts with about 400 px of dark sky before the text (a design choice, `min-height` 78 vh); the Ueber uns map placeholder at 768 px is a large 16:9 box (686 x 386) because the card is one column there.

## 7. Candidate keywords and claims for the owner (not applied)

Each needs the owner's confirmation before it enters a title, description or JSON-LD:

- "E-Bike" in home/service titles and the home description: the E-Bike post exists, but no page says the shops sell E-Bikes. "Rennrad", "Gravelbike", "Zeitfahrrad/Triathlon": only the old WooCommerce product categories (not shipped) carried them.
- The seven brand names in the home description or as "Händler" ("Trek Händler Oldenburg"): names are captured ("Starke Marken"), dealer status is a claim. Also the spelling "Cervelo" or "Cervélo".
- "bis zu 40 %" (home, service) and "bis zu 30 %" (post): captured, but a savings claim in a search snippet.
- From the service copy (captured, so usable): "lasergestütztes Bike-Fitting", "Meisterwerkstatt", "autorisierter Servicepartner / Collect & Ride Partner von Canyon". A service title like "Bike-Fitting, Dienstradleasing & Meisterwerkstatt" or one with "Canyon Service Partner" would target "Canyon Service Oldenburg"; the page does not say which store offers it.
- City + service words ("Bike-Fitting Oldenburg", "Fahrradwerkstatt Osnabrück", "Dienstradleasing Oldenburg"): the page does not say which store does what; the opening hours differ (Osnabrück closed on Monday).
- Partner names for Dienstradleasing (JobRad is on the page through the calculator; BusinessBike, Mein-Dienstrad and the others were logos only).
- Google Business Profile per store (needed for the local pack, not in the repo) and then `geo`/`image`/`sameAs` in the BikeStore data.

## 8. Open questions

1. Hero video: A (720p, now), B (540p, 11.39 MiB) or C (poster only)? And add `(pointer: fine)` to the autoplay condition so tablets on cellular do not load it?
2. Firefox: needs a run on a machine where Playwright's Firefox starts (or real Firefox on macOS/Windows), for the hero (autoplay, H.264).
3. Real Safari (macOS, iOS, Low Power Mode) and Android Chrome were not run either (Stage 2 question stays).
4. The Datenschutz must name Google Maps, eTermin and the JobRad calculator (click-to-load embeds) and the click-to-load wording and CSP should go through the `legal-security-reviewer`; the Impressum still cites the TMG; none of that was touched.
5. `Strict-Transport-Security` for bike-one.org: set at the Cloudflare zone (the shop shares the apex, so `includeSubDomains` is a joint decision).
6. Claims in the section above; "bis zu 40 %"/"30 %" and the Austria/Vienna sentences in two posts (verbatim, unchanged).
7. Menu button `aria-expanded`: native in Chrome for popover invokers, unverified in Safari; a 3 line script would set it everywhere if wanted.
8. `tools/perf.mjs` and `tools/screens.mjs` import Playwright from `/Users/timo.alts/dev/astro-conversion-kit/node_modules/playwright` like `net`; `PLAYWRIGHT_MODULE` overrides it. The `firefox-1555` browser I installed lives in `~/Library/Caches/ms-playwright`, outside the repo. No npm dependency was added.
9. The review server on :4321 is running (serves the dev build in `dist/`).
