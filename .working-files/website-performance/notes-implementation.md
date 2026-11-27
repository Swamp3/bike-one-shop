# Implementation notes: performance work and the hero film

Date: 2026-11-27. Branch `website-import`, nothing pushed. Work in `website/`. Plan and measurements before the work: `plan.md` next to this file.
Legend: everything here is measured by me (Chrome 158 system build, Playwright WebKit, local review server on :4321, ffmpeg 9.1) unless it says "expected".
All KB are KiB (bytes / 1024), raw bytes (the local server does not compress).

## Third parties

No browser run and no script of the site or of the measurements contacted bike-one.org, an embed host or any other third party: every browser
context registered the abort route for non-local requests last (or used `route.fallback()` for header routes), and `perf3.mjs` counted foreign
requests attempted: 0 in all 162 saved runs (and in the 216-render image audit). The two or three small throwaway probes (canvas colour read of local test videos) loaded only pages of the review server and had no route to count.
One download for tooling, not by a browser or a site script: `pip install fonttools brotli` into a throwaway virtualenv in the session scratch
folder (PyPI) to subset the fonts. It is not a repository dependency (nothing in `package.json`, no committed venv); the exact commands are in
`website/docs/fonts.md`. ffmpeg was already installed.

## Commits

| Hash | Subject |
| --- | --- |
| 5232d3c | perf: image sizes that match the rendered width, one-day cache for the icons, byte ranges in the review server |
| 3948dae | perf: AVIF quality 45 |
| 5827a15 | perf: German-only subsets of the three main font files |
| 202ca3f | perf: prefetch internal pages on pointer down with speculation rules |
| b2d1b48 | feat: the home hero plays a short film, its first frame is the poster |
| c698168 | perf: one-day cache for the hero film files |
| f85a07c | docs: implementation notes of the performance work |
| (last) | docs: gate output and corrections in the implementation notes |

Gates (`npm run build`, `npm run verify`, `npm test`) ran fully on 5232d3c, 3948dae, 5827a15, 202ca3f and on the hero commit, and again on the final head
(dev and release, logs below). Rollback of the hero: one `git revert b2d1b48` (restores the photo hero and the "no video" assertions; the speculation rules, fonts,
sizes and AVIF commits stay). The film cache commit only adds two `_headers` rules and can stay or go with it.

Decisions added (`docs/plan.md` and `.conversion/state.json`): d77 sizes, d78 icon cache, d79 blog thumbnails stay lazy (not applied, see deviations),
d80 AVIF q45, d81 German font subset, d82 speculation rules, d83 hero film and phone crop, d84 hero shade, d85 film cache.

## Before and after (Chrome, median of 3, CDP: fast 4G = 9 Mbit/s 60 ms, slow 4G = 1.6 Mbit/s 150 ms)

"Before the load event" = Resource Timing entries with responseEnd up to loadEventStart (HTML included). LCP element is the image in every row but `/blog/` (a paragraph).
Raw rows: `scratch/perf-before.json`, `scratch/perf-before-blog.json`, `scratch/perf-after.json` (script `scratch/perf3.mjs`, table `scratch/table.mjs`).

| Page | Width | Line | LCP before | LCP after | CLS before / after | Requests before load, before / after | KB before load, before / after | Video after load |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | 1440 | fast 4G | 276 | **252** | 0 / 0 | 14 / 15 | 218 / **170** | hero.webm, 0.49 MiB, 1 request, 3 to 12 ms after the load event started |
| home | 1440 | slow 4G | 796 | **660** | 0 / 0 | 14 / 15 | 218 / 170 | same |
| home | 390 | fast 4G | 248 | 240 | 0 / 0 | 12 / 13 | 119 / **105** | none, 0 bytes |
| home | 390 | slow 4G | 636 | 624 | 0 / 0 | 12 / 13 | 119 / 105 | none, 0 bytes |
| post (leasing) | 1440 | fast 4G | 256 | 240 | 0 / 0 | 10 / 10 | 167 / 134 | none |
| post (leasing) | 1440 | slow 4G | 952 | 816 | 0 / 0 | 10 / 10 | 167 / 134 | none |
| post (leasing) | 390 | fast 4G | 224 | 212 | 0 / 0 | 10 / 10 | 115 / 91 | none |
| post (leasing) | 390 | slow 4G | 616 | 600 | 0 / 0 | 7 / 8 | 51 / 63 | none |
| `/service/` | 1440 | fast 4G | 280 | 272 | 0 / 0 | 15 / 15 | 175 / 141 | none |
| `/service/` | 1440 | slow 4G | 708 | 628 | 0 / 0 | 15 / 15 | 175 / 141 | none |
| `/service/` | 390 | fast 4G | 264 | 264 | 0 / 0 | 15 / 15 | 140 / 112 | none |
| `/service/` | 390 | slow 4G | 636 | 612 | 0 / 0 | 15 / 15 | 140 / 112 | none |
| `/blog/` | 1440 | fast / slow 4G | 200 / 544 | 196 / 504 | 0 / 0 | 6 / 6 | 32 / 32 | none |
| `/blog/` | 390 | fast / slow 4G | 200 / 540 | 192 / 516 | 0 / 0 | 6 / 6 | 32 / 32 | none |
| `/ueber-uns/` | 1440 | fast / slow 4G | (plan: 1144 at slow) | 260 / 932 | n/a / 0 | n/a / 12 | n/a / 130 | none |

