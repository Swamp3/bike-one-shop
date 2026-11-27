# SEO review: static Astro rebuild of bike-one.org (BikeOne GmbH)

Reviewed 2026-11-25. Read-only review of `/Users/timo.alts/dev/bike-one-shop/website` (src/, dist/, baseline/, capture/, public/, docs/, redirects.csv, exceptions.json, proposals.json).

Scope and limits (read first):
- No network access (live site off limits), no Lighthouse, no shell. Counts come from grep over `baseline/seo.json`, `capture/inventory.json`, `dist/` and `src/`. Character lengths of titles and descriptions are hand-counted and approximate (marked with "~"); recheck in a script before any of this ships.
- No search volumes, rankings, GSC or crawl data were available. Keyword suggestions below are semantic-pattern estimates, not measured demand. For real numbers please provide a GSC performance export (queries and pages, last 16 months) and, if available, Ahrefs/Semrush exports.
- The site is a parity rebuild: every head-tag fix below is a proposal (goes through `proposals.json`, decision id in `docs/plan.md`, applied only with `PROPOSALS=on` until a person approves). Nothing here was changed.
- I did not measure inline CSS bytes. The brief says 1+ MB; I could only confirm the structure (home: 30 `<style>` blocks, ~20 render-blocking `<link rel=stylesheet>`, ~44 external scripts).

## Executive summary

The rebuild reproduces the live head exactly, which also reproduces its SEO weaknesses: 0 of 55 pages have a meta description, 0 have Open Graph, Twitter or JSON-LD, 27 have no h1, 12 have no canonical, and 24 theme-demo pages (portfolio, team, portfolio category) plus 3 thin archive pages are indexable and listed in the sitemap. The two launch-level risks are not head tags: (1) all 43 WooCommerce product URLs, 3 category URLs and the shop pages listed in the live sitemap will 404 on bike-one.org after DNS cutover while 236 internal anchors still point at them, and (2) the 1.16 GB media set and the hero video `//bike-one.org/VidOne.mp4` do not exist in the repo/dist yet. The dev-indexing protection (robots Disallow, meta noindex, X-Robots-Tag for bike-one.dev and *.pages.dev) is correct. The fastest wins after sign-off are: real titles and descriptions for about 12 money pages, noindex plus sitemap removal for demo/archive pages, an h1 on the home page, LocalBusiness JSON-LD (draft in section 6), and fixing the 9 `bikeone.cvires.at` links.

## 1. What is already correct (keep it that way)

| Item | Evidence |
| --- | --- |
| Non-release builds cannot be indexed | `src/layouts/Base.astro` adds `<meta name="robots" content="noindex, nofollow">` unless `PUBLIC_INDEXABLE=true`; `dist/robots.txt` is `User-agent: *` / `Disallow: /`. |
| Dev host protected twice more | `public/_headers`: `X-Robots-Tag: noindex` for `https://*.pages.dev/*` and `https://bike-one.dev/*`. Keep these rules in the release build: if bike-one.dev stays attached to the production deployment, the header still keeps it out. |
| Shop link switches by build | `src/lib/site.mjs`: `SHOP_URL` is `shop.bike-one.org` only when `INDEXABLE`; no `bike-one.dev` string anywhere else in `src/` or in dist xml/txt. |
| Canonical form is consistent | All 43 canonicals in `baseline/seo.json` are `https://bike-one.org/<path>/` (https, apex, trailing slash), matching d5 (trailing slash on 54/54 pages). No http, no www, no query strings. |
| `lang="de"` on every page | `baseline/seo.json` `"lang": "de"` for all 55. Single-language site, so no hreflang needed. |
| Release robots.txt is sane | `capture/robots.txt` (reused by `src/pages/robots.txt.js`): no CSS/JS blocking, `Sitemap: https://bike-one.org/wp-sitemap.xml`. |
| Product images | AVIF with real alt text, `loading="lazy"`, width/height set (`capture/inventory.json`, Trek brand page). Swatch thumbs (48x48) with `alt=""` are fine as decorative. |
| No analytics, no tag manager | `baseline/counts.json` `"scripts": 0`. Nothing to carry over, but also nothing measuring (see M9). |

## 2. Prioritised action plan

Impact/Effort as defined by the brief. "Where" = this site now, this site after sign-off (proposal), or waits for shop.bike-one.org.

| Id | Task | Category | Impact | Effort | Where |
| --- | --- | --- | --- | --- | --- |
| C1 | Redirect map for the 43 `/product/*`, 3 `/product-category/*`, `/shop/` and related Woo URLs; remove or retarget 236 internal links to them | Tech | High | Medium | Waits for shop |
| C2 | Put the media and the hero video on the production origin before DNS (R2 plus `VidOne.mp4`) | Tech | High | Medium | This site (blocked on R2 credentials) |
| H1 | Real title and meta description on every indexable page | Content | High | Low | This site (proposal) |
| H2 | Noindex and drop from sitemap: 15 portfolio, 7 team, 2 portfolio-category, 2 author, 1 category | Tech | High | Low | This site (proposal) |
| H3 | Add an h1 to the 27 pages without one, starting with home, brands, booking pages | Content | High | Low | This site (proposal) |
| H4 | `/main-bike/` ("Main Bike OLD"): noindex or 301 to `/`, move its service copy into proper pages | Content | High | Low | This site (proposal) |
| H5 | Replace the 9 `bikeone.cvires.at` hrefs (blog index, /main-bike/) | Tech | High | Low | This site (proposal, or exception) |
| H6 | LocalBusiness/BikeStore + Organization JSON-LD on `/` and `/ueber-uns/` | Tech | High | Low | This site (proposal) |
| H7 | Home hero: LCP image hidden behind RevSlider JS, hero video 404 at launch | Tech | High | Medium | This site (proposal) |
| H8 | Empty category shells (`/ebikes/`, `/racebikes/`, `/sale/`, `/tt-triathlon/`, `/alle-fahrrader/`): noindex now, redirect to shop later | Tech | Medium | Low | Partly waits for shop |
| H9 | Booking pages `/termin-buchen-oldenburg/` and `/-osnabrueck/`: slug as title, 0 words, iframe only | Content | High | Low | This site (proposal) |
| M1 | Open Graph and Twitter cards plus one default share image | Tech | Medium | Low | This site (proposal) |
| M2 | Internal linking: 15 money pages are not in nav or body links | Content | Medium | Medium | This site (proposal) |
| M3 | Blog: shorter titles, descriptions, Article and BreadcrumbList JSON-LD, author | Content | Medium | Low | This site (proposal) |
| M4 | Brand pages `/Marke/*`: unique intro copy, h1, decide ownership versus the shop | Content | High | Medium | Copy here, product list waits for shop |
| M5 | Duplicate archive content: `/category/allgemein/`, `/author/*` versus `/blog/` | Tech | Medium | Low | This site (proposal) |
| M6 | Sitemap hygiene for release (xsl, absolute host, scope) | Tech | Medium | Low | This site |
| M7 | Alt text for 18 home and 18 `/main-bike/` content images (9 logos, 9 graphics; plus 2 slider placeholders) | Content | Medium | Low | This site (proposal) |
| M8 | CWV: dead WooCommerce/WP scripts, render-blocking CSS, PNG screenshots, cache headers | Tech | Medium | High | This site (proposal) |
| M9 | Search Console and Bing Webmaster set-up, sitemap submission, 404 log watch | Tech | Medium | Low | Person with account access |
| M10 | NAP consistency: "Lengericher Landstr." versus "Landstraße", "Rheinstr." versus "Rheinstrasse" | Content | Medium | Low | This site (proposal) |
| L1 | Remove dead WP head links (xmlrpc, wp-json, oEmbed, EditURI, shortlink, generator) | Tech | Low | Low | This site (proposal) |
| L2 | `?p=ID` shortlink redirects in `redirects.csv` are not effective on Cloudflare Pages | Tech | Low | Medium | This site |
| L3 | Favicon links: one 404, conflicting sizes | Tech | Low | Low | This site (proposal) |
| L4 | Typos and leftovers: "Wilkommen", "[/vc_column][/vc_row]", "Informiere dich sich" | Content | Low | Low | This site (proposal) |
| L5 | Lower-case `/marke/*` redirects, www and http handling at Cloudflare | Tech | Low | Low | Cloudflare config |
| L6 | Impressum cites TMG (replaced by DDG in 2024); Osnabrück branch not named | Content | Low | Low | Legal review, not SEO |
| L7 | `dist/.prerender/` contains a `cvires` string; confirm it is not uploaded | Tech | Low | Low | Deploy check |

