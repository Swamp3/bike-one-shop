# Conversion plan: BikeOne

Live site: https://bike-one.org. Host: cloudflare. Started 2026-11-25.

## Templates found

| Template | Body class or marker | Example URL | Pages |
| --- | --- | --- | --- |
| template-1 |  | /portfolio/portfolio-name-3/ | 15 |
| page |  | /ebikes/ | 10 |
| archive |  | /Marke/factor/ | 9 |
| template-2 |  | /team-member/charlotte-neal/ | 7 |
| single-post |  | /fahrrad-leasing-die-smarte-alternative-zum-autopendeln-und-warum-es-sich-jetzt-mehr-denn-je-lohnt/ | 5 |
| page-3 |  | /termin-buchen/ | 4 |
| archive-3 |  | /portfolio-category/branding-design/ | 2 |
| archive-2 |  | /author/marvin/ | 1 |
| home |  | / | 1 |
| page-2 |  | /datenschutz/ | 1 |

## Counts

| What | Count |
| --- | --- |
| URLs in the inventory | 55 |
| Indexable pages | 55 |
| Noindex pages | 0 |
| Media files (total size) | 2009 (1156.7 MB) |
| Unreferenced sizes (listed, not downloaded) | 4108 |
| Redirects | 43 |

## Media decision

live-temporary: 2009 files, 1156.7 MB (limit 300 MB), 5 files over 25 MB. R2 is the target store; no credentials yet, so staging serves /wp-content/uploads/ from bike-one.org. Must be moved to R2 before DNS moves. 4108 unreferenced sizes listed, not downloaded; pass --sizes all to the capture if old links may use them.

## Redirects source

The crawl (43 redirects) plus the Wayback pass (0 archived paths). No server export.

## Forms plan

Forms: none to rewire. The only POST forms are WooCommerce add-to-cart on `/`; they stay as captured and stop working.

| Form | Page | Fields | New endpoint | Tested |
| --- | --- | --- | --- | --- |

Forms kept as is (POST forms that already post to another site, left exactly as captured):

| Page | Action host |
| --- | --- |

## Analytics carry-over

None found in capture/scripts.json.

## Out of scope

- WooCommerce (shop, cart, checkout, account, wishlist, product and brand pages): the new shop in this repository replaces it. Kept pages that show product markup keep it as captured.
- etermin.net booking iframes and Google Maps iframes are third-party embeds, kept as is.
- Lighthouse not installed: performance checks are Not covered.

## Decisions

One row per decision, in the order taken; `state.mjs decision` prints the id. The default choice
is always "reproduce live".

