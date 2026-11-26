# Stage 4 notes: poster-only hero, WordPress deleted, docs, TODO

Work in `website/`, branch `astro-rebuild`, head `b7f1105`, nothing pushed. Decisions d71 to d76 (`website/docs/plan.md`, `.conversion/state.json`).

## Third-party requests

None caused by this stage. Every browser run (`net`, `ui`, `embeds`, `screens`) went against the review server on :4321; `embeds` aborts every non-local request and fails if one is not aborted (route order fixed in Stage 3, untouched). Nothing contacted bike-one.org or an embed host.

## Commits (on top of 17c437a)

| Hash | Subject |
|---|---|
| b18f0c3 | refactor: freeze the old-URL list in docs/old-urls.json and read it in the generator and the redirects check |
| 9ad7292 | perf: the home hero is the poster photo only, no video |
| 4cd6d4c | fix: spell the brand Cervélo (with é) in the brand list, the structured data and the tests |
| b53bc71 | refactor: delete the WordPress sources, the capture and the parity pipeline |
| efb5764 | chore: drop the PROPOSALS switch, nothing reads it any more |
| 8b50407 | docs: TODO.md, the owner's list of open items |
| b7f1105 | docs: rewrite README, AGENTS, CLAUDE, plan, third-party and LAUNCH for the native site, add redesign.md, decisions d71 to d76 |

Gates (`npm run build`, `npm run verify`, `npm test`) ran fully on b18f0c3, 9ad7292, 4cd6d4c, b53bc71 and efb5764. The two docs commits only touch Markdown and `.conversion/state.json`/`docs/plan.md` (no check reads them; the one comment edit in `tools/dev-origin.mjs` is in b7f1105), and the final dev and release runs below are on that head.

## A. Old-URL list frozen (d72)

`docs/old-urls.json`: 131 paths (path, old status, kind, where found, fate `built`/`redirect`, target, hops), generated once from `baseline/routes.json` and `capture/sitemaps/` by a throwaway script (not kept; uploads under `/wp-content/` were never content URLs and are not listed). `tools/redirects-build.mjs` (`oldUrls()`) and the `redirects` check read it; the check now also fails when a row disagrees with `tools/redirect-map.mjs`. `cmp` proved `redirects.csv`, `cloudflare-query-redirects.csv`, `dist/_redirects` (dev) and `dist/_redirects` (release) byte-identical before and after.

## Hero poster only (d71, d75)

- Removed `HeroVideo.astro`, `public/hero.mp4`; `index.astro` no longer imports it. Encoded file kept at `website/.local/hero.mp4` (18,532,324 bytes, identical by `cmp`; `.local/` git-ignored, exists only on this machine). HEVC original still at `website/.conversion/video-download/VidOne.mp4` (git-ignored).
- `size`: no video or audio file in `dist/`, no `<video>`/`<audio>`/`<source>` outside `<picture>` on any page (proved red with a stray `dist/x.mp4`). `net`: any video/audio request or media resource type fails; the hero, reduced-motion and connection-policy blocks are gone. `ui`: pause-button, video-frame and reduced-motion-playback assertions removed; the text-on-photo pixel measurement of the poster stays and passes: home h1 9.00:1 (need 3), eyebrow 5.47:1 (need 4.5), ghost button 17.69:1 at 1440; 12.54, 10.18, 17.06 at 390; Ueber uns banner 10.15 and 11.51. The shade is unchanged and still reaches contrast; the eyebrow at 1440 has the smallest margin (5.47 against 4.5).
- Home transfer at 1440: 15 requests, 246 KB (was 17 requests, 18,347 KB); at 390: 13 requests, 136 KB (was 139 KB). `dist/`: 12.2 MB (30.7 MB before).
- `docs/TODO.md` (Hero video) names the restore commits (7858e4c, 5103883, removal 9ad7292), the file location and the conditions for a return (measure LCP and transfer, 540p, `(pointer: fine)`, Save-Data, lazy start after load). The CSP `media-src 'self'` and `tools/mp4-info.mjs` stay for that day.

