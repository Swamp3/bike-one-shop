# Website performance: plan and hero video options

Date: 2026-11-27. Scope: the static Astro site in `website/` (branch `website-import`). This is a plan; nothing under `website/` was changed
and nothing was committed. Measurement scripts and small result files are in `scratch/` next to this file; the heavy files (encodes, frames,
a copy of `dist/`) are in the session scratch folder, not in the repository (see "How this was measured").

Legend: **measured** = I ran it here (local review server, system Chrome 158, Playwright). **expected** = reasoning or a figure I could not measure here.
All "KB" are KiB (bytes / 1024) and raw bytes: the local server does not compress, Cloudflare will compress HTML and CSS (HTML 25 KB raw is about 6 KB gzip, CSS 15.5 KB about 4.7 KB).

## 1. Executive summary

- **Images: yes, optimized.** Every photo is AVIF with WebP and JPEG fallbacks, 3 to 4 width variants (480 to 1920), `<picture>` with correct `sizes`,
  explicit width and height on all 36 image elements of the 16 pages, the one LCP image per page is `eager` + `fetchpriority=high` + preloaded, everything else is `lazy`.
  A first view costs 13 to 80 KB of photo. "Partly" only in three small ways (section 2): tablet-width `sizes` is wrong (about 35 to 66 KB wasted per page at 768 px),
  phone hero is shown at about half the pixel density it needs, and AVIF quality 50 leaves 17 to 33 % in bytes on the table at a visible-quality cost.
- **Nothing is slow.** Measured home at 1440: LCP 64 ms unthrottled, 260 ms fast 4G, 804 ms slow 4G (Lighthouse mobile profile); CLS 0 everywhere; 0 KB of JavaScript on the home page;
  218 KB at the load event (fonts 64 KB, photos 114 KB, HTML 25 KB, CSS 15 KB). Phone: 119 KB, LCP 636 ms at slow 4G. Slowest page is `/ueber-uns/` at 1440 on slow 4G: LCP 1144 ms (a 74 KB banner photo). Nothing is near a Core Web Vitals limit (2.5 s).
