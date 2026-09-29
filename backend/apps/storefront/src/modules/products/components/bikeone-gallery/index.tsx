"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useProductOptionsContext } from "@modules/products/components/product-options-context"

type BikeOneGalleryProps = {
  product: HttpTypes.StoreProduct
}

/**
 * Real per-option-value gallery photos, when the seed data has one tagged
 * for the shopper's *current* selection — plus the honest "Produktfoto
 * folgt" placeholder for every product/option-value that has none (which,
 * as of this task, is every product except Wilier Adlar's Farbe values).
 *
 * The match is generic: any image whose `image.metadata.option_title` /
 * `option_value` equals the currently selected value for that option
 * (read via `getOptionValueByTitle`, shared with `ProductActions` through
 * `ProductOptionsProvider`) is shown. Nothing here is hardcoded to
 * "Farbe" or to this product — a future real Schaltung (or any other
 * option) photo tagged the same way works with no code change, per
 * PLAN.md Task 13's "gap surfaced by the real assets" note.
 */
const BikeOneGallery = ({ product }: BikeOneGalleryProps) => {
  const { getOptionValueByTitle } = useProductOptionsContext()

  const matchedImages = (product.images ?? []).filter((image) => {
    const optionTitle = image.metadata?.option_title
    const optionValue = image.metadata?.option_value
    if (typeof optionTitle !== "string" || typeof optionValue !== "string") {
      return false
    }
    return getOptionValueByTitle(optionTitle) === optionValue
  })

  const selectedColor = getOptionValueByTitle("Farbe")

  if (matchedImages.length > 0) {
    const mainImage = matchedImages[0]

    return (
      <div className="md:sticky md:top-[140px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-bo-line bg-bo-surface-2">
          <Image
            src={mainImage.url}
            alt={
              selectedColor ? `${product.title} — ${selectedColor}` : product.title
            }
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
        {matchedImages.length > 1 && (
          <div className="mt-2.5 flex gap-2">
            {matchedImages.map((image) => (
              <div
                key={image.id}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-bo-line"
              >
                <Image
                  src={image.url}
                  alt={product.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
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
