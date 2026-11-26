# Hero video: notes

## What changed (website/, branch astro-rebuild, commit `feat: serve the hero video locally`)

- `public/VidOne.mp4`: byte-identical copy of `.conversion/video-download/VidOne.mp4` (sha256 `dbe82493...b7e7`, 27,844,858 bytes). `.conversion/video-download/` is now in `.gitignore` (it was not ignored before; the original stays on disk, uncommitted).
- `tools/extract.mjs`: `data-mp4|webm|ogv` values are made root-relative (`VIDEO_ATTR`). `node tools/extract.mjs` rewrote the four `rs-bgvideo` tags in `src/content/pages/home.html` and `main-bike.html` to `data-mp4="/VidOne.mp4"`. Nothing else in `src/content` changed. No `bike-one.org/VidOne.mp4` remains in `src/content` or `dist`.
- Gates: `/VidOne.mp4` is not in the baseline, so the routes gate lists it as an extra. The only accepted mechanism is `--allow-extra`, so `package.json` now passes `--allow-extra /VidOne.mp4` in `verify`, `verify:proposals` and `verify:release`. `docs/LAUNCH.md` commands that give their own `--allow-extra` now list `/VidOne.mp4,/thank-you/` (a later flag replaces the one in package.json). Decision d26 is in `docs/plan.md` and `.conversion/state.json`; it supersedes the "absolute live URL" part of d25. The d25 autoplay script is untouched.
- Test: `tests/hero.mjs chrome|webkit` replaces the two old scripts (they served the other video through a fake bike-one.org).

## Playback (review server :4321, no click, `/`)

Both ran against `http://localhost:4321/VidOne.mp4`; the server answers 200 without range support, and both browsers played anyway. No request went to bike-one.org.

| Browser | hvc1 canPlayType | +2 s | +4 s | +6 s |
| --- | --- | --- | --- | --- |
| system Chrome 158 (macOS, hardware HEVC) | probably | paused=false, t=2.01, ready=4, opacity 1 | t=4.01, same | t=6.02, same |
| Playwright WebKit 27.2 | probably | paused=false, t=1.75, ready=4, opacity 1 | t=3.76 | t=5.77 |

Not tested: Firefox, Chromium without HEVC (Playwright's bundled Chromium), Chrome on Windows/Linux without HEVC support, Android, iOS Safari, Low Power Mode, `/main-bike/` (same markup, not run), a real Cloudflare Pages response. Expect no video (poster only) in Firefox and in any browser without HEVC decoding. This is the same as the live site today.

## Size and compatibility: still open

- `ffmpeg` is not installed (`which ffmpeg` and `ffprobe` empty); nothing was installed, so no H.264 version exists.
- The file is 26.55 MiB, 1.6 MiB over the 25 MiB (26,214,400 bytes) Cloudflare Pages per-file limit. **`npx wrangler pages deploy dist` will fail on `dist/VidOne.mp4` until the file is shrunk or served from elsewhere.** Git-connected Pages builds fail the same way. The gates do not check this limit.
- Revolution Slider (`rs6.min.js`) builds `<source>` tags from `data-mp4`, `data-webm` and `data-ogv`, so a second format is possible, but the HEVC file is the mp4 source; an H.264 file has to replace it (or sit in `data-webm` as VP9, which needs an encoder too).

Options:
1. Re-encode to H.264 `avc1`, `-movflags +faststart`, no audio, same dimensions, under 24 MiB, and replace `public/VidOne.mp4`. Plays everywhere, fits Pages. Needs an encoder: ffmpeg (install, owner's call), HandBrake, or macOS `avconvert` which is already at `/usr/bin/avconvert` (not run; its output size and faststart layout must be checked). Cost: lower quality at that size, a changed file.
2. Upload the file to R2 (public bucket on a custom domain, range requests work), point `data-mp4` at that URL via the extractor. Keeps HEVC as is, so Firefox still gets no video. Needs R2 and a domain; adds a third-party-ish host to `docs/third-party.md`.
3. Keep the file in `public/` but deploy with Wrangler while excluding it from `dist/` and serve it from R2 (same as 2, with a build step to drop the file).
4. Trim or re-encode HEVC smaller (a 10 s loop at lower bitrate): smaller, still HEVC-only.

Recommendation: option 1 (H.264, under 24 MiB). It fixes both the limit and the Firefox/Windows gap with no new hosting. Until then, do not deploy this branch to Pages.

## Repo size note

`public/VidOne.mp4` (26.55 MiB) is committed in the website repo (6e06eac), so a fresh clone serves the video. It is in history now; if the owner picks option 1 or 2 before any push, amend or squash it out of that commit first so a 26 MiB HEVC blob never reaches the remote.
