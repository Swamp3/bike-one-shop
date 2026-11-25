# BikeOne

Static Astro site of BikeOne, being rebuilt as native Astro (no WordPress markup, no third-party requests); see `AGENTS.md`.
Scaffolded with astro-conversion-kit on 2026-11-25; hosted on Cloudflare Pages.

Requires Node 22.23.4 or newer (`nvm use`), then `npm install`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Static build into `dist/`; unless `PUBLIC_INDEXABLE=true` the postbuild step names `SITE_ORIGIN` (default `https://bike-one.dev`) instead of `https://bike-one.org` in `dist/` (d29) |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Unit tests under `test/` |
| `npm run baseline` | Build `baseline/` from `capture/` |
| `npm run links:exceptions` | Add the broken-on-live link exceptions (no WordPress API records, d28) to `exceptions.json` |
| `npm run assets:copy` | Old pipeline (writes WordPress files into `public/`, which is no longer published from there; do not run, removed in Stage 4) |
| `npm run verify` | The checks `redirects`, `links`, `seo`, `wp`, `size`, `a11y`, `net` on `dist/` (needs the review server on :4321); each runs alone as `npm run <name>` |
| `npm run verify:release` | The same checks for the indexable launch build (`PUBLIC_INDEXABLE=true`) |
| `npm run verify:legacy` | The old parity gates against `baseline/` (fail by design, removed in Stage 4) |
| `npm run redirects:build` | Regenerate `redirects.csv` and `cloudflare-query-redirects.csv` from `tools/redirect-map.mjs` (`npm run build` writes `dist/_redirects`) |
| `npm run verify:live` | Check the live host after launch |
| `npm run review:shoot` | Screenshot live and local pages at 390, 768 and 1440 px |
| `npm run review:diff` | Pixel diff of the screenshots |
| `npm run review:styles` | Computed-style comparison |
| `npm run review:sheet` | Contact sheet of the review |
| `npm run review:check` | Re-reads every diff and style result; exits 1 if any row fails |
| `npm run review:serve` | Serve `dist/` with vercel.json applied, for the visual review |

See `AGENTS.md` for the working rules and `docs/LAUNCH.md` for launch steps.