## Brand spelling (d73)

`src/content/brands.json` name is `Cervélo`; the home brand list and the Organization JSON-LD follow (id/slug `cervelo` stays ASCII). No other live source text spelled the brand (no captured body text did), no alt text or logo carries it. `test/seo-data.test.mjs` compares the JSON-LD brands with the collection and asserts the é on the home page and in the JSON-LD.

## B. Deleted (d74, commit b53bc71)

Tracked files 937 to 102 (about 96 files of that are code and content that remain).
- Sources: `legacy-public/` (also removed from disk, 1.1 GB of untracked uploads: a copy of `.conversion/media-cache`, which has 2009 files against 1934 there), `src/content/{pages,heads,bottoms,parts,index.json}`, `src/styles/{inline,site.css}`, `tools/{extract,strip-sourcemaps,sitemaps,verify-legacy}.mjs`, `src/lib/exceptions.mjs`, `exceptions.json`, `proposals.json`, `inert-forms.json`, `docs/media-plan.json`.
- `baseline/`, `capture/` (also from disk, incl. 88 MB git-ignored screenshots), `.conversion/{console.json,css-prune-report.json,live-all-b,parts.json,plan.md}` and the WP logs; `.conversion/review-serve.pid` untracked and ignored. `.conversion/media-cache` (1.2 GB) and `video-download` stay on disk, git-ignored; delete by hand if not needed (it is the only copy of the original uploads).
- Scripts: removed `scripts/{build-baseline,copy-assets,css-coverage,css-prune,link-exceptions,media-plan,media-upload,verify-live}.mjs`, `scripts/verify/*`, `scripts/review/*`, `scripts/lib/stores/*` and 19 files of `scripts/lib`. Kept: `scripts/review-serve.mjs` (its one import, `contentTypeFor` from media-upload, replaced by a few lines in its own type table), `scripts/state.mjs` (decisions), `scripts/build-redirects.mjs` (compiles the csv to `_redirects`, called by the generator) and `scripts/lib/{node-version,redirects-csv,review-routes}.mjs`. Nothing under `src/` or `tools/` imports a deleted file (grep clean; `node --check` of every remaining script).
- npm scripts removed: `baseline`, `assets:copy`, `links:exceptions`, `verify:live`, `review:shoot|diff|styles|sheet|check`, `verify:legacy`, `verify:legacy:release`. Dependencies removed (`npm uninstall --offline`, lockfile lost only 45 lines, no network): `css-tree`, `pixelmatch`, `playwright` (nothing imported them; the checks load Playwright from the kit by path). Left: `astro`, `@fontsource/roboto`, `@fontsource/roboto-condensed`, `parse5`, `pngjs`. No dependency added.
- `wp` check: `STAGE4_SOURCES` gone; no allowlist (it scans `dist/` and `src/`, with `_redirects` sources skipped; docs are not scanned).
- Tests: `slice-text.test.mjs` became `page-text.test.mjs` and `seo-data.test.mjs` lost its reads of `capture/text`. They now compare the rendered Impressum, Datenschutz and the five posts with their Markdown bodies (word for word), check the Ueber uns facts and that the BikeStore JSON-LD equals the visible Ueber uns text, and the structure of the service, jobs and booking pages. The "verbatim from the old site" guard ended with the capture (git history keeps it); the service-page typo check (compared against `main-bike.txt`) was replaced by a structure check. 17 tests, as before.
- Comments in `src/`, `tools/`, `scripts/`, `astro.config.mjs` that named `capture/...` paths were reworded.

## C. Docs