## 3. Findings in detail

### Critical

**C1. WooCommerce URLs vanish at cutover, internal links still point at them (waits for shop)**
- Paths: `/`, `/gravel-bikes/`, `/Marke/*` (7), `/author/*` and `/team-member/*` (shared product-link markup).
- Evidence: `capture/sitemaps/wp-sitemap-posts-product-1.xml` lists 43 `https://bike-one.org/product/...` URLs (for example `/product/trek-checkpoint-carbon/`, `/product/cervelo-p5-2/`); `wp-sitemap-taxonomies-product_cat-1.xml` lists `/product-category/gravel-bikes/`, `/road-bikes/`, `/tt-bikes/`. In `dist/`, 236 `href` matches for `/product/` or `/product-category/` across 18 files (`dist/index.html:1052`, `dist/gravel-bikes/index.html:936`, `dist/Marke/cervelo/index.html:771`). d11 in `docs/plan.md` accepts this on staging as "medium".
- Why: these are the pages with the most commercial value and any existing backlinks; after DNS they return the Astro 404. Two slugs are accidental copies (`/product/wilier-turbine-slr-kopie/`, `/product/trek-checkpoint-carbon-kopie/`).
- Fix: when shop.bike-one.org has stable product handles, add one 301 per old URL in `redirects.csv` (`/product/trek-checkpoint-carbon/,https://shop.bike-one.org/<handle>,301,...`), then `npm run redirects:build`. Map the three `/product-category/*` to shop collections, `/shop/` to the shop root, `/Marke/<brand>/` to either shop brand filter or keep here (see M4). Point the 3 category links and product cards on `/`, `/gravel-bikes/` and `/Marke/*` to the shop. Redirect the two `-kopie` slugs to their originals.
- Effort: medium (mapping is mechanical once handles exist). Waits for the shop.

**C2. Media and hero video not on the production origin**
- Paths: all pages; `/` and `/main-bike/` for the video.
- Evidence: `docs/plan.md` d6: "live-temporary: 2009 files, 1156.7 MB ... 5 over 25 MB ... no R2 credentials; staging serves /wp-content/uploads/ from bike-one.org ... Must move to R2 before DNS". `docs/media-plan.json`: largest `/wp-content/uploads/2025/10/Unbenanntes-Video.mp4` at 91.9 MB (and `baseline/media.json` lists it with `"referencedBy": []`). The slider uses a different file: `dist/index.html:808` `data-mp4="//bike-one.org/VidOne.mp4"`; no `VidOne.mp4` exists in `dist/` or `public/`, `baseline/media.json` has no entry, and `.conversion/console.json` shows `requestfailed: http://bike-one.org/VidOne.mp4 net::ERR_ADDRESS_UNREACHABLE`.
- Why: after cutover every image 404s (loss of content, Google Images, LCP) and the hero video 404s. The URL is protocol-relative with a hard-coded host, so it also loads from the live host while testing on bike-one.dev.
- Fix: finish the R2 upload and the media rewrite (d21), re-capture `VidOne.mp4` into the media set (it sits in the WP web root, not in uploads), serve it from the same origin, and re-encode to a short compressed clip (target well under 5 MB) with the poster as fallback. Decide with the client whether the 4108 unreferenced image sizes (`docs/plan.md`, `--sizes all`) matter for image-search traffic; if not, accept the loss.
- Effort: medium. Blocked on R2 credentials.

### High

**H1. No meta description anywhere; weak or technical titles**
- Paths: all 55.
- Evidence: `baseline/seo.json` `"description": null` for every path. Titles: `/` is `"BikeOne GmbH"` (no keyword, no city); `/main-bike/` `"Main Bike OLD – BikeOne GmbH"`; `/termin-buchen-oldenburg/` `"termin-buchen-oldenburg – BikeOne GmbH"` and the Osnabrück twin; `/sale/` `"SALE! – ..."`; `/racebikes/` `"RaceBikes – ..."`, `/gravel-bikes/` `"GravelBikes – ..."`, `/ebikes/` `"eBikes – ..."`. Duplicates: `"Portfolio Name – BikeOne GmbH"` on 15 pages; `"BikeOne GmbH"` on `/` and `/author/lawrencebennier-com/`. The five blog titles are ~96 to ~131 characters (hand-counted, for example the E-Bike post ~131), far over 60.
- Why: Google writes its own snippets, titles are rewritten when too long, and "BikeOne GmbH" ranks for brand queries only. The German market terms are "Rennrad", "Gravelbike", "E-Bike", "Dienstradleasing", "Fahrradwerkstatt"; the titles use "RaceBikes" and "GravelBikes" as one word.
- Fix: proposal rows per path, see section 5 for ready copy. Pattern: `<Keyword> <Stadt> | BikeOne` (under 60 characters), descriptions under 155 with a call to action. Keep the " – BikeOne GmbH" suffix only if parity matters more than length.
- Effort: low. This site, via proposals.