Notes on the table: the extra request per page after d82 is the 166-byte speculation rules file (counted before load on pages where it arrives in time). The post row at
390 px slow 4G (51 / 63 KB, 7 / 8 requests) differs only in whether the font arrived before the load event in that run (run-to-run variance; the total after scrolling is lower after). Unthrottled
runs are not in the table (the first unthrottled "before" run was a cold-start outlier at 904 ms; the other unthrottled medians are 56 to 64 ms before and after).
`/ueber-uns/` has no "before" run in this session; the plan measured 1144 ms at slow 4G and 688 ms at 390 with the older method. No page got slower by more than 8 ms (only unthrottled runs, noise), many got faster (smaller poster, AVIF q45, subset fonts).
WebKit (Playwright, home): 1440 LCP 152 ms, CLS 0, 146 KB before load, 18 requests after scrolling, no video request, the film does not start (autoplay refused, see below),
the poster stays; 390: LCP 52 ms, CLS 0, 105 KB, portrait poster.

Acceptance numbers of the task (home 1440):

| Target | Measured |
| --- | --- |
| transfer before the load event at most 200 KB | 170 KB (html 28, font 42, image 83, css 16, js 1), 15 requests |
| no video request before the load event | 0 (`net` fails on one; also with a 1.6 Mbit/s line until load; proved red) |
| LCP at most 300 ms at fast 4G | 252 ms (poster AVIF 1440 is the LCP element) |
| CLS 0 | 0 at none, fast 4G, slow 4G, and after scrolling |
| one video request of at most 1.0 MiB after load | 1 request, `Range: bytes=0-` answered 206 `0-509199/509200` (0.49 MiB), no second request over a loop restart |
| 0 video bytes at 390, reduced motion, touch screen, Save-Data, cellular, 3g, 2g | 0 requests in all seven cases (`net`) |
| poster to video swap: no layout shift, no jump | CLS 0; mean pixel difference 2.81 of 255 at 1440 (3.69 at 800, 2.91 at 1920), 0.56 % of the values off by more than 24 |
| all other pages unchanged or better | yes, see table; the largest slowdown is 8 ms (unthrottled, noise) |

