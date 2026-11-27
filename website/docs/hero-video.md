# Hero film and poster

The home hero plays a short, silent clip behind the headline (decision d83). Its first frame is the poster photo, so the swap is invisible.
How the page loads it: `src/components/HeroVideo.astro` (the rules), `src/components/HeroPoster.astro` (the poster).

## Files

| File | What | Tracked |
| --- | --- | --- |
| `public/hero.webm` | AV1, 1280x720, 24 fps, 8.0 s, no audio, about 0.49 MiB | yes |
| `public/hero.mp4` | H.264 High, `avc1`, 1280x720, 24 fps, 8.0 s, no audio, faststart, about 0.67 MiB | yes |
| `src/assets/photos/hero-poster.jpg` | frame 0 of the clip from the 1080p source, 1920x1080 | yes |
| `src/assets/photos/hero-poster-portrait.jpg` | the same frame cropped to 864x1080 (x 566 to 1430), for phones | yes |
| `.conversion/video-download/VidOne.mp4` | the HEVC original, 1920x1080, 60 fps, full range (`yuvj420p`, BT.709), 13.4 s | no, git-ignored, only on the machine that has it |
| `.local/hero.mp4` | the old 720p H.264 encode of the whole film, 17.67 MiB | no, git-ignored |

The browser takes the first `<source>` it plays: the page picks `hero.webm` where `canPlayType('video/webm; codecs="av01.0.05M.08"')` is not empty,
else `hero.mp4` (Safari without AV1, old browsers). Both are listed in `data-webm` and `data-mp4` of the `<video>`; the `src` is set by the script
only when playback starts. `public/_headers` keeps `media-src 'self'`.

## The cut

The film (13.4 s) is a showroom reel: drivetrain close-up (0 to 2.4 s), a woman on a fitting trainer with a man at the left (2.5 to 3.9 s), handlebar
fitting (4 to 8.5 s), a consultation at a desk with a configurator on the monitor (8.5 to 13.4 s). Frame 0 of the film is a near-black SCOTT drivetrain,
no hero frame, so the clip starts at the trainer shot.

- In: 3.5 s of the source (frame 84 at 24 fps), the poster is exactly this frame.
- Out: 11.5 s, 8.0 s in total.
- Loop: seamless, no cut. The last 0.5 s is a dissolve of the source at 11.0 to 11.5 s (the desk scene) into the source at 3.0 to 3.5 s (the trainer
  shot just before the start), so the last frame of the clip is the frame before 3.5 s and the loop restarts on 3.5 s. The video element uses `loop`.
- The SCOTT lettering is visible on the bike in the trainer shot (owner accepted it for now, `docs/TODO.md`).

## Encoding (ffmpeg 9.1, libx264, libsvtav1)

One lossless 720p master with the cut and the dissolve, then the two encodes from it. The source is full range (`yuvj420p`); the master is limited
range `yuv420p` tagged BT.709, which is what every browser expects of a video.

```
V=.conversion/video-download/VidOne.mp4
ffmpeg -y -i $V -an -filter_complex "
[0:v]fps=24,scale=1280:720:flags=lanczos+accurate_rnd+full_chroma_int:in_range=pc:out_range=tv,format=yuv420p,split=3[s1][s2][s3];
[s1]trim=3.5:11.0,setpts=PTS-STARTPTS[a];
[s2]trim=11.0:11.5,setpts=PTS-STARTPTS[b];
[s3]trim=3.0:3.5,setpts=PTS-STARTPTS[c];
[b][c]blend=all_expr='A*(1-T/0.5)+B*(T/0.5)'[x];
[a][x]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v ffv1 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv master.mkv

TAGS="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
ffmpeg -y -i master.mkv -an -c:v libsvtav1 -preset 2 -crf 40 -g 240 -pix_fmt yuv420p $TAGS hero-av1.webm
ffmpeg -y -i hero-av1.webm -c copy -cues_to_front 1 public/hero.webm
ffmpeg -y -i master.mkv -an -c:v libx264 -preset veryslow -crf 28 -profile:v high -pix_fmt yuv420p $TAGS -movflags +faststart -tag:v avc1 public/hero.mp4
```

Posters (frame at 3.5 s, converted with the BT.709 matrix to full-range RGB, then JPEG at `-q:v 2`):

```
ffmpeg -y -ss 3.5 -i $V -frames:v 1 -vf "scale=in_range=pc:in_color_matrix=bt709:out_range=pc:out_color_matrix=bt709,format=rgb24" poster.png
ffmpeg -y -i poster.png -q:v 2 -pix_fmt yuvj420p src/assets/photos/hero-poster.jpg
ffmpeg -y -i poster.png -vf "crop=864:1080:566:0" -q:v 2 -pix_fmt yuvj420p src/assets/photos/hero-poster-portrait.jpg
```

`node tools/mp4-info.mjs public/hero.mp4` must say `avc1`, faststart and no audio. After a re-encode, run `npm run verify` (the `size` check holds each
video to 1.0 MiB and to the home page, `net` counts the requests, `ui` measures text contrast on the poster and on frames of the clip and the
difference between the poster and the first video frame).

## Why these numbers

Measured while choosing (PSNR against the lossless master, same 8 s): H.264 720p crf 26 0.83 MiB 44.0 dB, crf 28 0.67 MiB 42.9 dB; AV1 720p preset 2
crf 40 0.49 MiB 45.4 dB (45 % smaller than H.264 crf 26 at higher quality); VP9 crf 36 0.73 MiB 44.5 dB (not shipped: 12 % smaller only). H.264 540p crf 26
is 0.55 MiB. The old 13.4 s, 17.67 MiB file stalled on a fast 4G line; a clip should stay below 1 Mbit/s (8 s at 0.49 MiB is 0.5 Mbit/s).