| Id | Date | Topic | Choice | Default | Reason | Cost if wrong |
| --- | --- | --- | --- | --- | --- | --- |
| d1 | 2026-11-25 | repository | website/ is built as a standalone git repo (kit needs its own main + astro-rebuild), hidden from the parent via .git/info/exclude, then merged into bike-one-shop with history under website/ | new private repo | user: use the repo we are in, website and shop combine; init-site always runs git init and commits to main | low: the merge is a read-tree at the end |
| d2 | 2026-11-25 | WooCommerce | out of scope: shop, product, category, brand, cart, checkout, account, wishlist paths excluded from capture | reproduce live | user: ignore woocommerce, the new shop is this repo | medium: excluded pages need a link or redirect to the new shop |
| d3 | 2026-11-25 | hosting and staging domain | Cloudflare Pages; development on bike-one.dev, always noindex (PUBLIC_INDEXABLE unset) | Vercel, public noindexed staging | user: domain registered at Cloudflare; bike-one.dev must not be indexed | low |
| d4 | 2026-11-25 | excluded paths | woo default and German slugs: /shop/ /product/ /product-category/ /product-brand/ /brand/ /cart/ /checkout/ /my-account/ /wishlist/ /produkt/ /produkt-kategorie/ /warenkorb/ /kasse/ /mein-konto/ /wunschliste/ | none | real slugs unknown before capture; adjust with --resume --exclude | low |
| d5 | 2026-11-25 | URL form | trailing slash always (54 of 54 pages) | majority form | capture | none |
| d6 | 2026-11-25 | media | live-temporary: 2009 files, 1156.7 MB, 5 over 25 MB (largest 91.9 MB mp4); R2 mode needed, no R2 credentials; staging serves /wp-content/uploads/ from bike-one.org. 4108 unreferenced WordPress sizes listed, not downloaded | store (r2) | over 300 MB limit; no store credentials | high if forgotten: bike-one.org is replaced at launch, so images break. Must move to R2 before DNS |
| d7 | 2026-11-25 | templates | 10 templates from 55 pages as clustered (template-1 15 portfolio demo, page 10, archive 9 brands, template-2 7 team demo, single-post 5, page-3 4, archive-3 2, archive-2 1, home 1, page-2 1) | as clustered | capture/templates.json | low |
| d8 | 2026-11-25 | portfolio and team-member pages | reproduce live (theme demo content: portfolio-name-N, member-0N, branding-design) | reproduce live | parity; removal is a proposal | none for launch |
| d9 | 2026-11-25 | missing h1 | reproduce live: 27 pages have no h1 (home, brands, categories, legal, booking, about) | reproduce live | parity; fix is a proposal | SEO stays as today |
| d10 | 2026-11-25 | forms | none to rewire: the only POST forms are WooCommerce add-to-cart on /, GET search on /Marke/*; markup reproduced, cart no longer works | formspree | inventory.json forms | none |
| d11 | 2026-11-25 | WooCommerce links on kept pages | home and category pages still show product markup and links into excluded /produkt/ paths; reproduced as is, add-to-cart stops working | reproduce live | user: ignore woocommerce | medium: dead product links on staging until the new shop takes those paths |
| d12 | 2026-11-25 | embeds | keep etermin.net booking iframes (/termin-buchen-oldenburg/, -osnabrueck/) and Google Maps iframes (/termin-buchen/) | reproduce live | third-party embeds | low |
| d13 | 2026-11-25 | third-party scripts | none found in capture/scripts.json | keep all | capture | none |
| d14 | 2026-11-25 | lighthouse | skipped, not installed | skip | never install unasked | suggestions list performance as Not covered |
| d26 | 2026-11-25 | hero video | VidOne.mp4 (27,844,858 bytes, HEVC hvc1, no audio) served from this site as /VidOne.mp4 (public/VidOne.mp4); tools/extract.mjs rewrites data-mp4/webm/ogv from the live origin to root-relative; routes gate gets `--allow-extra /VidOne.mp4` baked into the verify scripts in package.json; supersedes the absolute live URL in d25 | reproduce live | the file lives only on the live host, downloaded once with the owner's consent; not in the baseline, so it is an extra built file | high for hosting: 26.55 MiB is over the 25 MiB Cloudflare Pages limit, `wrangler pages deploy` fails until it is shrunk or served from R2; HEVC does not play in Firefox or Chromium without HEVC |
| d27 | 2026-11-25 | no links to the live site | tools/extract.mjs makes same-origin URLs root-relative in a/area href, form action, link rel=alternate (feeds), data-* attributes (also WooCommerce variation JSON), inline script config (plain, JSON-escaped and URL-encoded) and <template> contents (the extractor did not enter template.content, which is why the wc-placeholder img stayed absolute); links to WooCommerce paths (/product/, /product-category/, /shop/, /cart/, /checkout/, /my-account/, /wishlist/) stay as paths, no shop URL invented; the redirect map for shop.bike-one.org is in .working-files/bike-one-links/notes.md | reproduce live (absolute links) | owner report: the rebuild still links to bike-one.org; the links gate counts both forms as internal | low: a script that compared an absolute origin would break; the console probe on 5 pages at 2 widths shows no new message |
| d28 | 2026-11-25 | WordPress head links dropped | tools/extract.mjs removes link rel=https://api.w.org/, EditURI, pingback, shortlink and rel=alternate links to wp-json (oEmbed, REST) from every page; the 284 WordPress API link records are gone from exceptions.json and npm run links:exceptions passes --skip-api so it does not add them back | keep the captured head links (d19 exceptions) | owner report; a static site has no xmlrpc.php, wp-json or short URL endpoints | low: no oEmbed discovery, no pingbacks; shortlink ?p= URLs still redirect through redirects.csv |
| d29 | 2026-11-25 | dev builds name the dev origin | postbuild step tools/dev-origin.mjs: unless PUBLIC_INDEXABLE=true it rewrites every form of https://bike-one.org (http, //, www, JSON-escaped, URL-encoded) in the text files of dist (html xml txt json xsl js css, _redirects, _headers; not wp-content/uploads) to SITE_ORIGIN, default https://bike-one.dev; the release build is untouched; npm run verify goes through tools/verify.mjs, which gives the gates --origin SITE_ORIGIN on a dev build and nothing on the release build | every build names https://bike-one.org | owner: the test deployment on bike-one.dev must not reference bike-one.org; canonical, sitemaps and feeds cannot be root-relative | low: an npx astro build without npm run build skips the step; set SITE_ORIGIN for another test host |
| d30 | 2026-11-25 | build origin from the environment | astro.config.mjs sets `site` to https://bike-one.org in the release build (PUBLIC_INDEXABLE=true), else SITE_ORIGIN or https://bike-one.dev; canonical, Open Graph and JSON-LD URLs come from it; tools/dev-origin.mjs stays as a safety net | site fixed to bike-one.org and rewritten after the build (d29) | native components build absolute URLs; the origin should be right at build time, not patched afterwards | low: a build without PUBLIC_INDEXABLE names bike-one.dev, which is the intended dev behaviour |
| d31 | 2026-11-25 | no inline styles or scripts, no data: assets | build.inlineStylesheets never and vite assetsInlineLimit 0: every native page links its CSS and JS as files; no style attributes in native components | Astro inlines small CSS and scripts | lets the CSP stay default-src self without unsafe-inline | low: one more request per page, cached immutable under /_astro/ |
| d32 | 2026-11-25 | explicit shrinking allowlist of pages still on the old route | tools/legacy.mjs lists the 51 paths (plus /404.html) that src/pages/[...path].astro still builds from captured markup, the dist prefixes and src paths only they use; the new checks skip exactly these; migrated pages leave the list; Stage 2 empties it. Layouts and components of the old route moved to src/layouts/legacy and src/components/legacy | all pages stay on the old route until every page is migrated | the build must not break between stages and the checks must not hide new problems | low: an entry that is still listed after its page is native is reported as stale by the checks |
| d33 | 2026-11-25 | native home, Ueber uns, Impressum, Datenschutz | src/pages/index.astro, ueber-uns.astro and [legal].astro build the four pages from tokens, Base/Header/Footer/SEO and the content collections; home has a poster-only hero (no video, no slider), the two stores, the five service texts from the captured home page, the seven brand names as text, the three newest posts; product tiles, partner logos and the WooCommerce markup are dropped | IA table of the plan (hero, stores, services teaser, brands, latest posts) | vertical slice that proves the pipeline; text is copied from capture/text/home.txt and ueber-uns.txt | low: Stage 2 adds the video helper and the service page; partner logos need confirmed alt texts and are not on the new home page |
| d34 | 2026-11-25 | content collections | src/content.config.ts defines stores (json, two entries with address, phone, e-mail, hours), brands (json, seven names), legal (Markdown, Impressum and Datenschutz text from the capture) and blog (front matter only for the five posts: title, dates, excerpt from capture/wp-rest/posts.json; bodies and pages follow in Stage 2) | collections for blog, stores, brands | one typed source for the footer, the home page, the store cards and the JSON-LD | low |
| d35 | 2026-11-25 | design basis: shop wireframe tokens | src/styles/tokens.css takes the shop wireframes language (accent #e63946, header #121212, surfaces #f8f9fa, ink #212529, line #dee2e6), mobile first, light surfaces with dark header, footer and hero; --accent-strong #c92a37 for buttons and text because #e63946 is 4.2:1 on white; no dark colour scheme yet | plan assumption: reuse the shop wireframe tokens | site and shop look like one brand; WCAG AA text contrast | medium: a different direction means new tokens and component CSS, the markup stays |
| d36 | 2026-11-25 | fonts via @fontsource | owner decision: @fontsource/roboto 5.3.0 (400, 700) and @fontsource/roboto-condensed 5.3.0 (700), dev dependencies pinned exactly; hand-written @font-face in src/styles/fonts.css points at the packages woff2 files (latin and latin-ext with unicode-range, font-display swap) so Vite emits them under /_astro/; the Roboto Condensed 700 latin file is the one preload; no request to googleapis or gstatic | hand-extract woff2 from capture/assets (plan) | owner: install the fonts locally with npm; per-weight CSS of the packages adds a woff fallback and has no unicode-range | low: three small packages, only the woff2 files end up in dist |
| d37 | 2026-11-25 | store address spelling on new pages | Rheinstraße 16 and Lengericher Landstraße 30 in the footer, store cards and JSON-LD (the capture mixes Rheinstr./Rheinstrasse and Landstr./Landstraße); the legal texts keep their own spelling word for word | as captured | seo-review M10: one NAP spelling | low |
| d38 | 2026-11-25 | legal pages rendered from Markdown, text unchanged | src/content/legal/impressum.md and datenschutz.md hold the captured words; only structure changed: title as h1, section titles as h2, bullets as lists, manual line wraps inside sentences joined with a space, address blocks keep their line breaks; the private-use bullet glyph is dropped; known text defects (TMG, ZugriƯ, IPAdresse, URL cut by a line break) are not touched and are listed in notes-stage1.md | WordPress markup moved as captured | plan: legal text verbatim; native Astro without set:html of captured markup | low: test/legal-verbatim.test.mjs compares the rendered words with capture/text |
| d39 | 2026-11-25 | menu without JavaScript | the header menu is a popover (button with popovertarget on narrow screens, always visible from 48rem by author CSS), Shop item links to SHOP_URL (d23) | details or a script | plan: prefer native features; keyboard operable, closes on Escape and outside click | low: popover is baseline since 2024, older browsers show no menu button action |
| d40 | 2026-11-25 | click-to-load embeds | src/components/Embed.astro: the iframe sits in a template and is inserted on a click (about 15 lines of script, delegated listener); text names the provider and the IP transfer; the map on Ueber uns uses the key-free https://www.google.com/maps?q=...&output=embed form instead of the captured keyed URL | keyed Google embed as captured | no third-party request before consent by click; the captured API key does not belong in the repository | medium: the key-free embed URL could not be tested offline; the German consent wording is for legal review |
| d41 | 2026-11-25 | checks replace the parity gates | npm run verify runs tools/checks/{redirects,links,seo,wp,size,a11y,net}.mjs on dist/ (tools/verify.mjs); native pages are checked in full, pages and files on the tools/legacy.mjs allowlist are skipped, a stale allowlist entry fails; the kit gates under scripts/verify stay as npm run verify:legacy until Stage 4; net runs Chrome and WebKit at 1440 and 390 against the review server and applies the CSP from dist/_headers | kit parity gates against baseline/ | owner: redesign, not parity; the gates compare against the live site and fail by design | low: each check is a small script over dist/, no dependency added |
| d42 | 2026-11-25 | redirect map and generator | tools/redirect-map.mjs holds the IA redirect rows as data, tools/redirects-build.mjs writes redirects.csv (token {SHOP_URL}) and cloudflare-query-redirects.csv (production shop) and, after astro build, dist/_redirects for the dev or production shop; a row exists only for a URL without a page (pages on tools/legacy.mjs wait), shortlink rows are re-pointed at their final destination; public/_redirects is no longer committed; in Stage 1 the rows cover the shop prefixes (46 known product, category and shop URLs, 15 prefix rules) and the old WordPress sitemap names | hand-kept redirects.csv through scripts/build-redirects.mjs | the shop target differs between dev and production builds and the map must apply itself as pages leave the old route | low: Stage 2 shrinks the allowlist and reruns npm run redirects:build |
| d43 | 2026-11-25 | native robots.txt and sitemap | robots.txt: dev Disallow all, release Allow plus a Sitemap line; tools/sitemap-build.mjs (postbuild) lists exactly the indexable native pages in sitemap-0.xml and sitemap-index.xml, release build only (a dev build is noindex and has no sitemap); the old wp-sitemap files stay until Stage 2 redirects them | captured robots.txt and WordPress sitemaps | plan: native sitemap and robots, dev Disallow all, release Allow plus sitemap | low: pages on the old route are not in the sitemap until they are migrated |
| d44 | 2026-11-25 | Content-Security-Policy for the native pages | public/_headers: Permissions-Policy (camera, microphone, geolocation off) for every path; a CSP with default-src self, script-src self, style-src self, img-src self data:, font-src self, media-src self, frame-src only the three embed hosts (etermin.net, google.com/maps, bike-leasing-calculator.jobrad.org), object-src none, form-action self, frame-ancestors self, for the four native paths only | no CSP | plan: CSP without third parties; the pages still on the old route use inline scripts and would break, so the rule is per native path until Stage 2 turns it into /* | low: the net check applies the same header in Playwright and fails on any violation |
| d45 | 2026-11-25 | head texts of the four pages | titles 30 to 60 characters and descriptions 70 to 160, unique, written from each page own captured text, German; home h1 is the captured footer tagline without its full stop; no E-Bike or Rennrad claim in the home title (seo-review H1 asks the client to confirm the assortment); JSON-LD graph (Organization, WebSite, two BikeStore nodes) on home and Ueber uns, BreadcrumbList with a visible breadcrumb on inner pages, no geo, rating, price range or sameAs | seo-review proposals | plan: SEO section; facts only from the capture | low: copy to be reviewed in Stage 3 |
