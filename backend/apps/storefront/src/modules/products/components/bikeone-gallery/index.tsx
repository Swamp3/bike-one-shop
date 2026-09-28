"use client"

import { useProductOptionsContext } from "@modules/products/components/product-options-context"

/**
 * Single placeholder image — products have no real photos yet (no source to
 * pull them from without fabricating URLs). Matches wireframe's gallery-main
 * treatment, minus the thumbnail row, since there's nothing to switch
 * between with one placeholder.
 *
 * It does read the shopper's selected color (via `ProductOptionsProvider`,
 * shared with `ProductActions`) and reflects it in the caption — there is
 * still no real photo to swap, but the color selection's effect on the
 * gallery is real rather than a no-op.
 */
const BikeOneGallery = ({ title }: { title: string }) => {
  const { getOptionValueByTitle } = useProductOptionsContext()
  const selectedColor = getOptionValueByTitle("Farbe")

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
          {title}
        </div>
      </div>
    </div>
  )
}

export default BikeOneGallery
