# BikeOne

The static Astro site of BikeOne (bike retailer with stores in Oldenburg and Osnabrück). Native Astro, self-hosted fonts, no request to a
third party while a page renders; hosted on Cloudflare Pages. Working rules: `AGENTS.md`. What is open: [`docs/TODO.md`](docs/TODO.md).

Requires Node 22.23.4 or newer (`nvm use`), then `npm install`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Static build into `dist/`, with `dist/_redirects` and, in the release build, the sitemap. Unless `PUBLIC_INDEXABLE=true` it is a `noindex` build for `SITE_ORIGIN` (default `https://bike-one.dev`) |
| `npm run preview` | Serve `dist/` with Astro's preview server |
| `npm run review:serve` | Serve `dist/` on :4321 with `_redirects` applied (the browser checks need it: `node scripts/review-serve.mjs --background`) |
| `npm test` | Unit tests under `test/` (needs a build for the page tests) |
| `npm run verify` | The ten checks `redirects`, `links`, `seo`, `wp`, `headers`, `size`, `a11y`, `ui`, `net`, `embeds` on `dist/` (about 3 minutes); each runs alone as `npm run <name>` |
| `npm run verify:release` | The same checks for the indexable launch build (`PUBLIC_INDEXABLE=true npm run build` first) |
| `npm run perf` | LCP, CLS, requests and bytes per page from the review server (`--throttle fast4g\|slow4g`, `--browsers chrome,webkit`) |
| `npm run screens` | Full-page screenshots of every page at 390, 768 and 1440 px into `review/` (git-ignored) |
| `npm run redirects:build` | Regenerate `redirects.csv` and `cloudflare-query-redirects.csv` from `tools/redirect-map.mjs` and `docs/old-urls.json` |

Docs: [`docs/redesign.md`](docs/redesign.md) (IA, design, structure), [`docs/plan.md`](docs/plan.md) (how it is built, decision ledger),
[`docs/third-party.md`](docs/third-party.md), [`docs/LAUNCH.md`](docs/LAUNCH.md), [`docs/TODO.md`](docs/TODO.md).