**H2. Theme demo and placeholder pages are indexable and in the sitemap**
- Paths: `/portfolio/portfolio-name/` and `-2` to `-15` (15), `/team-member/{charlotte-neal,john-bennett,victor-peters,willie-carter,member-01,member-02,member-03}/` (7), `/portfolio-category/branding-design/` and `/page/2/` (2).
- Evidence: `docs/plan.md`: "Noindex pages 0". `capture/text/team-member__john-bennett.txt` is Lorem ipsum; `capture/text/portfolio__portfolio-name.txt` reads "Portfolio Name Branding Design John Snow 09 Feb 2017 United States la-studioweb.com Donec id erat ...". Sitemap lastmod values are 2017 (`public/wp-sitemap-posts-la_portfolio-1.xml`, `wp-sitemap-posts-la_team_member-1.xml`). Titles `"Member 01 – BikeOne GmbH"`, `"Charlotte Neal – BikeOne GmbH"`: invented people presented as the BikeOne team. The pages link out to the theme vendor (la-studioweb.com).
- Why: 24 near-identical placeholder URLs against 31 real ones dilute crawl budget and quality signals, can surface in SERPs under the brand name, and fake team members hurt trust (E-E-A-T).
- Fix (order of preference): (a) 410/404 and remove from sitemap and the home `links` set (cleanest, needs client approval since d8 says "reproduce live"); (b) `<meta name="robots" content="noindex, follow">` plus removal from `public/wp-sitemap-posts-la_portfolio-1.xml`, `wp-sitemap-posts-la_team_member-1.xml`, `wp-sitemap-taxonomies-la_portfolio_category-1.xml` and the index. Do not noindex and leave them in the sitemap (contradictory signal). If real staff pages are wanted later, create them as new URLs.
- Effort: low. This site.

**H3. 27 pages have no h1; section headings are bold paragraphs**
- Paths: `/`, `/Marke/*` (7), `/alle-fahrrader/`, `/author/*` (2), `/blog/`, `/category/allgemein/`, `/datenschutz/`, `/impressum/`, `/ebikes/`, `/gravel-bikes/`, `/racebikes/`, `/sale/`, `/tt-triathlon/`, `/stellenangebote/`, `/ueber-uns/`, `/termin-buchen/`, `/termin-buchen-oldenburg/`, `/termin-buchen-osnabrueck/`, `/portfolio-category/branding-design/` (+ page 2).
- Evidence: `baseline/seo.json` `"h1": []` for those paths. On `/` the h2 list is `["Trek Checkpoint Carbon SL3","Pinarello F","Cervelo P5","Kontakt","Shop","Rechtliches"]`; the real sections are `<p class="wp-block-paragraph"><strong>Deine Bedürfnisse im Fokus.</strong></p>` (`dist/index.html:836`), "Wellness für dein Rad" (`:902`), "Starke Marken" (`:1017`). Blog posts correctly have one h1 and descriptive h2s, but end with an h2 "Beitragsnavigation" (WP screen-reader heading), and `/blog/` lists the same three post h2s twice. Footer h2 "Kontakt/Shop/Rechtliches" appear on every page.
- Why: no primary topic signal on the home and category pages; services are not headings, so they do not rank for "Bike Fitting", "Werkstatt", "Dienstradleasing".
- Fix: home `<h1>Fahrräder, Bike-Fitting und Werkstatt in Oldenburg und Osnabrück</h1>` (visually hidden is acceptable but a visible one is better); convert the `<p><strong>` section titles to `<h2>`: "Beratung nach Maß", "Bike-Fitting", "Individuelle Konfiguration", "Werkstatt", "Dienstradleasing", "Starke Marken" (use the existing wording). Brand pages: `<h1>Trek bei BikeOne</h1>` etc. Demote footer headings to `<p class="bo2-title">` or keep h2 but ensure h1 exists. The CSS keys on classes in `footer.html`, so retag only with the same classes.
- Effort: low (markup edits in `src/content/pages/*.html`, behind `proposalOn`). This site.

**H4. `/main-bike/` is an old home page that is live, indexable and in the sitemap**
- Evidence: title `"Main Bike OLD – BikeOne GmbH"`, canonical self, h1 `"Herzlich Wilkommen bei BikeOne in Oldenburg"` (typo), `public/wp-sitemap-posts-page-1.xml` lists it first. Body contains a visible shortcode leak `[/vc_column][/vc_row]` (`capture/text/main-bike.txt`) and `Informiere dich sich zum Thema`. It links to `bikeone.cvires.at/ebikes/`, `/gravel-bikes/`, `/racebikes/` (`dist/main-bike/index.html:769,778,787`). No internal link points to it.
- Why: competes with `/` for the same intent with worse copy, and "OLD" is a public title. But it holds the only service copy on the site: Bike-Fitting by laser body measurement, Dienstradleasing "bis zu 40 %", "Werkstattservice aus Meisterhand", "Canyon Collect&Ride" and "Canyon Service" (authorised service partner).
- Fix: noindex now; later split the copy into dedicated pages (`/werkstatt/`, `/bike-fitting/`, `/dienstradleasing/`, `/canyon-service/`) and 301 `/main-bike/` to `/`. Fix the shortcode leak, typos and cvires links in the interim.
- Effort: low now, medium for the new pages. This site.

**H5. Dev-host leak `bikeone.cvires.at` in content**
- Evidence: 9 anchors in `dist/`: `dist/blog/index.html:746,751,766,771,786,791` (links to three posts, title and CTA, in the featured block) and `dist/main-bike/index.html:769,778,787`. Feeds: `dist/feed/index.xml` (5 `guid isPermaLink="false"` values such as `https://bikeone.cvires.at/?p=1881`), `dist/Marke/cervelo/feed/index.xml` (7), `dist/category/allgemein/feed/index.xml` (5), `dist/author/lawrencebennier-com/feed/index.xml` (5), `dist/Marke/factor/feed/index.xml` (1). Capture also has 11 in `capture/pages/home.html` (images; already rewritten to local paths in `dist/index.html`), 366 in `capture/wp-rest/media.json`, and the WP user "bit" has `"url": "https://bikeone.cvires.at"` in `capture/wp-rest/users.json`.
- Why: on the production host, the three newest posts on `/blog/` and the three category tiles on `/main-bike/` send visitors and link equity to a foreign staging domain that may disappear or serve duplicate content. Feed guids are harmless to rankings but expose the host.
- Fix: rewrite `https://bikeone.cvires.at/` to `https://bike-one.org/` in the two page sources (`src/content/pages/blog.html`, `src/content/pages/main-bike.html`) and the feed xml files. Record as exception or proposal (field `link`). Confirm with the client that cvires.at is the former WordPress dev host and that it is switched off or noindexed.
- Effort: low. This site.

**H6. No structured data at all**
- Evidence: `baseline/seo.json` `"jsonLd": []` for all 55; no `<script type="application/ld+json">` in `dist/index.html`. The NAP data exists in plain text: footer (`src/content/parts/footer.html`), `/ueber-uns/`, `/termin-buchen/`.
- Fix: add the BikeStore/Organization graph from section 6 on `/` and `/ueber-uns/` (both stores), a single-store node on each booking page, Article plus BreadcrumbList on the 5 posts (example in section 6). Do not add FAQPage markup for the leasing post's "Häufige Fragen" section expecting a rich result: Google limits FAQ rich results to well-known government and health sites; keep the questions as visible h3 headings instead.
- Effort: low. This site, proposal.

