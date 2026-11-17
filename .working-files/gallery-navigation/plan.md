# PDP gallery: navigate between images

## Cause
`modules/products/components/bikeone-gallery/index.tsx` has no selection state:
- main image is hardcoded `matchedImages[0]`
- the thumbnail strip is plain `<div>`s, no click handler, not focusable
- no arrows, swipe or keyboard
Only images whose `metadata.option_title/option_value` match the current selection are shown at all. Woo import
tags one image per colour, so most colours have exactly 1 photo (strip hidden). Only e.g. Tarmac SL9 "Gloss
Charcoal Tint" has 2 (woo ids 3650 + 3648), so that is where the dead strip is visible. The untagged main image
(rank 0) is never shown.

## Plan (one file: bikeone-gallery/index.tsx)
1. Main area = horizontal scroll-snap track (`snap-x snap-mandatory overflow-x-auto`) with one slide per image.
   Native swipe on mobile, trackpad/shift-wheel on desktop, no touch-handler code.
2. Thumbnails become `<button>`s (aria-label "Bild n von N", `aria-current` on the active one, accent border);
   click calls `track.scrollTo({ left: i * width, behavior: "smooth" })`.
3. Active index from the track's scroll position (`onScroll`, rAF-throttled, `round(scrollLeft / width)`).
   Reset to 0 when the matched image set changes (colour switch), keyed on the image ids.
4. Prev/next buttons on the main image, hidden when only 1 image; ArrowLeft/ArrowRight when the gallery has focus.
5. First slide keeps `priority`, the rest lazy. Keep `aspect-[4/3]`, `object-contain`, sticky wrapper.
6. Counter "2 / 5" under the track on mobile instead of thumbnails (thumbnails stay desktop, md:flex).

## Open decision: untagged images
Today untagged images are dropped. Proposed convention: untagged = shared photos (detail shots), shown after the
colour-specific ones, and used instead of "Produktfoto folgt" when a colour has none. Catch: the Woo import's
untagged main image is a single colour's photo, so it would show a wrong-colour bike for other colours. Options:
a) adopt the convention and retag the Woo main images (or ignore it, Woo data is throwaway)
b) leave as is; only tagged images appear.

## Out of scope
Zoom/lightbox, video, admin UI for tagging images (still metadata by hand), SSR of gallery for crawlers.

## Verify
Dev server: Tarmac SL9 with Gloss Charcoal Tint (2 images): click thumbs, arrows, swipe in devtools mobile mode,
switch colour resets to first image. Check keyboard focus order and `prefers-reduced-motion` (no smooth scroll).
