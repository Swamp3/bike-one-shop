# Launch: BikeOne

The site is static: `npm run build` writes `dist/`, Cloudflare Pages serves it. Every command runs from the repository root. What is still
open before launch (accounts, legal sign-off, DNS) is listed in [`TODO.md`](TODO.md); this file is the procedure.

## Cloudflare Pages project

| Setting | Value |
| --- | --- |
| Framework preset | none (Astro, static output) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 22 (`NODE_VERSION=22.23.4`, same as `.nvmrc`) |
| Production branch | `main` (the redesign is on `astro-rebuild` until the owner merges it) |
| Environment variables | `SITE_ORIGIN` (optional, default `https://bike-one.dev`); `PUBLIC_INDEXABLE=true` only for the launch build, see below |

- `npm run build` runs `astro build` and then writes `dist/_redirects`, the sitemap (release build only) and the origin safety net.
- `public/_headers` is copied to `dist/_headers` and applies security headers, the CSP (no third party; `frame-src` only the three embed hosts)
  and `X-Robots-Tag: noindex` for `https://bike-one.dev/*` and `https://*.pages.dev/*`. Whether Pages applies them as written is not verified
  yet (`TODO.md`, Hosting): check the response headers of the first deployment.
- `dist/_redirects` holds 141 rules (23 dynamic; the Pages limits are 2000 static and 100 dynamic): the old URLs, each in one hop to a built
  page or to the shop. It is generated from `docs/old-urls.json`, `tools/redirect-map.mjs` and `redirects.csv`; never edit it by hand.

## Domains and DNS

- Development: custom domain `bike-one.dev` on the Pages project (Cloudflare adds the DNS record when the domain is in the same account).
  Every build is `noindex` and `robots.txt` disallows everything. Never set `PUBLIC_INDEXABLE` for it.
- The shop is separate: `shop.bike-one.dev` in development, `shop.bike-one.org` in production (`SHOP_URL`, a dev build links to the dev shop).
- Launch: add `bike-one.org` as the custom domain of the Pages project and point DNS at it (the records Pages shows); decide where `www` goes
  (a redirect to the apex is the usual choice). Keep the record of `shop` untouched.
- `Strict-Transport-Security` is a zone setting (SSL/TLS, Edge Certificates), not a `_headers` rule; `includeSubDomains` also covers the shop.

## The launch build

1. `PUBLIC_INDEXABLE=true npm run build`: canonical, Open Graph, JSON-LD, sitemap and feed name `https://bike-one.org`, the shop link and the
   `_redirects` targets name `shop.bike-one.org`, pages are indexable, `robots.txt` allows and names `https://bike-one.org/sitemap-index.xml`.
2. `PUBLIC_INDEXABLE=true npm run verify:release` (review server running) must pass.
3. Set `PUBLIC_INDEXABLE=true` as a production-only build variable of the Pages project (not for previews), or deploy the local build:
   `npx wrangler pages deploy dist --branch main`. Previews and `bike-one.dev` are built with a plain `npm run build`.
4. Create the 20 Single Redirects of the `?p=` shortlinks from `cloudflare-query-redirects.csv` (Rules, Redirect Rules; one rule per row,
   a rule on `http.request.uri.query`, 301): `_redirects` cannot match a query string.
5. Search Console: add the property, submit `https://bike-one.org/sitemap-index.xml`, watch Coverage for the old URLs (the list is
   `docs/old-urls.json`; an export of the queries and pages before the switch shows whether a URL is missing).
6. Keep the old host running, untouched, until the 30-day watch is done.

## After launch

- Day 1: open every row of `docs/old-urls.json` against `https://bike-one.org` (status and `Location`), check the 404 log for missed URLs and add
  them to `tools/redirect-map.mjs`, then `npm run redirects:build`, `npm run build`, `npm run verify` and redeploy.
- Day 7 and 30: Search Console coverage and crawl errors; compare organic traffic with the period before.

## Rollback

- Pages keeps every deployment: in the dashboard (Deployments) promote the previous one, or `npx wrangler pages deployment list` and redeploy.
- A bad redirect row: fix `tools/redirect-map.mjs`, `npm run redirects:build`, rebuild, deploy.
- Launch itself: point the DNS record back at the old host (it is untouched, see step 6).

## Restoring the old pages, the capture and the baseline

The old site's markup, the crawl (`capture/`), the parity baseline (`baseline/`), the old scripts and the media plan were deleted from the tree in
commit `923ee48` ("refactor: delete the WordPress sources, the capture and the parity pipeline"); the commit before it, `3b4f544`, still has them.
Restore a folder without touching the rest:

    git checkout 3b4f544 -- capture baseline        # or: scripts src/content/pages tools/extract.mjs ...
    git rm -r --cached capture baseline             # when it should stay untracked

The hero film is back in the tree since decision d83 (`docs/hero-video.md`); to take it out again, revert the commit named there. The 1.1 GB of
original uploads were never committed; on the machine of the conversion they are in `.conversion/media-cache/` (git-ignored).