**H7. Home hero: LCP depends on JavaScript, video is a launch-day 404**
- Evidence: `dist/index.html:803` `<rs-module-wrap ... style="visibility:hidden;...">`; slides at `:807` and `:814` are `<img fetchpriority="high" ... src=".../revslider/sr6/assets/assets/dummy.png" ... data-lazyload="/wp-content/uploads/revslider/video-media/Unbenanntes-Video_1.jpeg">` (placeholder in `src`, real image set by JS) and a `<rs-bgvideo data-mp4="//bike-one.org/VidOne.mp4">`. jQuery and jQuery Migrate load without `defer` in the head (`dist/index.html:642-643`); RevSlider scripts are at `:1505-1506`.
- Why: the hero is hidden until `rs6.min.js` runs after ~40 other scripts, the browser cannot preload the real poster, and `fetchpriority="high"` is spent on a 1x1 placeholder. Expect poor LCP on mobile. At launch the video 404s (C2).
- Fix (proposal, needs visual sign-off because the 0.5 % pixel-diff gate in `CLAUDE.md` applies): render the poster as a plain `<img>`/CSS background in the HTML with `fetchpriority="high"` and a width/height, `<link rel="preload" as="image" href="/wp-content/uploads/revslider/video-media/Unbenanntes-Video_1.jpeg">`, start the video only on desktop after load (`preload="none"`), or drop RevSlider for a static hero with the existing "TERMIN BUCHEN" button.
- Effort: medium. This site.

**H8. Empty category shells indexed (and a thin archive set)**
- Paths: `/ebikes/` (1 word), `/racebikes/` (1), `/sale/` (0), `/tt-triathlon/` (0), `/alle-fahrrader/` (5), `/gravel-bikes/` (94 words, 14 product cards), `/author/marvin/` (0), `/stellenangebote/` (33).
- Evidence: `capture/inventory.json` `wordCount` values; `capture/text/alle-fahrrader.txt` is "Alle Fahrräder eBikes GravelBikes RoadBikes"; titles "eBikes", "RaceBikes", "SALE!". None is linked from header, footer or body (see M2); all are in `public/wp-sitemap-posts-page-1.xml`.
- Why: soft-404 candidates (the WC product grids rendered nothing at capture) with no entry points.
- Fix: noindex plus sitemap removal now; when the shop has the categories, 301 to `https://shop.bike-one.org/...` (rennrad, gravel, e-bike, triathlon/zeitfahren, sale). `/gravel-bikes/` follows the same route once its cards point at the shop.
- Effort: low now, redirects wait for the shop.

**H9. Booking pages carry no indexable content**
- Paths: `/termin-buchen-oldenburg/`, `/termin-buchen-osnabrueck/`, and to a lesser degree `/termin-buchen/` (51 words).
- Evidence: titles `"termin-buchen-oldenburg – BikeOne GmbH"`; `"h1": []`; `wordCount` 0; the only content is `<iframe class="bo-iframe" src="https://www.etermin.net/bike-one" title="Bike One Termin">` (`dist/termin-buchen-oldenburg/index.html:681`) and `https://www.eTermin.net/os1` for Osnabrück (`:681` in the other file). Note the iframe host casing differs (`etermin` versus `eTermin`).
- Why: these are the conversion pages for service and consultation, and the natural landing pages for "Termin Fahrradwerkstatt Oldenburg"; iframe content is not attributed to the page.
- Fix: title/description/h1 per store (section 5), and visible text above the iframe built only from existing facts: store address, opening hours, phone, e-mail, the sentence already used on `/main-bike/` ("Komm 15 Min vor Termin bei uns in den Laden ...") and a link to the store's contact data. Add a plain `mailto:`/`tel:` fallback below the iframe (also helps if etermin is blocked by a consent tool). Add a `noscript` link to the eTermin URL.
- Effort: low. This site.

### Medium

**M1. No Open Graph or Twitter cards**
- Evidence: `"og": {}`, `"twitter": {}` on all 55. No `og:locale`, no share image.
- Fix: add `og:type` (website, article for posts), `og:title`, `og:description`, `og:url` (= canonical), `og:locale` `de_DE`, `og:site_name` `BikeOne`, `og:image` (1200x630, needs a brand image; the repo has the logo only, so this is a design asset to request), `twitter:card` `summary_large_image`. Needs a default image and `Base.astro` support; skip pages that are noindex.
- Effort: low. This site.

