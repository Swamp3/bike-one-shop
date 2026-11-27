# Plan: serve the hero video from this site

Owner request: the hero background video was only on the live host (`//bike-one.org/VidOne.mp4`). Download it, serve it from the rebuild, make sure it plays without a click. Work happens in `website/` (own git repo, branch `astro-rebuild`, see `website/CLAUDE.md`).

## Facts (verified 2026-11-25)

- Downloaded once from the live site by the main session (the owner authorised it):
  `website/.conversion/video-download/VidOne.mp4`, 27,844,858 bytes (26.55 MiB), sha256 `dbe82493f81ce8cabc65b0e50c5933eaf1ca18ad93b3a444cfad74757dd4b7e7`.
  Atoms: `ftyp, moov (at the front, so it streams), mdat`. Video codec: **HEVC (`hvc1`)**, no audio track. Live served it with `accept-ranges: bytes`.
- Do NOT request bike-one.org again. The live site is read-only and the file is already here.
- Cloudflare Pages rejects files over 25 MiB (26,214,400 bytes). This file is 1.6 MiB over.
- HEVC plays in Safari and, on macOS/with hardware support, in Chrome; it does not play in Firefox, in Chromium builds without HEVC, or on Windows without the HEVC extension. Playwright's bundled Chromium cannot play it; use `channel: 'chrome'` and `webkit`.
- Other local video, not the hero: `website/public/wp-content/uploads/2025/10/Unbenanntes-Video.mp4` (96 MB, H.264, moov at the END, 38.8 s). Do not swap it in without the owner's say.
- Where the URL lives: `<rs-bgvideo ... data-mp4="//bike-one.org/VidOne.mp4">` in the Revolution Slider markup of `/` and `/main-bike/` (two slides each). The markup is produced by `website/tools/extract.mjs` from `website/capture/pages/*.html` into `website/src/content/pages/*.html`. Never edit `src/content` by hand; change the extractor and rerun `node tools/extract.mjs`.
- The extractor already rewrites same-origin asset URLs (`ORIGIN_RE`, `FILE_RE`) to root-relative, but only for `src/srcset/href`, inline `style` and `data-*` values under `/wp-content/` and `/wp-includes/`. `data-mp4="//bike-one.org/VidOne.mp4"` is at the site root, so it is untouched.
- Decision d25 (hero autoplay script `hero-video-autoplay`, added by the extractor to `/` and `/main-bike/`) already starts the muted video in WebKit. It must keep working.
- Gates: `npm run build` then `npm run verify` (10 gates, all pass today). `routes` flags any built file the baseline does not list; `/VidOne.mp4` is such a file, so it needs `--allow-extra /VidOne.mp4` or another gate-accepted record (read `website/scripts/verify/routes.mjs --help`, `docs/plan.md` and `exceptions.json` conventions; `npm run verify -- --allow-extra ...` forwards the flag). Media gate: root files outside `/wp-content/uploads/` are checked in `dist/`.
- Existing test scripts: `.working-files/hero-video/tests/hero-chrome.mjs` and `hero-webkit.mjs` (Playwright; they start a range-capable server on :4399 and map bike-one.org to it; adapt them to serve `VidOne.mp4` and, after the change, to load `http://localhost:4321/VidOne.mp4` directly). The review server: `npm run review:serve -- --background --port 4321` (serves `dist/`; stop it with `--stop` when done). Node: `source ~/.nvm/nvm.sh && nvm use 22.23.4`.

## Tasks

1. **Put the file in the build.** Copy the download to `website/public/VidOne.mp4` (byte-identical, check the sha256). Keep the original in `.conversion/video-download/` (ignored by git).
2. **Point the slider at it.** In `tools/extract.mjs` rewrite `data-mp4` / `data-webm` / `data-ogv` values that point at the live origin to root-relative (`/VidOne.mp4`). Rerun the extractor, rebuild, confirm no `bike-one.org/VidOne.mp4` remains in `src/content`, `dist` or the inline slider JSON.
3. **Gates.** Make `npm run verify` pass again with the new root file, using the least invasive accepted mechanism. Document it in `website/docs/plan.md` (Decisions table; add a row with `node ../../astro-conversion-kit/skills/convert-site/scripts/state.mjs --dir . decision '{...}'` style call used earlier: see `website/.conversion/state.json` decisions d21 to d25 for the shape) and keep `PUBLIC_INDEXABLE=true npm run verify:release` passing.
4. **Playback proof.** With the review server on :4321, prove the video starts without any click in system Chrome and in Playwright WebKit (report `paused`, `currentTime`, `readyState`, opacity of the `rs-slide video` elements at +2 s, +4 s, +6 s, no click). Report honestly which browsers cannot play HEVC; do not claim a pass for a browser you could not run.
5. **Size and compatibility.** The file is over the Cloudflare Pages 25 MiB limit and is HEVC-only. Check whether `ffmpeg` exists (`which ffmpeg`). Do NOT install software. If it exists: make an H.264 (`avc1`, `-movflags +faststart`, no audio, same dimensions) version under 24 MiB, serve it as an additional source (`data-webm` is not needed; Revolution Slider reads `data-mp4` and the extractor can emit a second source only if the slider supports it, check `public/wp-content/plugins/revslider/sr6/assets/js/rs6.min.js`) and say which file wins in which browser. If it does not exist: stop at the facts and write the options (install ffmpeg, upload to R2 and link it, trim/recompress elsewhere, deploy with Wrangler excluding the file and serving it from R2) in `.working-files/hero-video/notes.md` with a recommendation. Either way the repo must build and pass the gates, and the file must never block a Pages deploy silently: say clearly in the notes that `wrangler pages deploy` will fail on the 26.55 MiB file unless it is shrunk or served elsewhere.
6. **Close out.** Commit in `website/` on `astro-rebuild` with a Conventional Commit message (`feat: serve the hero video locally`), no push, no merge, never on `main`. Append what you changed to `.working-files/hero-video/notes.md`. Do not touch the repo root outside `.working-files/hero-video/`.

## Out of scope

- Replacing the hero video with a different clip, restyling the hero, the SEO findings, the WooCommerce/console probe, the visual diff re-run.
- Anything that contacts bike-one.org.

## Done when

`/VidOne.mp4` is served by the build, the slider markup points at it, `npm run build && npm run verify` and the release verify pass, playback proof is reported per browser, and the size/compat situation is written down with the commit hash.
