"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useProductOptionsContext } from "@modules/products/components/product-options-context"

type BikeOneGalleryProps = {
  product: HttpTypes.StoreProduct
}

/**
 * Gallery photos for the shopper's *current* selection, swipeable and
 * clickable via the thumbnails, plus the honest "Produktfoto folgt"
 * placeholder when the product has no photo at all.
 *
 * Two kinds of image:
 * - tagged (`image.metadata.option_title` / `option_value`): shown only
 *   while that option value is selected (read via `getOptionValueByTitle`,
 *   shared with `ProductActions` through `ProductOptionsProvider`). Nothing
 *   is hardcoded to "Farbe", per PLAN.md Task 13's "gap surfaced by the
 *   real assets" note.
 * - untagged: shared photos (detail shots, ...), shown for every selection
 *   after the tagged ones, and instead of the placeholder when the
 *   selection has no tagged photo.
 */
const BikeOneGallery = ({ product }: BikeOneGalleryProps) => {
  const { getOptionValueByTitle } = useProductOptionsContext()
  const trackRef = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const [active, setActive] = useState(0)

  const all = product.images ?? []
  const isTagged = (image: HttpTypes.StoreProductImage) =>
    typeof image.metadata?.option_title === "string" &&
    typeof image.metadata?.option_value === "string"
  const images = [
    ...all.filter(
      (image) =>
        isTagged(image) &&
        getOptionValueByTitle(image.metadata!.option_title as string) ===
          image.metadata!.option_value
    ),
    ...all.filter((image) => !isTagged(image)),
  ]

  const selectedColor = getOptionValueByTitle("Farbe")

  // A new selection shows a different set of photos: start at the first one.
  const imageKey = images.map((image) => image.id).join()
  useEffect(() => {
    setActive(0)
    trackRef.current?.scrollTo({ left: 0, behavior: "instant" })
  }, [imageKey])

  const goTo = (index: number) => {
    const track = trackRef.current
    if (!track) return
    const next = Math.min(Math.max(index, 0), images.length - 1)
    // Smooth only where the shopper allows motion (motion-safe:scroll-smooth on the track).
    track.scrollTo({ left: next * track.clientWidth })
  }

  const onScroll = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const track = trackRef.current
      if (track) setActive(Math.round(track.scrollLeft / track.clientWidth))
    })
  }

  if (images.length > 0) {
    const arrow =
      "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-bo-line bg-bo-surface/90 text-bo-ink shadow-sm hover:border-bo-accent hover:text-bo-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-bo-accent disabled:cursor-default disabled:opacity-40 disabled:hover:border-bo-line disabled:hover:text-bo-ink md:flex"

    return (
      <div className="md:sticky md:top-[140px]">
        <div className="relative overflow-hidden rounded-xl border border-bo-line bg-bo-surface-2">
          <div
            ref={trackRef}
            onScroll={onScroll}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") goTo(active - 1)
              else if (e.key === "ArrowRight") goTo(active + 1)
              else return
              e.preventDefault()
            }}
            tabIndex={images.length > 1 ? 0 : undefined}
            role="group"
            aria-roledescription="Karussell"
            aria-label={`${product.title} Bilder`}
            className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bo-accent motion-safe:scroll-smooth [&::-webkit-scrollbar]:hidden"
          >
            {images.map((image, i) => (
              <div
                key={image.id}
                className="relative aspect-[4/3] w-full shrink-0 snap-center"
              >
                <Image
                  src={image.url}
                  alt={
                    selectedColor
                      ? `${product.title} — ${selectedColor}`
                      : product.title
                  }
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Vorheriges Bild"
                disabled={active === 0}
                onClick={() => goTo(active - 1)}
                className={`${arrow} left-2`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Nächstes Bild"
                disabled={active === images.length - 1}
                onClick={() => goTo(active + 1)}
                className={`${arrow} right-2`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <span
                aria-live="polite"
                className="absolute bottom-2 right-2 rounded-full bg-bo-ink/70 px-2 py-0.5 font-mono text-[11px] text-bo-bg md:hidden"
              >
                {active + 1} / {images.length}
              </span>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-2.5 hidden gap-2 overflow-x-auto md:flex">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                aria-label={`Bild ${i + 1} von ${images.length}`}
                aria-current={i === active}
                onClick={() => goTo(i)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bo-accent ${
                  i === active
                    ? "border-bo-accent ring-1 ring-bo-accent"
                    : "border-bo-line hover:border-bo-line-strong"
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="md:sticky md:top-[140px]">
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-bo-line bg-bo-surface-2 [background-image:repeating-linear-gradient(135deg,var(--bo-line)_0px,var(--bo-line)_1px,transparent_1px,transparent_9px)]">
        <div className="text-center font-mono text-[11px] uppercase tracking-wide text-bo-ink-faint">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto mb-2 h-8 w-8"
          >
            <path d="M15.3 3.2H4.7c-.8 0-1.5.7-1.5 1.5v10.6c0 .8.7 1.5 1.5 1.5h10.6c.8 0 1.5-.7 1.5-1.5V4.7c0-.8-.7-1.5-1.5-1.5Z" />
            <path d="M7.9 9.2a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />
            <path d="M16.7 12.6 13 9.2 5 16.7" />
          </svg>
          {selectedColor
            ? `Produktfoto folgt — Farbe: ${selectedColor}`
            : "Produktfoto folgt"}
          <br />
          {product.title}
        </div>
      </div>
    </div>
  )
}

export default BikeOneGallery
