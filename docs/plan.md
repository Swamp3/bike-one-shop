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