Rewritten: `README.md`, `AGENTS.md` and `CLAUDE.md` (identical), `docs/plan.md` (how the site is built now; the ledger d1 to d76 kept as history, including the rows about the removed pipeline), `docs/third-party.md` (three click-to-load embeds, nothing else, hero video not loaded), `docs/LAUNCH.md` (Pages project, build command, output `dist`, Node 22, `PUBLIC_INDEXABLE=true` only for the launch build, `SITE_ORIGIN`, `bike-one.dev` then `bike-one.org`, DNS, `_headers`/`_redirects`, `?p=` Single Redirects, Search Console, rollback, restore from history: `git checkout 4cd6d4c -- capture baseline`). New: `docs/redesign.md` (goals, IA table with the final mapping, design decisions, structure, open questions pointing at TODO.md) and `docs/TODO.md` (tracked; linked from README, AGENTS and CLAUDE).

## D. Sizes

| | Before | After |
|---|---|---|
| tracked files | 937 | 102 |
| tracked bytes | 57.8 MB | 2.3 MB |
| `du -sk .` working folder | 3,160,272 KB (3.0 GB) | 1,840,824 KB (1.8 GB) |
| of which untracked/ignored: `.conversion` (media-cache, video-download) | 1,216,672 KB | 1,215,912 KB |
| `legacy-public/` | 1,192,632 KB | gone |
| `capture/` + `baseline/` | 89,700 + 1,744 KB | gone |
| `public/` | 18,464 KB | 20 KB |
| `src/` | 4,452 KB | 1,940 KB |
| `.git` (loose objects, history keeps everything) | 59,756 KB; `count: 1576`, 58.14 MiB | 60,072 KB; `count: 1657`, 58.53 MiB |
| `dist/` | 30,720 KB, 205 files | 12,220 KB, 203 files |
| home transfer 1440 / 390 | 18,347 KB, 17 requests / 139 KB, 14 | 246 KB, 15 requests / 136 KB, 13 |

`.git` does not shrink: the video files (26.5 MiB `VidOne.mp4`, 17.7 MiB `hero.mp4`) and the WordPress tree stay in history until the squash listed in TODO. Working folder without the git-ignored `.conversion` cache and `.local`: about 0.6 GB of which 230 MB is `node_modules`.

## E. Grep `wp-content|wp-includes|woocommerce|wordpress|elementor|jquery|yith` (case-insensitive)

`dist/` (dev and release): 0 hits. Tracked files: 53 lines in 6 files, all history or the check itself:
- `.conversion/state.json` (30): the decision ledger d1 to d70 about the old pipeline.
- `docs/plan.md` (16): the same ledger rows, plus one sentence in "History".
- `docs/LAUNCH.md` (1) and `docs/redesign.md` (1): "restore the old pages" and the redesign's starting point.
- `docs/old-urls.json` (1): the `about` sentence that explains where the list came from.
- `tools/checks/wp.mjs` (4): the patterns the check searches for.
`redirects.csv`, `docs/old-urls.json` rows and `tools/redirect-map.mjs` contain `wp-sitemap*.xml` source paths, which none of those seven words match.

## F. Screenshots