Screenshot pairs (committed): `screens/hero-390-before-after.jpg` (left today's mountain hero at 390, right the new portrait crop: the subject is visible),
`screens/hero-1440-before-after.jpg`, `screens/swap-1440-poster-over-video-frame0.jpg` (top: poster, bottom: first presented video frame, same crop and shade off).

### Swap measurement detail

`scratch/swap.mjs` (also in `ui`): hero clip screenshot with the copy and shade hidden, once with the film shown at its first presented frame (media time 0.042 s), once with the film
hidden. AV1 in Chrome: mean abs difference 2.81 (signed +1.6 / -0.8 / +1.9 for R, G, B). The H.264 fallback in Chrome on macOS: 7.71 (signed +7.1 / +3.2 / +5.7): above 6. I tried
variants (explicit sRGB, BT.709 and SMPTE 170M transfer tags, full-range encode, crf 18): all give 7.4 to 7.7, while a canvas read of the same frames matches the poster (Chrome's
hardware H.264 compositing path lifts dark tones; the AV1 software path does not). Only browsers without AV1 use the H.264 file. Not gated, listed in `docs/TODO.md`.

## Images: wasted bytes (`scratch/audit-images.mjs` + `waste.mjs`: 16 pages x 390, 768, 1440 x 1x, 2x = 216 image renders)

| Viewport | Wasted AVIF bytes before | after the `sizes` fix |
| --- | --- | --- |
| 390 at 1x / 2x | 0 / 54 KB | 0 / 0 |
| 768 at 1x / 2x | 99 KB / 99 KB | 0 / 0 |
| 1440 at 1x / 2x | 0 / 0 | 0 / 0 |

Image bytes after scrolling: home at 768 px 1x 165 to 101 KB, `/service/` at 768 px 1x 77 to 42 KB, `/service/` at 768 px 2x 114 to 79 KB. At 12 widths from 600 to 1700 px
(`scratch/mid-widths.mjs`) the browser picks the smallest candidate that covers the rendered width (for example 472 px gets the 480 file, 552 px the 768 file; 1152 px the 1440 file).
Still "under-dense" (file narrower than the pixels needed) at 1440 px 2x on nine renders: the source photos are smaller than 2880 px (cap), not a `sizes` problem.

## AVIF q50 against q45 (`scratch/q-compare.mjs`, sharp effort 4 as Astro)

| | q50 | q45 |
| --- | --- | --- |
| the eight photos at the widths the site delivers | 942 KB | 765 KB (-18.8 %), PSNR about 1 dB lower |
| all AVIF files in `dist/` (before the hero change) | 1312 KB | 1073 KB (-18.2 %) |
| hero photo 1440 (old mountain) | 49.6 KB | 39.8 KB |

Crops of beratung, konfiguration, leasing, fitting at 1:1 and magnified 2x, original | q50 | q45 side by side: only the finest detail (spokes) is slightly softer at 2x
magnification, nothing visible at display size, no banding or blocks. Kept q45. The new poster is encoded at q45 too (1440 AVIF 28.5 KB; 1920 39.4 KB; portrait 864 30.0 KB, 480 15.2 KB).
Astro caches encoded images without the quality in the key: `node_modules/.astro/assets` must be deleted after a quality change (written in the config comment and d80).

## Fonts

| | before | after |
| --- | --- | --- |
| Roboto 400, Roboto 700, Roboto Condensed 700 (woff2) | 21,884 + 22,240 + 21,128 = 65,252 B (63.7 KB) | 14,004 + 14,292 + 14,268 = 42,564 B (41.6 KB), -35 % |
| home before the load event, font bytes | 64 KB | 42 KB |

Weights actually used: exactly those three (400 and 700 of Roboto, 700 of Roboto Condensed), nothing to drop. `@fontsource` offers only per-script splits (latin, latin-ext, cyrillic ...): the
latin-ext files (15 KB, on demand) stay, nothing else is loaded. The three latin files were subset with fontTools (one-off, no repo dependency) to the German set; kerning kept.
`size` now fails when a page text or a CSS `content` string shows a character the old file covered and the subset does not; it caught the breadcrumb arrow U+203A (a CSS `content`)
through a screenshot diff first, then I made the check scan CSS `content` too. After the fix 32 full-page screenshots (16 pages x 1440, 390) are pixel identical to before
(two pages showed 27 to 56 px of noise in one run and none in the rerun: lazy image decoding, not text).

## Hero film

Source: `.conversion/video-download/VidOne.mp4` (HEVC, 1920x1080, 60 fps, full range) rather than the 720p H.264 (the original is sharper, and 540p/720p are made from it).
- In 3.5 s, out 11.5 s, 8.0 s, 192 frames at 24 fps. Frame 0 (the trainer shot with the woman on the fitting bike, the man's shoulder at the left) is the poster.
- Loop: seamless. The last 0.5 s of the output are a dissolve of the source at 11.0 to 11.5 s (desk scene) into the source at 3.0 to 3.5 s (the trainer shot just before the start); the loop restarts on 3.5 s.
  (`loop` attribute; no hard cut. A first/last-frame difference of 44 of 255 existed in the uncut film.)
- `public/hero.webm`: AV1 (SVT-AV1 preset 2 crf 40), 1280x720, 24 fps, BT.709 limited range, no audio, cues to front: **509,200 B (0.486 MiB)**. Listed first (chosen by `canPlayType('video/webm; codecs="av01.0.05M.08"')`).
- `public/hero.mp4`: H.264 High, `avc1`, level 5.0 as written by x264, 1280x720, 24 fps, `yuv420p`, BT.709 limited range (colr nclx 1/1/1, full 0), faststart, no audio, crf 28 veryslow: **706,946 B (0.674 MiB)**.
- Why 720p and not 540p: 720p stays under 1.0 MiB in both codecs and 1440 px screens upscale 1.125x instead of 1.5x. Measured candidates (PSNR against the lossless 720p master): H.264 crf 26 0.83 MiB 44.0 dB, crf 28 0.67 MiB 42.9 dB,
  crf 30 0.56 MiB 41.8 dB; AV1 preset 4 crf 40 0.46 MiB 44.5 dB, preset 3 crf 40 0.45 MiB 44.8 dB, preset 2 crf 40 0.49 MiB 45.4 dB (shipped), preset 4 crf 34 0.63 MiB 45.7 dB; VP9 crf 36 0.73 MiB 44.5 dB, crf 40 0.55 MiB 43.3 dB; H.264 540p crf 26 0.55 MiB.
  AV1 at equal quality is 45 % smaller than H.264 crf 26 (above the 40 % bar), VP9 only 12 %, so only AV1 + H.264 ship. Both play in the system Chrome (AV1 by software decode, H.264 by hardware); both were play-tested (`swap.mjs`, `net`).
- First presented frame colour: see swap measurement. Poster JPEG sources: `src/assets/photos/hero-poster.jpg` (1920x1080, 185 KB) and `hero-poster-portrait.jpg` (864x1080, 134 KB).
- Encoding commands: `website/docs/hero-video.md`. The 17.67 MiB encode and the HEVC original stay outside the repository (`.local/`, `.conversion/`, git-ignored).
- Phone crop (design change agreed by the owner): below 48rem the picture is the 864x1080 crop (x 566 to 1430 of the frame), so the woman on the trainer is in the middle of a 390 px screen (before: sky and a ridge, the cyclist cropped out). A phone gets 15 to 31 KB of AVIF instead of 13 to 27 KB, sharper
  (864 px for a 390 css px box at 2x instead of 640 px). The film never plays below 48rem, so the crop and the film do not have to match.
- Hero shade: the wide-screen vertical gradient keeps 12 % at 35 % instead of 0 (d84). Worst white-text contrast over 32 frames (every 0.25 s) at 1440: h1 13.5:1 (need 3), eyebrow 5.58:1 (need 4.5; it was 4.69 before the change),
  ghost button 17.2:1; at 800 px 11.5 / 6.38 / 17.07. `ui` (final run) samples the poster at 1440 and 390 (h1 14.0 / 13.9, eyebrow 6.8 / 12.6, ghost 18.4 / 16.9) and frames at 5, 25, 50, 75, 95 % of the film (eyebrow 5.75 at 25 %, 6.9 / 11.3 / 14.3 / 10.5 at the others).
- Start rules (`HeroVideo.astro`, 1.4 KB of JS): `preload="none"`, no `src` until start; after the window load event, in `requestIdleCallback` (timeout 2 s; `setTimeout` where missing, as in Safari), hero in view (IntersectionObserver), `(min-width: 48rem) and (pointer: fine)`,
  not `prefers-reduced-motion`, not Save-Data, not cellular, not `slow-2g`/`2g`/`3g`; re-evaluated when any of them changes. Fade-in on the first presented frame (`requestVideoFrameCallback`, fallback `timeupdate`). Pauses with the tab and when the hero leaves the view.
  Pause button: keyboard operable (native button), labels "Hintergrundvideo anhalten" / "Hintergrundvideo abspielen" (label changes; the old `aria-pressed` is dropped because a changing label plus a pressed state is announced twice).
  If `play()` rejects with `NotAllowedError` (WebKit, iOS Low Power Mode) the `src` is removed, the poster stays, nothing is logged.
- Checks changed: `size`, `net`, `ui` (see AGENTS.md and the d83 row). Each new assertion proved red by hand: size (video over 1 MiB, video on /blog/, stray .mp4, `autoplay` on the hero video, preload without media);
  net (film started before load, Save-Data ignored, pointer fine dropped, min-width dropped); ui (first frame from another scene 37 of 255, a white film fails text contrast, a button that does nothing fails the Space check);
  headers (eagerness changed, Content-Type removed, one cache rule removed); size fonts (U+00DF and U+203A removed from the range).
- WebKit: `play()` is refused in Playwright's WebKit; no video request was made in my WebKit run (0), the poster stays, no console message; the film's `src` is removed again. In one `net` experiment (breaking the width rule on purpose) WebKit did start the mp4 request twice before refusing,
  so a refused autoplay can still cost a request in WebKit; real Safari is untested.

## Speculation rules

Chrome 158: `HTMLScriptElement.supports('speculationrules')` true; the rule set from the `Speculation-Rules` header is parsed without error (CDP `Preload.ruleSetUpdated`), the candidates are all same-origin pages (the shop host and the feed never match), nothing is prefetched until a pointer down on a menu link (status `Ready`), 0 foreign requests.
WebKit (Playwright) also fetches the rules file (it printed "Invalid speculation rules MIME type" when I broke the type on purpose, so Safari takes the header too). The CSP is unchanged.

## Deviations from the brief

1. (g) First-row blog thumbnails are **not** eager: measured LCP at slow 4G 544 to 596 ms (1440) and 540 to 588 ms (390), 572 ms with `fetchpriority=low`, and +82 KB before the load event at 390 for pictures below the fold. Reverted, d79. The icons' one-day cache was applied.
2. The film `src` is set by the script (`canPlayType` picks AV1 or H.264) instead of `<source>` children, as the brief said "no `src` set until the start".
3. `aria-pressed` removed from the pause button (label changes instead).
4. `public/hero.*` are not hashed, so they get a one-day cache rule (d85) instead of the immutable rule of `/_astro/*`.
5. The default Open Graph image is still `hero.jpg` (the mountain photo): the owner said the mountain is not shown in the hero; OG was not mentioned. One import in `SEO.astro` to change.
6. `scripts/review-serve.mjs` now answers `Range` (206) and applies a `Content-Type` rule of `_headers` (needed to test video and the speculation rules file faithfully; `test/review-serve.test.mjs`). Not a runtime part of the site.
7. Preload: `Base.astro` takes one entry or a list (hero: one per `<source media>`), and `size` requires one preload per AVIF `<source>`.
8. `net` home at 1440: +1 request (the rules file, 166 B) and the film (0.49 MiB) are in its numbers now (18 requests, 691 KB in total).

## New German strings

None new. The pause button reuses the two labels of the old `HeroVideo.astro` ("Hintergrundvideo anhalten", "Hintergrundvideo abspielen").

## Not checked, risks

- Real Safari (macOS, iOS, Low Power Mode), Android Chrome, real devices and CPU load of AV1 software decode on weak desktops (expected: 720p24 is light, not measured).
- Firefox: Playwright's Firefox still does not start here (`Failed to launch the browser process`). Untested.
- Live Cloudflare Pages: brotli, HTTP/2 and HTTP/3, Early Hints, `Accept-Ranges` and edge caching of the two film files, the 25 MiB limit (largest file 0.69 MiB), whether `_headers` may set the `Content-Type` of `/speculation-rules.json`,
  and Cloudflare's terms for serving video: all in `docs/TODO.md` (Hosting, Hero video). The local review server answers ranges and the Content-Type rule; Pages is expected to, not verified.
- Time from the load event to the first presented film frame at fast and slow 4G, and buffer stalls at slow 4G, were not re-measured (the plan measured 0.14 and 0.48 s to first frame and 3 stalls for a 0.97 MiB H.264; this film is half the size: expected better, not measured).
- The H.264 fallback shows the first frame about 7.7 of 255 brighter than the poster in Chrome on macOS (above the 6 target); only browsers without AV1 take it.
- The visible SCOTT lettering is accepted for now (owner); noted in `docs/TODO.md` as a brand-consistency point. Rights for the people in the film are confirmed as cleared by the owner (noted in TODO).
- Contrast margin: the eyebrow is 5.58:1 on the worst of 32 sampled frames at 1440 (limit 4.5); a different film or a H.264 hardware path that lifts blacks lowers it.
- Home HTML grew 25 to 28 KB (six poster `<source>` elements), CSS 15.5 to 16.3 KB, JS 0 to 1.4 KB.
- `dist/` is the dev build and the review server (:4321, pid below) is running.

## Gate output (verbatim)

One thing to know: the first chained attempt of the final gates (`build`, `verify:release`, `build`, `verify`, `test` in one background shell) failed `ui`, `net` and
`embeds` with "http://localhost:4321/ does not serve this dist/ (home page differs)" in both the release and the dev run, while `a11y` and the file checks passed. I could not
reproduce it: the same server then served the same dist (`needServer` ok), and `npm run verify` and `npm run verify:release` were green on a rerun with identical sources.
Cause unknown (the server and `dist/` were not touched in between); the logs below are the green reruns.

`npm run verify` (dev build, sources of c698168):

```

> bikeone@0.0.0 verify
> node tools/verify.mjs

verify: dev build
redirects: ok (132 old URLs: 15 built, 117 redirected; 140 redirect rules, 42 ?p rows)
links: ok (16 native pages, 16 stylesheets)
seo: ok (16 native pages, dev build)
wp: ok (80 files scanned)
headers: ok (9 header rules, 141 redirect rules (23 dynamic), 39 files scanned for http://)
size: ok (home: HTML 27.9 KB (gzip 6.5 KB), CSS 16.3 KB in 6 file(s) (gzip 4.9 KB), JS 1.4 KB in 1 file(s))
a11y: ok (16 native pages)
ui: ok (16 pages x 1440, 390: 332 focus stops; touch targets, menu, hero button and film, reduced motion; 23 text boxes on photos)
net: ok (16 native pages x chrome, webkit x 1440, 390; home 1440px: 18 requests, 691 KB (html 28 KB, other 497 KB, css 16 KB, image 106 KB, font 42 KB, js 1 KB); 390px: 15 requests, 119 KB (html 28 KB, other 0 KB, css 16 KB, image 32 KB, js 1 KB, font 42 KB);)
embeds: ok (30 activations (click, Enter, Space) in chrome and webkit, hosts bike-leasing-calculator.jobrad.org, www.etermin.net, www.google.com)
verify: all 10 checks passed
```

`PUBLIC_INDEXABLE=true npm run build` then `npm run verify:release` (same sources):

```

> bikeone@0.0.0 verify:release
> PUBLIC_INDEXABLE=true node tools/verify.mjs

verify: release build
redirects: ok (132 old URLs: 15 built, 117 redirected; 140 redirect rules, 42 ?p rows)
links: ok (16 native pages, 16 stylesheets)
seo: ok (16 native pages, release build)
wp: ok (82 files scanned)
headers: ok (9 header rules, 141 redirect rules (23 dynamic), 41 files scanned for http://)
size: ok (home: HTML 27.8 KB (gzip 6.5 KB), CSS 16.3 KB in 6 file(s) (gzip 4.9 KB), JS 1.4 KB in 1 file(s))
a11y: ok (16 native pages)
ui: ok (16 pages x 1440, 390: 332 focus stops; touch targets, menu, hero button and film, reduced motion; 23 text boxes on photos)
net: ok (16 native pages x chrome, webkit x 1440, 390; home 1440px: 18 requests, 691 KB (html 28 KB, other 497 KB, css 16 KB, image 106 KB, js 1 KB, font 42 KB); 390px: 15 requests, 119 KB (html 28 KB, other 0 KB, css 16 KB, image 32 KB, js 1 KB, font 42 KB);)
embeds: ok (30 activations (click, Enter, Space) in chrome and webkit, hosts bike-leasing-calculator.jobrad.org, www.etermin.net, www.google.com)
verify: all 10 checks passed
```

`npm test` (after the dev rebuild):

```
# Subtest: rewrites every origin form, leaves other hosts alone
# Subtest: impressum: the rendered words are the words of src/content/legal/impressum.md
# Subtest: datenschutz: the rendered words are the words of src/content/legal/datenschutz.md
# Subtest: home: five service blocks, each with a title and a text
# Subtest: Ueber uns: phone numbers, e-mail addresses and hours are on the page
# Subtest: blog excerpts are the beginning of their posts
# Subtest: blog posts: the rendered body is the Markdown body, word for word
# Subtest: service: the four service blocks and the booking link are there
# Subtest: stellenangebote: the job list, nothing added
# Subtest: booking pages: etermin.net is not requested before a click (no iframe in the page, only in a template)
# Subtest: destination follows the IA table
# Subtest: rows for the old URLs that moved, none for a native page
# Subtest: brand pages and shop shells go to the shop, demo pages to the home page, feeds to the blog feed
# Subtest: the generator is stable: captured rows in, same rows out
# Subtest: review server answers ranges and applies a Content-Type rule of _headers
# Subtest: berlinIso writes the Berlin day and offset, winter and summer
# Subtest: BikeStore nodes equal the Ueber uns facts
# Subtest: Organization: brands and e-mail come from the content files, no invented profile data
# tests 18
# suites 0
# pass 18
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 127.847208
```

`dist/` is the dev build again (`noindex`), and the review server on :4321 (pid 45359, started from the updated `scripts/review-serve.mjs`) is running.