- **Off-screen content is already deferred**: lazy images, click-to-load embeds, no JS, font-display swap with metric-matched fallbacks. `content-visibility` would save about 3 ms of 25 ms main-thread time (measured): not worth it.
- **The video idea works technically, with two conditions.** Using the first video frame as the poster and swapping to the video after `load` costs
  no LCP (measured: LCP unchanged to 100 ms better, because that poster is 31 KB instead of 51 KB), no CLS (0 in every run) and the swap is invisible
  (mean pixel difference 3 to 4 out of 255, against 26 to 29 for today's mountain photo then the showroom video).
  1. **The poster is not the first frame today.** The video is a showroom film (fitting, workshop, consultation); its literal first frame is a near-black close-up of a SCOTT drivetrain.
     Using it changes the hero look from mountain landscape to showroom. A better start shot exists (the woman on the trainer at about 3.5 s, mock-up in `samples/`). That is an owner design decision.
  2. **The 17.67 MiB file cannot come back.** At fast 4G it stalls (15 buffer stalls, 11 MB in the first 10 s, then still downloading); on a slow line it takes minutes. An 8 s, 540p H.264 loop of **0.97 MiB** played smoothly at fast 4G and with 3 stalls on slow 4G (measured). An AV1 version should be 2 to 3 times smaller again (the same encoder gave an animated AVIF of 0.26 to 0.37 MiB for the same 8 s, measured; as WebM video: expected, not measurable here).
- **Single best next step:** the owner decides the hero (A keep the photo, or C a small first-frame-then-video hero, section 4). Everything else in this plan is small and can run in parallel.
- **Recommendation:** A today (already fast, zero risk). If the owner wants motion, build **C**: first-frame poster of a re-cut 8 s clip, 540p H.264 at or under 1 MiB (AV1 WebM first if ffmpeg can be installed), starts after `load` and idle, desktop with mouse only, never with reduced motion or Save-Data, with a pause button. Cost per desktop visit about +1 MiB (about 5x today's page), LCP/CLS unchanged.
- Two prerequisites that are not performance: people in the film (consent and image rights, German KUG/GDPR) and the visible SCOTT lettering (not one of the seven brands on the site). Owner and lawyer.

## 2. Findings

### 2.1 Image audit (every `<img>` of 16 pages at 390, 768, 1440 px and 1x, 2x; built `dist/`, Chrome; `scratch/images.json`, `scratch/an1.mjs`, `scratch/an2.mjs`)

| Area | Finding | Verdict |
| --- | --- | --- |
| Formats | All 8 photos delivered as AVIF (Chrome), with WebP (q80) and JPEG (q80) fallbacks in `<picture>`; logo 2 to 4 KB WebP (175 and 350 px) | good |
| Widths | Photos 480 / 768 / 1024 (service), 480 to 1440 (post), 640 to 1920 (hero), capped at source size; sizes 13 KB (hero 640) to 133 KB (Ueber uns banner 1920 at 2x) | good |
| Attributes | 0 images without `alt`; 0 without width and height; LCP image `eager` + `fetchpriority=high` + `decoding=async` on every page (preloaded with the same srcset); all other photos `lazy` | good |
| Lazy but visible | `/blog/` first row (3 thumbnails at 1440, 1 at 390) and the third `/service/` photo at 1440 are `lazy` while in the first viewport (not LCP; effect under 50 ms) | minor |
| Quality setting | Delivered AVIF is exactly sharp's default q50 effort 4, WebP q80, JPEG q80 (no mozjpeg: my re-encode with mozjpeg is 20 % smaller, only matters for the OG images and old browsers) | conservative-OK |
| Quality headroom (measured, all 8 photos x 4 widths) | q45: -17 % bytes, PSNR 37.6 to 36.7 dB. q40: -33 %, 35.5 dB. q35: -44 %, 34.7 dB. Hero 1440: 51 KB at q50, 41 KB at q45, 26 KB at q35 | optional, needs the owner's eyes |
| `sizes` wrong at tablet width | Home and `/service/` blocks: `sizes="(min-width: 48rem) 34rem, ..."` but the image renders 344 px wide at 768 px (544 px only at 1440). Browser takes the 768 px file where 480 px suffices. Waste at 768 px 1x: home 5 images 66 KB (165 KB of images could be about 99 KB), `/service/` 3 images 35 KB; at 768 px 2x 7 to 16 KB per image | fix (task T1) |
| `sizes` wrong on posts at 390 px 2x | `sizes="(min-width: 64rem) 72rem, 100vw"` but the image is 358 px (padding): takes the 1024 px file instead of 768 px: 5 to 16 KB per post | fix (T1) |
| Hero on phones | `object-fit: cover` of a 16:9 photo into a 390 x 658 box needs a 1170 px wide file at 1x (2340 at 2x); it gets 640 (960 at 2x): 0.55 and 0.41 of the needed density (also 0.77 at 768 px). Soft, but mostly sky and dark shade (screenshot at 3x looked acceptable). The cyclist is cropped out (known). A portrait art-directed crop would fix both for about 30 KB | optional (owner/design) |
| OG images | 1200 x 630 JPEG per photo, 55 to 129 KB; only crawlers fetch them | fine |
| Icons | `icon.png` 512 px 34 KB (only in JSON-LD, never loaded by a browser), `apple-touch-icon.png` 180 px 8.7 KB, `favicon.ico` is an 80 px PNG with an .ico name (3.2 KB; works in current browsers) | fine |
| Deploy size | `dist/` 10 MB, of which 5.9 MB are JPEG fallbacks that almost no browser requests; no delivery cost | ignore |

Image weight per page (all images after scrolling, 1x; at the load event less): home 87 / 165 / 188 KB (390 / 768 / 1440), `/service/` 42 / 77 / 77, posts 9 to 19 / 14 to 36 / 26 to 74, `/blog/` 42, other pages 2 KB (logo).

### 2.2 Other load costs

| Item | Finding | Verdict |
| --- | --- | --- |
| CSS | 6 stylesheets on home, 15.5 KB (4.7 KB gzip), render-blocking `<link>`s, same origin. A merged single file was measured earlier (Stage 3) and was 25 to 50 ms slower at slow 4G | leave |
| Fonts | 3 woff2 files at 64 KB (Roboto 400 22 KB, Roboto 700 22 KB, Roboto Condensed 700 21 KB), only the headline file is preloaded, latin-ext subsets (14 to 15 KB each) load only on demand (`unicode-range`), `font-display: swap`, size-adjusted fallbacks, CLS 0. Fonts are 29 % of the home first view at 1440 and 54 % at 390 | the largest non-photo item; German-only subset expected to save 20 to 35 KB (not measured, needs fonttools) |
| HTML | home 25 KB raw (6 KB gzip), JSON-LD included | fine |
| JS | 0 KB on home; 0.3 KB (embed click) on pages with embeds; menu is a CSS popover | none |
| Cache headers | `_headers`: `/_astro/*` immutable one year (all hashed images, fonts, CSS); HTML falls back to the Pages default (revalidate, no long cache); icons get the default too (a conditional request per visit, bytes tiny) | good; icons could get 1 day |
| Compression, HTTP/2 and /3, Early Hints | Cloudflare Pages normally serves brotli, HTTP/2 and HTTP/3; the local review server is raw HTTP/1.1 | not verifiable until deployed (task T5) |
| Preload hints | `<link rel=preload>` for the LCP image (AVIF srcset) and the headline font; no `Link:` headers, no 103; no `speculationrules`, no prefetch | see option O7 |
| `content-visibility` | not used. Measured on home (7 runs, median, 1440 and 390): layout 5.2 to 4.8 ms, style 7.0 to 5.7 ms, main-thread task 24.6 to 22.3 ms, CLS 0 both | not worth the scroll-jump risk |
| Embeds and footer | Click-to-load text box plus a `<template>`; no image, no request, nothing to defer | cheap |
| Third parties | 0 requests (every run below counted foreign requests: 0) | good |

### 2.3 Baseline numbers (Chrome, 3 runs each, median; `scratch/perf-baseline.json`, `scratch/perf-extra.json`; load = load event + 1.2 s, no scrolling)

| Page | Width | Network | LCP element | LCP ms | FCP ms | CLS | Requests | KB | Mix (KB) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 1440 | none | hero AVIF 1440 | 64 | 64 | 0 | 14 | 218 | html 25, font 64, image 114, css 15 |
| `/` | 1440 | fast 4G | same | 260 | 244 | 0 | 14 | 218 | |
| `/` | 1440 | slow 4G | same | 804 | 680 | 0 | 14 | 218 | |
| `/` | 390 | none / fast / slow | hero AVIF 640 | 56 / 260 / 636 | 56 / 244 / 636 | 0 | 12 | 119 | image 15 |
| `/service/` | 1440 | none / fast / slow | fitting AVIF | 56 / 272 / 712 | 56 / 244 / 632 | 0 | 15 | 175 | image 77 |
| `/service/` | 390 | none / fast / slow | fitting AVIF | 60 / 248 / 628 | | 0 | 15 | 140 | image 42 |
| Post (leasing) | 1440 | none / fast / slow | leasing AVIF 1152 | 64 / 264 / 948 | 64 / 216 / 664 | 0 | 10 | 167 | image 68 |
| Post (leasing) | 390 | none / fast / slow | leasing AVIF | 60 / 216 / 620 | | 0 | 10 | 115 | image 16 |
| `/blog/` | 1440 / 390 | none / slow | text paragraph | 52 / 540, 60 / 536 | | 0 | 14 / 12 | 135 / 114 | |
| `/ueber-uns/` | 1440 / 390 | none / slow | fitting banner AVIF | 64 / 1144, 64 / 688 | | 0 | 12 | 168 / 118 | image 74 / 24 |

Fast 4G = 9 Mbit/s, 60 ms; slow 4G = 1.6 Mbit/s, 150 ms (CDP emulation). Earlier Stage 3 numbers (home 246 KB at 1440 after scrolling) agree. Not measured: Lighthouse itself (not installed), real devices.
Reading: an unthrottled desktop is limited by nothing; on slow 4G the time to first paint is set by the HTML, 6 CSS files and one font file (FCP 632 to 680 ms), the hero image adds 100 to 120 ms.

## 3. Options for loading faster and deferring off-screen content (ranked by value for effort)

| # | Option | Expected gain | Cost / risk | Effort | Verified by |
| --- | --- | --- | --- | --- | --- |
| O1 | **Hero decision A or C** (section 4) | A: none. C: motion at +1 MiB | owner decision; C new look | A none; C M | section 4 |
| O2 | **Fix `sizes`** for the service blocks (tablet band 48 to 64 rem) and post covers (`calc(100vw - 2rem)` on phones); keep `preload.ts` constants and the preload tag identical (the `size` check enforces it) | measured waste: 66 KB on home and 35 KB on `/service/` at 768 px 1x; 5 to 16 KB per post on 2x phones; no effect on desktop | none visible; mismatch between preload and image would double-fetch (net check catches it) | S | `scratch/audit-images.mjs` + `an2.mjs` show waste 0 at 768 and 390@2; `npm run verify` |
| O3 | AVIF quality 50 to 45 (or 40 for below-the-fold photos) | q45: about -17 % image bytes (home 1440 about -20 KB, `/ueber-uns/` banner -12 KB); q40 about -33 % | slight softness; PSNR 36.7 / 35.5 dB; owner looks at the 8 photos | XS | compare the 3 largest photos side by side; audit re-run |
| O4 | Hero poster from a smaller source (only if the hero becomes the video's first frame) | 31 KB instead of 51 KB at 1440 (measured), LCP slow 4G 700 vs 804 ms | part of C | in C | `perf2.mjs` |
| O5 | German-only font subset (A to Z, a to z, digits, umlauts, ss, punctuation, euro) | expected 20 to 35 KB first visit (fonts are 64 KB), repeat visits 0 (immutable) | new build tool (fonttools) and a check that no glyph falls back; not measured | M | `net` font bytes; visual diff of every page |
| O6 | Portrait art-direction crop of the hero for phones (`<source media="(max-width: 47.99rem)">`) | fixes soft hero and shows the cyclist; about +15 to +20 KB on phones | design choice (crop), owner | S | screenshot 390 at 3x |
| O7 | Prefetch internal links with Speculation Rules (`moderate` eagerness) | instant navigation in Chromium only (Safari, Firefox ignore); pages are 20 KB so gain is small | CSP `script-src 'self'` blocks inline rules; needs a header-delivered rules file or `inline-speculation-rules`, untested; legal reviewer should see a CSP change | S | `headers` check, DevTools |
| O8 | Make the first-row `/blog/` thumbnails `eager` | under 50 ms, not LCP | none | XS | audit |
| O9 | Cache icons for 1 day in `_headers` | removes 2 conditional requests per visit | none | XS | `headers` check |
| O10 | After the first Cloudflare Pages deploy: confirm brotli, HTTP/3, header rules, and whether Early Hints use the preload tags | confirms the numbers above hold live | none | S | `curl -sI` and a real-network run |
| not worth it | `content-visibility` (-2.8 ms), merging the CSS (measured slower), preconnect (no third parties), more lazy loading, JS deferral (no JS), CDN for images | | | | |

## 4. Hero options A to E

Measured set-up: the home page copied into a scratch folder, hero replaced as described, served by a tiny static server with HTTP range support (the real review server has none), Chrome at 1440 x 900, network none / fast 4G / slow 4G, `scratch/sim-run.mjs`, `scratch/make-sim.mjs`, results `scratch/sim-results-1440.log`.
Video start rule in the simulation: on the `load` event, `preload=none`, `play()` called by script, video shown on the first presented frame (`requestVideoFrameCallback`) with a 0.6 s fade.

### 4.1 What the owner's idea turned out to be (facts)

| Question | Answer |
| --- | --- |
| Is today's poster the first frame of the video? | **No.** Poster: snow mountains and a cyclist (mean colour 84,109,121). Video frame 0: dark SCOTT drivetrain close-up (53,45,41). Mean pixel difference 76 of 255. The film shows fitting, workshop and consultation (`samples/video-frames-*.jpg`). |
| Does the loop restart cleanly? | No: first and last frame differ by 44 of 255 (a hard cut on restart). A re-cut clip should end where it starts or cross-fade. |
| Visible jump if the poster stays the mountain photo and the video fades in | measured mean difference 25.8 (1440) and 28.7 (390) of 255, 38 to 50 % of values off by more than 24: a visible scene change. |
| Visible jump if the poster is the video's first frame (same crop, `object-fit: cover`, same shade) | measured mean difference **3.3 (1440) and 4.1 (390)** of 255, 2 to 3 % of values off by more than 24 (compression noise): not visible. The video starts at media time 0.02 s. |
| Layout shift at the swap | CLS 0.0000 in all 18 simulation runs (the video is absolutely positioned inside the existing hero box). |
| Is the first frame a good poster? | Literal frame 0: very dark; behind the hero shade the hero becomes nearly black (screenshot checked). The frame at 3.5 s (trainer in the showroom) is brighter and reads as on-brand (`samples/hero-mock-poster-is-frame-3.5s.jpg`). If the clip is re-cut to start there, its first frame is that poster. Text contrast must be re-measured (the `ui` check measures the poster pixels). |
| Poster bytes (AVIF q50) | first frame (1080p source): 12.7 / 19.9 / 30.7 / 41.5 KB at 640 / 960 / 1440 / 1920 px; frame at 3.5 s: 12.9 / 21.5 / 34.6 / 48.2 KB. Today's mountain: 13.1 / 27.0 / 50.8 / 80.4 KB. |
| LCP with that poster | LCP element = the poster image in every run; 44 to 76 ms unthrottled, 232 to 276 ms fast 4G, 700 to 732 ms slow 4G (today 64 / 260 / 804). |

### 4.2 When to start the download (policy; the component restored from `8ac7df1` already does the load-event start, `preload=none`, the 48 rem rule, reduced motion and the connection rules)

| Signal | Use? | Why |
| --- | --- | --- |
| After the `load` event, then `requestIdleCallback` (timeout 2 s) | yes | the poster, CSS and fonts are done; measured request starts at the load event. Idle adds a few ms of safety on slow phones. |
| `preload="none"` plus `play()` from script | yes | no request before the script decides; Chrome then sends exactly one `Range: bytes=0-` request (206) and no more (in every run); the file must be faststart (it is). |
| `preload="metadata"` | no | requests the header at parse time, before `load`; no gain over `none` since the first frame is the poster anyway. |
| `(min-width: 48rem)` and `(pointer: fine)` | yes | tablets and phones never fetch (the 48 rem rule exists; `pointer: fine` is the addition TODO.md names, covers iPads). |
| `prefers-reduced-motion: reduce` | yes | and WCAG 2.2.2: moving content longer than 5 s needs a pause control, so keep the existing pause button. |
| Save-Data, `type: cellular`, `effectiveType` 3g or slower | yes | Chrome and Android only. Measured earlier: desktop Chrome reports 4g even under throttling, so a slow desktop line is not detected; the small clip is the real protection (below). |
| `IntersectionObserver` (hero in view) | optional | only matters if the page is opened scrolled or in a background tab; `document.visibilitychange` (already in the component) covers the tab. The download itself cannot be paused, only aborted by clearing `src`. |
| Battery API / iOS Low Power Mode | no / handle | Battery API is Chrome-only and a fingerprinting source: do not use. iOS Low Power Mode and WebKit refuse muted autoplay (`play()` rejects): the component already catches that and the poster simply stays. Real iOS untested. |
| Browsers without autoplay or H.264 | handle | poster stays; no error shown. |

### 4.3 Measured cost of candidate clips (1440 px, hero first-frame poster page; video 1 request; Chrome)

| Clip (H.264 from Apple's hardware encoder, 25 fps) | Size | Bitrate | Quality vs the 720p master (PSNR) | Call to first frame: none / fast 4G / slow 4G | Stalls (waiting events) fast / slow | Done within 10 s on slow 4G |
| --- | --- | --- | --- | --- | --- | --- |
| today's file, 720p, 13.4 s | 17.67 MiB | 11 Mbit/s | reference | 134 ms / 300 ms / 1408 ms | 15 / 15 | no (2.8 MB of 18 in 14 s) |
| 720p, full 13.4 s | 4.0 MiB | 2.5 Mbit/s | 38 to 44 dB | 24 / 152 / 627 ms | 1 / 29 | no |
| 720p, 8 s | 1.89 MiB | 2 Mbit/s | 36 to 43 dB | 37 / 139 / 476 ms | 2 / 17 | yes (just) |
| **540p, 8 s** | **0.97 MiB** | 1 Mbit/s | 33 to 40 dB | 29 / 139 / 477 ms | 2 / **3** | yes |
| 360p, 6 s | 0.45 MiB | 0.6 Mbit/s | 30 to 36 dB | 35 / 112 / 353 ms | 2 / 3 | yes |
| 540p, 13.4 s, 11.4 MiB (Stage 3 figure, not re-run) | 11.4 MiB | 7 Mbit/s | | | | no |

Reading: a clip is smooth when its bitrate is below the connection (1 Mbit/s plays on a 1.6 Mbit/s line; 2 Mbit/s does not). Quality of the 540p/1 Mbit/s encode looked fine in a crop at 40 % zoom and sits behind a dark shade. These are hardware-encoder numbers: x264 would be about 20 to 30 % smaller at the same quality (expected).
Codecs: **AV1 is much more efficient** (measured as an image: the same 8 s, 24 fps, 960 x 540 as an animated AVIF is 0.26 MiB at q35 and 0.37 MiB at q45 with PSNR 35 to 43 dB, better than the 1 MiB H.264), so a WebM/AV1 `<source>` first and the H.264 MP4 second should land at 0.3 to 0.5 MiB (**expected**, not measurable here: no ffmpeg, `which ffmpeg` is empty). HEVC is not an option (Firefox and Chrome without hardware support). VP9 WebM sits in between (expected 0.5 to 0.7 MiB).
Cloudflare Pages 25 MiB limit: all candidates are far below it (the 17.67 MiB file passes but is 70 % of the limit).
Hosting: Chrome needed one 206 response per load and no further ranges, so range support matters little; Pages is expected to serve `Accept-Ranges` and cache MP4 at the edge, **not verified** (task T5). Put the MP4 in `src/assets/` imported with `?url` so Vite hashes it into `/_astro/` and the existing immutable one-year rule applies; a file in `public/` would be revalidated on every visit. Cloudflare's terms on serving video from the free CDN should be read once for a file this size (not checked).

### 4.4 The options

| | A. Poster only (today) | B. First-frame poster, then the **current** 17.67 MiB video | C. First-frame poster, then a **short small clip** (recommended if motion is wanted) | D. Animated AVIF/WebP, or CSS Ken-Burns | E. Video only on opt-in (play button) |
| --- | --- | --- | --- | --- | --- |
| Bytes per desktop visit | 218 KB at load (+30 KB lazy) | +17.67 MiB (measured 18.1 MB sent when unthrottled) | +0.97 MiB (540p/8 s H.264, measured); +0.3 to 0.5 MiB with AV1 (expected) | animated AVIF 8 s: +0.26 to 0.37 MiB (measured); animated WebP 3 s 12 fps: 0.41 to 0.54 MiB (measured), so WebP is no good; Ken-Burns CSS: +0 | 0 until click, then 0.97 MiB (or the 4.0 MiB 720p full clip if the owner wants sharper) |
| LCP | 64 / 260 / 804 ms (none / fast / slow) | poster is LCP, 244 / 700 ms (fast / slow) | same: 232 to 276 / 700 to 732 ms | same if the animation starts after load; **an animated image used directly as `<img>` would be the LCP and delay it** (needs the whole file) | unchanged |
| CLS | 0 | 0 | 0 (measured, 18 runs) | 0 | 0 |
| Visible jump | none | none (diff 3 to 4 of 255) | none (same) | none for the AVIF (first frame = poster); Ken-Burns has no swap | none until the user clicks |
| Time to motion after load | n/a | 0.3 s fast, 1.4 s slow but then stutters | 0.14 s fast 4G, 0.48 s slow 4G (measured) | AVIF: after its download, about 1 s on fast 4G (expected) | on click |
| Browser/device risk | none | Safari/iOS may refuse autoplay (poster stays); stalls on slow lines; Lighthouse "enormous payload" warning (above 5,000 KiB, expected) | same autoplay caveats (Safari, iOS Low Power Mode, Firefox untested); H.264 plays everywhere; stalls only below 1 Mbit/s | animated AVIF: Chrome measured playing; **Safari and Firefox untested** (a browser that cannot animate shows the first frame = the poster, graceful); no hardware decode; cannot be paused (needs a swap-to-static button for WCAG 2.2.2 if over 5 s); Ken-Burns: none, GPU-composited, exempt from 2.2.2 if it lasts 5 s or less | works wherever the user can press play (a click is a gesture, so iOS accepts it) |
| Data-saver respect | no data at all | no data check helps a slow desktop (Chrome reports 4g) | Save-Data, cellular, 3g, mobile and touch skip it; a 1 MiB clip is acceptable on the rest | same policy for the AVIF; Ken-Burns costs nothing | best: user decides |
| Implementation | none | restore `HeroVideo.astro`, new poster | restore `HeroVideo.astro` (changes below), re-cut clip, new poster, checks | AVIF: a few lines of script and one file; CSS: 10 lines | button, label text (new German text from the owner), same component |
| Checks that change | none | `size`, `net`, `ui` | `size`, `net`, `ui`, `perf` budget | AVIF: `size` (image rules), `net` (late image); CSS: `ui` reduced-motion | `size`, `net` (click scenario), `ui` |
| Feel | calm, static, premium photo; no sense of the stores | not acceptable cost | alive, shows the shop and people; strongest brand signal | AVIF: same as C at a third of the bytes but choppier if 12 fps; CSS: slight life only | optional, easy to miss |
| **Verdict** | **recommended default** (nothing to do) | **reject** | **recommended if the owner wants video**, after the prerequisites in 4.5 | CSS Ken-Burns is a cheap fallback; animated AVIF is a good second choice after a real Safari test | viable if desktop visitors must not pay any bytes; lower value |

What a poster-only site loses: motion, a sense of the shop and its people (the film is the only place they appear), and the "premium" cue competitors use. It gains: 0 bytes, no autoplay quirks, no pause button, no rights questions about the film.

### 4.5 Prerequisites for any video (not performance)

1. Image rights and consent of the people in the film (customers or staff; German KUG and GDPR). Owner, lawyer.
2. Visible SCOTT lettering on frame 0 and in the clip. Scott is not one of the seven brands on the site. Owner decides (cut the shot or accept).
3. Who owns the footage (a photographer's licence is already open for the `DAY2_*` photos, `docs/TODO.md`).

## 5. Staged implementation plan for the recommended path

Stage 0 owner decisions (blocking Stage 2 only): D1 keep A or build C; D2 which shot starts the clip (recommend the 3.5 s trainer shot; literal frame 0 is near-black); D3 accept that the hero look changes from mountain to showroom (a cut from the mountain photo to the film is not recommended: visible jump); D4 prerequisites 4.5; D5 permission to install ffmpeg on the engineering machine (a tool, not a repo dependency; without it the clip is H.264 only, via `scratch/enc.swift`, and AV1 stays an estimate); D6 AVIF quality (O3).

### Stage 1: small, independent wins (no hero change)

| Task | Goal and acceptance | Files | Out of scope |
| --- | --- | --- | --- |
| T1 `sizes` | Service blocks: add the tablet band (measure the real width at 800, 900, 1000, 1023 px; at 768 it is 344 px). Post covers on phones `calc(100vw - 2rem)`. Acceptance: `scratch/an2.mjs` reports waste 0 for 768@1, 768@2, 390@2 (today 66 KB on home at 768 1x); home at 768 px image bytes 165 to about 100 KB; `npm run verify` green (the preload `sizes` must stay in sync; `net` checks no double fetch). | `src/lib/preload.ts` (SERVICE, POST), `src/components/ServiceBlock.astro`, post pages if they hard-code sizes | quality settings, hero |
| T2 optional AVIF quality (D6) | Set q45; owner compares hero, Ueber uns banner, one post. Acceptance: image bytes home 1440 about -17 %; no photo looks worse to the owner. | image config or the `quality` prop | WebP/JPEG fallbacks |
| T3 cheap headers | Add 1-day caching for `/favicon.ico` and `/apple-touch-icon.png`; `eager` for first-row `/blog/` thumbnails. Acceptance: `headers` and `size` green. | `public/_headers`, `src/pages/blog/*` | CSP |
| T5 live check (after the first Pages deploy; owner or engineer with dashboard) | `curl -sI` shows brotli on HTML and CSS, h2/h3, the `_headers` rules, `Accept-Ranges` on a test MP4 if C is built, `Cache-Control` immutable on `/_astro/`. Run `perf` against the preview URL from a normal connection. | none | |

### Stage 2: hero C (only after D1 to D4)

| Task | Goal and acceptance | Files | Out of scope |
| --- | --- | --- | --- |
| H1 clip and poster | Re-cut an 8 s loop from the HEVC master (`.conversion/video-download/VidOne.mp4`) starting at the chosen shot; no hard cut on restart (end near the start or a 0.5 s fade); 960 x 540 H.264 High, faststart, no audio, at or under 1.0 MiB; optional AV1 WebM at or under 0.5 MiB (listed first in `<source>`). Poster = frame 0 of exactly this clip from the 1080p source as the hero photo (replaces `hero.jpg`, same `<Picture>` path, so the preload logic stays). Acceptance: poster 1440 AVIF at or under 40 KB; `node tools/mp4-info.mjs` says faststart, avc1, no audio. | `src/assets/photos/hero.jpg` (replace), `src/assets/video/hero.mp4` (new, imported with `?url`) | stock changes to other photos |
| H2 component | Restore `HeroVideo.astro` from `git show 8ac7df1:src/components/HeroVideo.astro`; changes: add `(pointer: fine)` to `allowed()`, start after load via `requestIdleCallback`, set `is-playing` on the first `requestVideoFrameCallback` (fallback: `playing`) so no black frame, 0.6 s opacity fade, source from the hashed asset URL, keep `preload="none"` (no request until `play()`), keep the pause button and its two existing German labels and the Save-Data/cellular/3g/reduced-motion rules. No new dependency. | `src/components/HeroVideo.astro`, `src/pages/index.astro` | text, any other page |
| H3 checks | `size`: allow exactly one video file in `dist/` of at most 1.2 MiB and exactly one `<video>` on `/` with `muted loop playsinline preload=none`, no `autoplay`, no `<source>` elsewhere. `net`: no video request before `load`; at 1440 exactly one video request after `load`; at 390, with reduced motion, and with mocked saveData/cellular/3g/2g none (the five cases removed in `ea77c8a`: `git show ea77c8a` shows the old text to restore); the "file fetched twice" rule must not flag the 206 response. `ui`: restore the pause-button and reduced-motion assertions removed in `ea77c8a`; the text-on-photo measurement runs on the poster and on frames at 5 %, 25 %, 50 %, 75 %, 95 % of the clip (h1 3:1, eyebrow and ghost button 4.5:1); the hero shade may need retuning for the new picture. Update `docs/TODO.md` (Hero video), `docs/third-party.md` if needed, decision row in `docs/plan.md`. | `tools/checks/{size,net,ui}.mjs`, docs | |
| H4 measure and gate | Acceptance (home 1440 unless stated): **0 video requests before the load event**; transfer before load at most 200 KB (poster 31 KB instead of 51 KB, today 218 KB); LCP element is the poster, at most 300 ms at fast 4G and 850 ms at slow 4G (today 260 / 804); CLS 0 at none, fast, slow; exactly 1 video request, at most 1.0 MiB (H.264) or 0.5 MiB (AV1); first video frame at most 1 s after `load` at fast 4G and 2 s at slow 4G; at most 4 stalls on slow 4G; pixel difference of the swap at most 5 of 255 (`scratch/jump.mjs`); 390 px: 0 video bytes and the page as light as today (at most 120 KB). `npm run verify` and `npm test` green. | `tools/perf.mjs` (already counts `video`), scratch scripts | |
| Rollback | One commit for H1 to H3; `git revert` restores the poster-only hero and the "no video" assertions (`ea77c8a` is the model). The old `hero.jpg` stays in history. Kill switch without redeploy of code: none (static site), so keep the revert ready. | | |

Order: T1, T3 (any time) -> D1 to D4 -> H1 -> H2 -> H3 -> H4 -> T5. Stage 1 and Stage 2 touch different files except `src/lib/preload.ts` (poster `HERO` constants): do T1 first.

## 6. Risks and what could not be checked

- **Not tested:** real Safari and iOS (autoplay, Low Power Mode, animated AVIF), Firefox (Playwright's Firefox does not start here), Android Chrome (Save-Data, cellular), real devices and CPU (decode cost of video and of animated AVIF), a deployed Cloudflare Pages (ranges, MP4 caching, HTTP/3, Early Hints, compression, brotli), Lighthouse (not installed; a 1 MiB clip should stay under its 5,000 KiB payload warning, a 17.7 MiB one would not: expected).
- Video numbers come from Apple's hardware H.264 encoder (no ffmpeg, no x264, no AV1/VP9 video encoder here). AV1 savings are demonstrated through the animated AVIF, not through a video file. x264 and AV1 should be smaller; the target sizes in H1 are therefore safe upper bounds.
- The simulation page is a copy of `dist/` with the hero replaced; the real component, CSP and `_headers` were not applied. Network emulation is CDP throttling on localhost, not a real radio. Single run per video scenario (runs of the baseline: 3). `fps` and the stall counts are relative figures.
- The 25 MiB Pages limit and the terms of serving video through Cloudflare are from the brief, not re-checked.
- Desktop Chrome reports `effectiveType` 4g even when throttled, so the connection check does not protect a slow desktop; that is why the clip size, not the check, is the safeguard.
- Tablets: the band 768 to 1023 px was measured only at 768 px.
- Legal and rights questions in 4.5 are open and not mine to decide.

## 7. How this was measured (for repeatability)

- Build: `cd website && source ~/.nvm/nvm.sh && nvm use 22.23.4 && npm run build` (rebuilds the git-ignored `dist/`); review server on :4321 was already running; nothing was requested from `//`.
- Every browser run registered the abort route for non-local requests last (`abortForeign` from `tools/lib/browser.mjs`) and counted attempts: **0 requests to any third party were attempted**; bike-one.org and the embed hosts were never contacted.
- Scripts in `scratch/`: `audit-images.mjs` + `an1.mjs` + `an2.mjs` (image audit), `perf2.mjs` (copy of `tools/perf.mjs` with blocking, FCP, 3 runs), `cv.mjs` (content-visibility), `img-q.mjs`, `img-all.mjs`, `poster-enc.mjs` (quality tables), `enc.swift` (AVFoundation encoder with a bitrate argument: build with `swiftc -O -o encoder enc.swift`; `/usr/bin/avconvert` has presets only), `extract*.mjs` (frames from the video in Chrome), `quality.mjs`, `psnr*.mjs`, `make-sim.mjs`, `sim-run.mjs`, `jump.mjs`, `serve.mjs`.
- Heavy files (candidate MP4s, frames, animated AVIFs, `dist/` copy) were moved out of the repository to the session scratch folder `/private/tmp/claude-501/-Users-timo-alts-dev-bike-one-shop/aa170a22-13b0-4ee8-a900-0d065cfc8013/scratchpad/pm/` and may disappear; the recipes above recreate them. `.working-files` is committed: nothing large or personal is in it (`samples/` holds three small JPEG stills of the footage and the site).