**M2. Internal linking: money pages are orphans**
- Evidence: header menu is only Shop, Termin Buchen, Über uns (`src/content/parts/header.html`); footer adds Blog, Datenschutz, Impressum. Grep over `dist/` finds no link to `/Marke/*`, `/ebikes/`, `/gravel-bikes/`, `/racebikes/`, `/alle-fahrrader/`, `/sale/`, `/tt-triathlon/`, `/stellenangebote/` or `/main-bike/` from any other page (only each page's own canonical). `/termin-buchen-oldenburg/` and `-osnabrueck/` are linked only from `/termin-buchen/` and `/ueber-uns/`. Blog posts are linked only from `/blog/`. Navigation links are absolute `https://bike-one.org/...` (parity), content links are relative.
- Why: the brand pages are the strongest keyword assets (7 brands) and have zero internal links; Google finds them via the sitemap only.
- Fix: footer column "Marken" with the 7 `/Marke/*` links; "Stellenangebote" in the footer; home "Starke Marken" section linking each brand; each blog post linking to `/termin-buchen/` and to the relevant brand/service page; booking pages linking to each other and to `/ueber-uns/`. Internal anchors should use brand + city words ("Trek in Oldenburg und Osnabrück"), not "hier".
- Effort: medium. This site, proposal.

**M3. Blog posts: titles, schema, author, images**
- Paths: the 5 posts.
- Evidence: titles ~96 to ~131 characters; `"description": null`; `capture/wp-rest/posts.json`: all five `date` 2025-10-17 between 01:06 and 01:25 (bulk-published), `"author": 3` which is user `lawrencebennier-com` with empty display name (`users.json`), `"featured_media": 0` (no image), no images in `dist/<post>/index.html` body besides logos. Posts do have good h2 structure and visible `<time class="entry-date published" datetime="2025-10-17T01:25:05+02:00">`.
- Why: the posts are the only informational content; weak titles and no author or image limit CTR and AI-answer citation. The leasing and e-bike posts are the best candidates for "Fahrrad-Leasing Vorteile" and "E-Bike oder Fahrrad".
- Fix: titles under 60 characters with the question or the keyword first (section 5); description = first answer sentence; add an author line (client to decide: Organization or a named person; do not use the empty `lawrencebennier-com` account); add one real image per post (store, workshop); add 2 to 3 first-hand details per post (a BikeOne service price list, Dienstrad conditions as they apply at BikeOne) for E-E-A-T; put a 40 to 60 word direct answer under each h1 for AI answer engines; add Article + BreadcrumbList JSON-LD. Keep `Beitragsnavigation` out of the heading outline (make it `<p>` or `aria-label`).
- Effort: low for tags, medium for content. This site.

**M4. Brand pages `/Marke/*`: product lists without copy, and a shop ownership decision**
- Evidence: titles `"Trek – BikeOne GmbH"`, `"Factor Bikes – BikeOne GmbH"`; no h1, no description, no canonical; text is the WC filter UI (English strings `Product Filter`, `Show 12 15 30`, `Price Min.`) followed by product cards (`capture/text/Marke__trek.txt`). Product blurbs are copied manufacturer text and repeat across cards (the SL3, SL5 and SL7 cards share the "Checkpoint SL 7 AXS Gen 3" paragraph). Word counts: cervelo 844, wilier 744, trek 646, ridley 569, factor 561, specialized 495, pinarello 207 (mostly UI).
- Why: these are the pages that should rank for "Trek Händler Oldenburg" and similar; today they are product listings with duplicated supplier copy and no local signal.
- Fix: decide per brand whether the canonical brand page lives here (editorial: 150 to 250 words per brand on what BikeOne offers, which stores, test rides/Beratung/Service, Dienstradleasing, link to the shop collection) or on the shop (then 301 here). A hybrid works: keep `/Marke/<brand>/` here as the local landing page without the Woo list, link to the shop for the range. Add `canonical` to all 7 (currently null on all). Remove duplicated manufacturer paragraphs; unique 1 to 2 sentence summaries per bike if the list stays.
- Effort: medium (copy). List and links wait for the shop.

**M5. Archive duplicates and missing canonicals**
- Paths: `/category/allgemein/` (425 words), `/author/lawrencebennier-com/` (425 words), `/author/marvin/` (0 words), `/blog/` (528 words), `/portfolio-category/branding-design/page/2/`.
- Evidence: `"canonical": null` on these plus the 7 brand pages and `/portfolio-category/branding-design/` (12 pages without canonical in total; the other 43 are self-canonical). `/category/allgemein/` and the author page list the same five posts as `/blog/`. `/author/lawrencebennier-com/` has title `"BikeOne GmbH"` (same as home); `/author/marvin/` title exposes a username.
- Fix: noindex the two author archives and the category archive and drop them from `wp-sitemap-users-1.xml` / `wp-sitemap-taxonomies-category-1.xml` (or delete those sitemap files and their entries in `wp-sitemap.xml`); add self-canonicals to the 7 brand pages. The author sitemap also publishes WordPress usernames.
- Effort: low. This site.

**M6. Sitemap for the release build**
- Evidence: `public/wp-sitemap*.xml` are the captured WP files with hard-coded `https://bike-one.org/` and `<?xml-stylesheet href="https://bike-one.org/wp-sitemap.xsl">` / `wp-sitemap-index.xsl`; neither xsl is in `public/`, so both 404 once the site is live. The index still lists `wp-sitemap-taxonomies-product_brand-1.xml`, which now holds the 7 brand pages. 55 URLs: 16 pages, 5 posts, 15 portfolio, 7 team, 1 category, 7 brands, 2 portfolio-category, 2 users. The `lastmod` values are the old WordPress modification dates; Astro will not update them.
- Fix: keep the `/wp-sitemap.xml` path (already known to Google, referenced in robots.txt), but regenerate it at build time from the indexable set only (after H2, H4, H8, M5 about 24 URLs), drop the xsl lines, and set `lastmod` from the content file date. Before launch, check no URL in the sitemap is noindexed, redirected or 404 (`npm run verify:release`).
- Effort: low. This site.

**M7. Alt text on content images**
- Evidence: `capture/inventory.json`: 187 `"alt": ""` entries; on `/` 20 (2 slider placeholders; 9 section graphics: `Screenshot-2025-10-15-185857`, `Screenshot-2025-10-09-092823`, `image-5`, `image-6`, `Screenshot-2025-10-15-190642`, `Screenshot-2025-10-15-190848`, `Screenshot-2025-10-15-204135`, `-204213`, `image-8`; 9 partner logos: BusinessBike, Mein-Dienstrad.de, a "Standard" logo, radelnde-mitarbeiter, RadimDienst, leaseabike, Jobrad, BLS (`BLS_DE_Logo_Claim`), deutsche-dienstrad); `/main-bike/` 18. The WP media library has alt text on 16 of 1044 items (`capture/wp-rest/media.json`, 1028 empty), so nothing can be recovered from there. The hero slides use `alt=""` with the title attribute "Unbenanntes-Video_1.jpeg" (a filename). The header logos have no width/height (`capture/inventory.json` `"width": null`).
- Why: the leasing-partner logos are the proof for Dienstradleasing; as logos with alt = provider name they support "JobRad Händler" type queries. Section screenshots carry information; empty alt hides it.
- Fix: alt per logo from the file name after client confirmation (JobRad, BusinessBike, Mein-Dienstrad.de, Deutsche Dienstrad, leaseabike, Radl im Dienst, "radelnde Mitarbeiter", BLS), alt for the six screenshots after looking at them, hero alt "BikeOne Showroom" or similar only if it is true, and width/height on the header logos. Keep `alt=""` for decorative swatches.
- Effort: low. This site, proposal.

**M8. Core Web Vitals risks visible in the markup**
- Evidence (`dist/index.html`): 30 `<style>` blocks and ~20 `<link rel="stylesheet" media="all">` in the head (lines 89-209, 631-633) including WooCommerce block CSS, Contact Form 7, YITH wishlist, js_composer, animate.css (twice), font-awesome, lightbox2, RevSlider; ~44 external scripts: jQuery plus Migrate in the head without defer, moment.js, lodash, React 18 and react-dom, `wp-polyfill`, the YITH `lapilli-ui` bundle, `sourcebuster`/`order-attribution` (WooCommerce attribution cookies), `add-to-cart`, `add-to-cart-variation`, `woocommerce.min.js`, Swiper (twice, CSS and JS), masonry, lightbox2. Google Fonts as render-blocking CSS: `https://fonts.googleapis.com/css?family=Roboto%20Condensed:regular|...|Playfair%20Display:regular` (no `display=swap`) plus `//fonts.googleapis.com/css?family=Roboto:500%2C400&display=swap`. Images: six home PNG screenshots at 0.73 to 0.89 MB each (`baseline/media.json`: `Screenshot-2025-10-09-092823-1024x833.png` 727,421 bytes; `Screenshot-2025-10-15-185857-1024x834.png` 885,900 bytes; originals 1.9 and 2.3 MB). No cache headers for `/wp-content/*` and `/wp-includes/*` (only `/_astro/*` is immutable in `public/_headers`). Most images are lazy and have width/height; header logos do not. `sizes="auto"` is used on srcset images, which is fine.
- Why: the WooCommerce and wishlist stacks (cart, variations, swatches, attribution cookies) do nothing on a brochure site whose shop moved; they cost INP and LCP and set cookies (also a consent topic).
- Fix, in order of return: (1) drop WooCommerce, wishlist, React, lodash, moment, polyfill and CF7 on pages that do not use them (home keeps product cards only until C1 is resolved); (2) `defer` jQuery or load it after content; (3) inline only critical CSS and `media="print" onload` the rest, or concatenate; (4) self-host Roboto, Roboto Condensed, Playfair Display (also removes the Google transfer that German DPAs and courts have objected to; already noted as known); (5) convert the PNG screenshots to WebP/AVIF at the displayed size; (6) add to `public/_headers`: `/wp-content/*`, `/wp-includes/*`: `Cache-Control: public, max-age=31536000, immutable` (URLs carry `?ver=`; uploads are never overwritten); (7) width/height on logos. Run Lighthouse or PageSpeed Insights on the preview URL; d14 skipped it, so no lab numbers exist.
- Effort: high for 1 to 3 (visual regression risk against the 0.5 % pixel gate), low for 4 to 7. This site, proposals.

**M9. No measurement or webmaster set-up**
- Evidence: `baseline/scripts.json`/`counts.json` 0 scripts; no `google-site-verification` or `msvalidate.01` meta.
- Fix: verify bike-one.org as a Cloudflare DNS-TXT domain property in Search Console and Bing Webmaster Tools; submit `/wp-sitemap.xml`; use the URL Inspection tool on `/` and 3 brand pages on launch day; check the Pages 404 log on days 1, 3 and 7 (`docs/LAUNCH.md` section D). Create a Google Business Profile per store (not in the repo; needed for local pack), with the same NAP as the site. A privacy-friendly analytics decision is a consent topic, so leave it to the client.
- Effort: low. Person with account access.

**M10. NAP inconsistency**
- Evidence: Osnabrück street is "Lengericher Landstraße 30" in the footer and `/termin-buchen/`, "Lengericher Landstr. 30" on `/ueber-uns/`. Oldenburg is "Rheinstr. 16" (footer, booking, about) and "Rheinstrasse 16" (Impressum, `capture/text/impressum.txt`, which also writes "26135 Oldenburg(Oldb)"). Phone and e-mail are consistent between footer and `/ueber-uns/`; `info@bike-one.de` appears in the Impressum and Datenschutz only, the footer shows the two store addresses.
- Fix: pick one spelling (suggest "Rheinstraße 16" and "Lengericher Landstraße 30") and use it in footer, about, booking pages, Impressum, Google Business Profile and the JSON-LD.
- Effort: low. This site, proposal (Impressum text edit needs legal approval).

### Low

- **L1. Dead WordPress head links.** `dist/index.html:635-662`: `rel=pingback` (`xmlrpc.php`), `rel="https://api.w.org/"` (`/wp-json/`), `EditURI` (`xmlrpc.php?rsd`), two oEmbed alternates, `rel=alternate` JSON (`/wp-json/wp/v2/pages/1709`), `rel=shortlink`, `meta generator` WordPress 7.1.5 and WooCommerce 11.3.1, plus `dns-prefetch//fonts.googleapis.com`. They are whitelisted in `exceptions.json` (3,063 lines, almost all of this kind). On the static site the endpoints return 404 and the generator tags advertise software versions. Remove in a proposal batch; also shrinks `exceptions.json`.
- **L2. `?p=ID` redirects do nothing on Cloudflare Pages.** `redirects.csv` has 42 `shortlink` rows (`/?p=1111,/alle-fahrrader/,301,shortlink,unverified shortlink`) marked `verified: false` in `capture/redirects.json`; `public/_redirects` correctly omits them because Pages `_redirects` cannot match query strings. Only `/termin-buchen` is emitted (and Pages already redirects slash-less folder URLs). Impact is small (WordPress already redirected `?p=` to the pretty URL and canonical tags carry the signal). Implement with a Pages Function or Worker only if GSC shows `?p=` URLs; otherwise delete the rows to avoid false confidence. The shortlink `rel` in the head will keep advertising `?p=` URLs; remove it (L1).
- **L3. Favicon.** `dist/blog/index.html:578-585`: two `<link rel="icon/shortcut icon">` to `/wp-content/themes/cosy-child/favicon.png` (404 on live, recorded in `exceptions.json` "broken on live", and absent from `dist/`), then `/wp-content/uploads/2026/02/favicon.png` declared as `apple-touch-icon` at 16x16, 57x57 and 72x72 and as `shortcut icon` three times. `public/favicon.ico` exists but is not linked. Google needs one stable icon in multiples of 48 px; fix with `<link rel="icon" href="/favicon.ico" sizes="48x48">`, one 180x180 `apple-touch-icon`, and drop the 404 links.
- **L4. Copy errors.** "Herzlich Wilkommen" (h1 of `/main-bike/`), "Informiere dich sich zum Thema", "Buche am besten einen Termin über unser Termintool", "weitern Ablauf", "Wo möchtest du einen Termin buchen." (period instead of question mark, h2 on `/termin-buchen/`), visible shortcode `[/vc_column][/vc_row]` on `/main-bike/`, English UI strings on brand pages ("Product Filter", "Show", "Price"). Visible typos in h1/h2 and mixed languages weaken quality signals.
- **L5. Host and case handling.** `/Marke/` has a capital M and Cloudflare Pages is case-sensitive, so `/marke/trek/` will 404; add lower-case redirect rows for the 7 brands. Configure at the Cloudflare zone: Always Use HTTPS, and a redirect from `www.bike-one.org` to the apex if a www record exists (nothing in the repo covers this); one hop each, no chain. Pages issues 308 for slash-less folder URLs, which Google treats like 301.
- **L6. Legal text, not SEO.** The Impressum (`capture/text/impressum.txt`) cites "§ 5 Telemediengesetz (TMG)", which was replaced by the Digitale-Dienste-Gesetz (DDG) in May 2024, and names only the Oldenburg address. Flag to the `legal-security-reviewer`; do not edit in the SEO pass.
- **L7. Build artefact.** `dist/.prerender/chunks/_.._C2WTwyXn.mjs` contains the string `cvires` (2 hits). Confirm `wrangler pages deploy dist` does not publish dot-folders, or remove it in a post-build step.

## 4. Redirect and canonical check (summary)

| Check | Result |
| --- | --- |
| Canonical present | 43 of 55; missing on 7 `/Marke/*`, 2 `/author/*`, `/category/allgemein/`, `/portfolio-category/branding-design/` and `/page/2/` |
| Canonical form | all `https://bike-one.org/...` with trailing slash; no http, www, or query variants |
| Canonical on staging | still points at bike-one.org (parity); harmless because staging is noindex, but a crawl of bike-one.dev reports cross-domain canonicals |
| Pagination | `/portfolio-category/branding-design/page/2/` has no canonical and no `rel=prev/next` (irrelevant once noindexed) |
| Redirect chains | none in `public/_redirects` (14 rules: 13 `200` feed rewrites, 1 `301` `/termin-buchen` to `/termin-buchen/`) |
| Feeds | `/feed/`, `/comments/feed/` and 11 per-archive feeds are served as rewrites to `index.xml`; the comments feed carries no entries; remove the `rel=alternate` feed links if feeds are dropped |
| 404 page | `Seite nicht gefunden – BikeOne GmbH`, `robots: noindex` (`src/pages/404.astro`) |

## 5. Keyword and content opportunities (estimates, no volume data)

Intent classes: I = informational, C = commercial investigation, T = transactional, N = navigational/local. All terms are semantic-pattern suggestions for a multi-brand dealer with two stores; confirm against GSC.

| Cluster | Target page | Example queries | Intent | Status |
| --- | --- | --- | --- | --- |
| Brand plus city, 7 brands | `/Marke/trek/`, `/specialized/`, `/cervelo/`, `/pinarello/`, `/ridley/`, `/wilier/`, `/factor/` | "Trek Händler Oldenburg", "Specialized Osnabrück", "Cervélo Händler" (also spell "Cervélo"), "Pinarello Fahrrad kaufen", "Wilier Händler Norddeutschland", "Factor Bikes Händler" | C/T/N | Pages exist; need h1, copy, canonical, local words, cross-links (M4) |
| Category | new page or shop collection | "Rennrad kaufen Oldenburg", "Gravelbike kaufen Osnabrück", "Zeitfahrrad / Triathlon Rad kaufen", "E-Bike Fachhändler Oldenburg" | C/T | `/racebikes/`, `/gravel-bikes/`, `/tt-triathlon/`, `/ebikes/` are empty; title words "RaceBikes/GravelBikes" do not match "Rennrad/Gravelbike"; shop-dependent |
| Service | new `/werkstatt/` (from `/main-bike/` copy) | "Fahrradwerkstatt Oldenburg", "Fahrrad Inspektion Osnabrück", "Fahrrad Reparatur Termin online" | T/N | content exists on `/main-bike/` only |
| Bike fitting | new `/bike-fitting/` | "Bike Fitting Oldenburg", "Bikefitting Osnabrück", "Sitzposition Rennrad lasergestützt" | C/T | home and `/main-bike/` text; no page |
| Dienstradleasing | new `/dienstradleasing/`, plus blog post | "Dienstradleasing Oldenburg", "JobRad Händler Osnabrück", "Dienstrad Leasing Rennrad", "Dienstrad Rechner" | C/T | partner logos on home with empty alt; blog post exists; "Beispielrechner" link on `/main-bike/` and brand pages |
| Canyon service partner | new `/canyon-service/` | "Canyon Collect & Ride Oldenburg", "Canyon Service Oldenburg" | N/T | text only on `/main-bike/`; avoid mixing the name with the shop's own Click & Collect |
| Click & Collect (shop feature) | page on shop or `/click-and-collect/` here | "Fahrrad online kaufen und im Laden abholen Oldenburg", "Click and Collect Fahrrad Osnabrück" | T | nothing on this site; waits for the shop's pickup flow and store stock; write the explainer page once the shop supports it |
| Informational | blog | "Fahrrad Leasing Vorteile Arbeitnehmer", "E-Bike oder Fahrrad", "wie oft Fahrradinspektion", "Fahrradsicherheit Stadtverkehr", "Fahrrad Ermüdung Sitzposition" | I | 5 posts exist; link them to the service pages |
| Careers | `/stellenangebote/` | "Zweiradmechaniker Meister Osnabrück", "Verkäufer Fahrrad Oldenburg" | N | page has 33 words and no JobPosting markup |

Gaps to fill with original assets (differentiators): a Dienstrad cost calculator (the site already links to a "Beispielrechner"), a Bike-Fitting process page with the measurement steps, a service price table, and a brand comparison table (Trek vs Specialized gravel/road lines).

### Ready head copy (proposal; counts are hand-counted, recheck in script)

| Path | Title (target under 60) | Description (target under 155) |
| --- | --- | --- |
| `/` | BikeOne: Rennrad, Gravel & E-Bike in Oldenburg & Osnabrück (~58) | Trek, Specialized, Cervelo, Pinarello, Ridley, Wilier & Factor: Beratung, Bike-Fitting, Dienstradleasing und Werkstatt in Oldenburg und Osnabrück. (~146) |
| `/termin-buchen/` | Termin buchen in Oldenburg & Osnabrück | BikeOne: Termin online buchen, in Oldenburg (Rheinstr. 16) oder Osnabrück (Lengericher Landstraße 30). Jetzt Standort und freien Termin wählen. |
| `/termin-buchen-oldenburg/` | Termin buchen in Oldenburg | Online-Termin bei BikeOne Oldenburg, Rheinstr. 16: Mo–Fr 10–18 Uhr, Sa 10–14 Uhr. Freien Termin wählen und direkt buchen. |
| `/termin-buchen-osnabrueck/` | Termin buchen in Osnabrück | Online-Termin bei BikeOne Osnabrück, Lengericher Landstraße 30: Di–Fr 10–18 Uhr, Sa 10–14 Uhr. Freien Termin wählen und direkt buchen. |
| `/ueber-uns/` | Über uns: Standorte & Öffnungszeiten | BikeOne in Oldenburg und Osnabrück: Adressen, Telefon, E-Mail und Öffnungszeiten beider Standorte. |
| `/Marke/trek/` (pattern) | Trek in Oldenburg & Osnabrück kaufen | Trek Rennräder, Gravelbikes und mehr bei BikeOne in Oldenburg und Osnabrück: Beratung, Bike-Fitting, Dienstradleasing und Service aus einer Hand. |
| `/blog/` | Blog: Fahrrad, Leasing, Service | Ratgeber von BikeOne: Dienstradleasing, E-Bike oder Rad, Fahrradservice und Sicherheit im Stadtverkehr. |
| Post: leasing | Fahrrad-Leasing: Vorteile, Ablauf, Ersparnis | Wie Fahrrad-Leasing für Arbeitnehmer und Arbeitgeber funktioniert, Schritt für Schritt, mit E-Bike-Leasing und häufigen Fragen. |
| Post: service | Fahrradservice: Wann er sich wirklich lohnt | Wann Inspektion und Wartung nötig sind, woran du einen guten Fahrradservice erkennst und wie oft du kommen solltest. |

Fix the brand name spelling decision first ("Cervelo" as written on the site versus the brand's own "Cervélo"); put "Cervélo" in body copy and alt text, since both are searched. Claims such as "E-Bike" in the home title require the client to confirm the assortment. Do not publish "bis zu 40 %" or monthly leasing prices in descriptions without the client's confirmation.

## 6. Structured data

### 6.1 LocalBusiness / BikeStore plus Organization (PROPOSAL, not applied)

Built only from facts in the repository. Sources: footer (`src/content/parts/footer.html`): addresses, phone numbers (`tel:+4944198489483`, `tel:+4954144095284`), e-mails (`OL@bike-one.de`, `OS@bike-one.de`), hours, tagline; `/ueber-uns/` text (Sunday closed; the Osnabrück week starts on Tuesday); Impressum (`info@bike-one.de`, legal form); `/Marke/*` (brand names); header logo path. Deliberately left out because the repository has no data for them: geo coordinates, `priceRange`, ratings, `sameAs` social profiles, store photos, region, payment methods, holiday hours. Add `geo` and `image` from the Google Business Profile once available. The logo URL is the 2x header file; confirm it is at least 112x112 px. `url` of both stores is `/ueber-uns/` because no dedicated store page exists; replace with `/standorte/oldenburg/` and `/standorte/osnabrueck/` if those are created. Place on `/` and `/ueber-uns/` (both stores); on each booking page keep only the matching store node. The visible text must match: footer currently shows "Lengericher Landstraße 30" and "Rheinstr. 16", which is what is used below (see M10).

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://bike-one.org/#organization",
      "name": "BikeOne",
      "legalName": "BikeOne GmbH",
      "url": "https://bike-one.org/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://bike-one.org/wp-content/uploads/2025/08/NoTextBikeOne-1.png"
      },
      "email": "info@bike-one.de",
      "description": "Erstklassige Bikes, Beratung & Service in Oldenburg & Osnabrück.",
      "brand": [
        { "@type": "Brand", "name": "Trek" },
        { "@type": "Brand", "name": "Specialized" },
        { "@type": "Brand", "name": "Cervelo" },
        { "@type": "Brand", "name": "Pinarello" },
        { "@type": "Brand", "name": "Ridley" },
        { "@type": "Brand", "name": "Wilier" },
        { "@type": "Brand", "name": "Factor" }
      ],
      "department": [
        { "@id": "https://bike-one.org/#store-oldenburg" },
        { "@id": "https://bike-one.org/#store-osnabrueck" }
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://bike-one.org/#website",
      "url": "https://bike-one.org/",
      "name": "BikeOne",
      "inLanguage": "de-DE",
      "publisher": { "@id": "https://bike-one.org/#organization" }
    },
    {
      "@type": "BikeStore",
      "@id": "https://bike-one.org/#store-oldenburg",
      "name": "BikeOne GmbH Oldenburg",
      "url": "https://bike-one.org/ueber-uns/",
      "parentOrganization": { "@id": "https://bike-one.org/#organization" },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Rheinstr. 16",
        "postalCode": "26135",
        "addressLocality": "Oldenburg",
        "addressCountry": "DE"
      },
      "telephone": "+4944198489483",
      "email": "OL@bike-one.de",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "10:00",
          "closes": "18:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Saturday",
          "opens": "10:00",
          "closes": "14:00"
        }
      ]
    },
    {
      "@type": "BikeStore",
      "@id": "https://bike-one.org/#store-osnabrueck",
      "name": "BikeOne GmbH Osnabrück",
      "url": "https://bike-one.org/ueber-uns/",
      "parentOrganization": { "@id": "https://bike-one.org/#organization" },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Lengericher Landstraße 30",
        "postalCode": "49078",
        "addressLocality": "Osnabrück",
        "addressCountry": "DE"
      },
      "telephone": "+4954144095284",
      "email": "OS@bike-one.de",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "10:00",
          "closes": "18:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Saturday",
          "opens": "10:00",
          "closes": "14:00"
        }
      ]
    }
  ]
}
```

Notes: the Organization `email` is `info@bike-one.de` from the Impressum; the store e-mails are the footer ones. The VAT id and register number are in the Impressum; add `vatID` only if the client wants it machine-readable. Validate with the Rich Results Test and the Schema Markup Validator after the first release build (not possible here: no network).

### 6.2 Article plus BreadcrumbList for the blog posts (PROPOSAL, example for the leasing post)

Dates from `capture/wp-rest/posts.json` and the visible `<time>`; headline is the current h1 (about 100 characters, under the 110 recommended; the E-Bike post's h1 is longer and should be shortened first). `author` is the Organization because the WordPress author has no name (client decision, see M3). No `image`: the posts have no featured image; add one before expecting Article rich results.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://bike-one.org/fahrrad-leasing-die-smarte-alternative-zum-autopendeln-und-warum-es-sich-jetzt-mehr-denn-je-lohnt/#article",
      "mainEntityOfPage": "https://bike-one.org/fahrrad-leasing-die-smarte-alternative-zum-autopendeln-und-warum-es-sich-jetzt-mehr-denn-je-lohnt/",
      "headline": "Fahrrad-Leasing: Die smarte Alternative zum Autopendeln – und warum es sich jetzt mehr denn je lohnt",
      "datePublished": "2025-10-17T01:25:05+02:00",
      "dateModified": "2025-10-17T01:25:10+02:00",
      "inLanguage": "de-DE",
      "author": { "@id": "https://bike-one.org/#organization" },
      "publisher": { "@id": "https://bike-one.org/#organization" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "BikeOne", "item": "https://bike-one.org/" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://bike-one.org/blog/" },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Fahrrad-Leasing: Die smarte Alternative zum Autopendeln",
          "item": "https://bike-one.org/fahrrad-leasing-die-smarte-alternative-zum-autopendeln-und-warum-es-sich-jetzt-mehr-denn-je-lohnt/"
        }
      ]
    }
  ]
}
```