`website/review/stage4/home-{1440,768,390}.png` (git-ignored), poster only. Looked at 1440 and 390 (390 also cropped at real size). No defect: hero text is readable over the shaded photo, store cards, service blocks, brand chips (Cervélo first), blog cards and footer line up, no horizontal overflow. On a phone the hero shows mostly sky and the mountain ridge (the photo's cyclist is cropped out); not a defect, a crop choice (`object-fit: cover`).

## Final gate output

`npm run verify` (dev build, head b7f1105; `dist/` is left as this build):

```
verify: dev build
redirects: ok (132 old URLs: 15 built, 117 redirected; 140 redirect rules, 42 ?p rows)
links: ok (16 native pages, 16 stylesheets)
seo: ok (16 native pages, dev build)
wp: ok (76 files scanned)
headers: ok (4 header rules, 141 redirect rules (23 dynamic), 37 files scanned for http://)
size: ok (home: HTML 24.7 KB (gzip 6.1 KB), CSS 15.5 KB in 6 file(s) (gzip 4.7 KB), JS 0.0 KB in 0 file(s))
a11y: ok (16 native pages)
ui: ok (16 pages x 1440, 390: 331 focus stops; touch targets, menu, reduced motion; 8 text boxes on photos)
net: ok (16 native pages x chrome, webkit x 1440, 390; home 1440px: 15 requests, 246 KB (html 25 KB, image 142 KB, css 15 KB, font 64 KB); 390px: 13 requests, 136 KB (html 25 KB, font 64 KB, image 32 KB, css 15 KB);)
embeds: ok (30 activations (click, Enter, Space) in chrome and webkit, hosts bike-leasing-calculator.jobrad.org, www.etermin.net, www.google.com)
verify: all 10 checks passed
```

`npm run verify:release` (`PUBLIC_INDEXABLE=true npm run build` first: `sitemap: 15 pages`):

```
verify: release build
redirects: ok (132 old URLs: 15 built, 117 redirected; 140 redirect rules, 42 ?p rows)
links: ok (16 native pages, 16 stylesheets)
seo: ok (16 native pages, release build)
wp: ok (78 files scanned)
headers: ok (4 header rules, 141 redirect rules (23 dynamic), 39 files scanned for http://)
size: ok (home: HTML 24.7 KB (gzip 6.0 KB), CSS 15.5 KB in 6 file(s) (gzip 4.7 KB), JS 0.0 KB in 0 file(s))
a11y: ok (16 native pages)
ui: ok (16 pages x 1440, 390: 331 focus stops; touch targets, menu, reduced motion; 8 text boxes on photos)
net: ok (16 native pages x chrome, webkit x 1440, 390; home 1440px: 15 requests, 246 KB (html 25 KB, font 64 KB, image 142 KB, css 15 KB); 390px: 13 requests, 136 KB (html 25 KB, font 64 KB, image 32 KB, css 15 KB);)
embeds: ok (30 activations (click, Enter, Space) in chrome and webkit, hosts bike-leasing-calculator.jobrad.org, www.etermin.net, www.google.com)
verify: all 10 checks passed
```

`npm test`: `# tests 17`, `# pass 17`, `# fail 0`.

## Deviations and judgement calls

- Decision numbering: d71 hero, d72 frozen list, d73 Cervélo, d74 deletion, d75 video-return conditions, d76 TODO/docs.
- `ui`'s old "reduced motion" block stays, minus the video assertion; the poster measurement ran with reduced motion before and still does (no effect on a photo).
- Tests that compared pages with the capture were rewritten (see B), a weaker guard for "verbatim from the old site" than before; the lawyer's edits to the legal text will not trip them.
- `.conversion/media-cache` and `video-download` were not deleted (only copies of originals; the HEVC original is needed to re-encode the hero). `legacy-public` uploads were deleted from disk: a subset of the cache.
- Gates ran on each commit except the two docs-only commits (see Commits).
- I removed `playwright` from devDependencies although it was listed there: nothing imports it; `PLAYWRIGHT_MODULE` or the kit's copy is used.
- `docs/LAUNCH.md` says Node `22.23.4` for the Pages `NODE_VERSION` variable (the `.nvmrc`); a Pages-supported version string was not checked against Cloudflare's docs.

## Not checked, risks

- Firefox, real Safari/iOS and Android Chrome were not run (listed in TODO). The `_headers` file applying on Cloudflare Pages is unverified. The live behaviour of the key-free Google Maps embed URL is unverified (only the placeholder and the aborted request were tested).
- The legal pages are unchanged and still need the lawyer (TMG, embeds missing from the Datenschutz, shop-only items, typos).
- `git` history still holds the 26.5 MiB `VidOne.mp4` (6e06eac) and the 17.7 MiB `hero.mp4` (7858e4c): squash before any push. `.local/hero.mp4` exists only on this machine.
- Docs in `docs/plan.md` keep WordPress wording in the ledger on purpose (history).
- The review server on :4321 was restarted once (pid 24118) to prove the edited `review-serve.mjs` starts; it is running and serves the dev build in `dist/`.