Date source for the other four posts (`datePublished` / `dateModified`): sicherheit 2025-10-17T01:23:10 / 01:23:13; wann-sich-ein-professioneller-fahrradservice 01:16:10 / 01:16:14; e-bike-oder-klassisches-rad 01:07:52 / 01:07:56; so-erkennst-du 01:06:57 / 01:07:01 (all +02:00, from `posts.json`). Breadcrumbs for the other pages: Home > Marken > brand; Home > Termin buchen > store. Only add BreadcrumbList where a visible breadcrumb or logical hierarchy exists; the theme currently renders none.

## 7. Launch-build checklist (SEO items on top of `docs/LAUNCH.md`)

1. `PUBLIC_INDEXABLE=true npm run build`; confirm in `dist/`: no `noindex` meta on indexable pages, `robots.txt` equals `capture/robots.txt`, `Sitemap:` line correct, nav Shop link is `https://shop.bike-one.org/` (no `bike-one.dev` string anywhere in `dist/`).
2. Demo/archive pages from H2, H4, H8, M5 are noindex and absent from every sitemap file; no sitemap URL redirects or 404s.
3. `grep -r "cvires" dist/ --include=*.html` returns nothing; `grep -r "/product/" dist/ --include=*.html` returns nothing (or only shop URLs).
4. `/VidOne.mp4` (or its replacement) and a sample of `/wp-content/uploads/...` URLs answer 200 on the production origin.
5. Redirect map for old product, category, shop URLs live (needs the shop); lower-case `/marke/*`; `https` and `www` rules in Cloudflare.
6. Search Console and Bing verified, sitemap submitted, URL Inspection run on `/`, `/termin-buchen/`, one brand page, one post.
7. Rich Results Test on `/` (LocalBusiness) and one post (Article, breadcrumbs).
8. PageSpeed Insights on `/`, one brand page and one post (mobile); record LCP, INP, CLS as the baseline.

## 8. Data and decisions needed

- GSC export (queries, pages, countries, devices, last 16 months) and any Ahrefs/Semrush backlink export, to prioritise redirects, brand pages and keywords with real numbers.
- Client decisions: delete versus noindex demo pages (H2); keep or retire `/main-bike/` (H4); post author (M3); which brand pages live here versus in the shop (M4); whether e-bikes are in the assortment (title copy); confirmation that `bikeone.cvires.at` is the former dev host (H5); partner-logo names (M7).
- Shop team (shop.bike-one.org): stable product and collection handles for the redirect map (C1), own `robots.txt`, sitemap and canonicals on the shop host, a Click & Collect explainer and store pages with the same NAP and Product/Offer markup, and shared brand naming ("Cervelo" or "Cervélo").
