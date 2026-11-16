import { HttpTypes } from "@medusajs/types"
import Image from "next/image"

import { swatchColor } from "@lib/util/color-swatches"
import { getProductPrice } from "@lib/util/get-product-price"
import { variantPrices } from "@lib/util/product-filters"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PriceNote from "@modules/products/components/price-note"
import PlaceholderImage from "@modules/common/icons/placeholder-image"

const MAX_DOTS = 6

const optionValues = (product: HttpTypes.StoreProduct, title: string) =>
  product.options
    ?.find((o) => o.title === title)
    ?.values?.map((v) => v.value)
    .filter(Boolean) ?? []

/**
 * BikeOne product card. Fixed body slots (colours, brand, title, groupset,
 * price) render even when empty, so cards in a grid row line up. No stock
 * badge until TriCon stock sync is live (PLAN.md Task 14).
 */
export default function BikeOneProductCard({
  product,
  priority,
}: {
  product: HttpTypes.StoreProduct
  priority?: boolean
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const hasPriceRange = new Set(variantPrices(product)).size > 1
  const image = product.thumbnail || product.images?.[0]?.url
  const colors = optionValues(product, "Farbe")
  const groupsets = optionValues(product, "Schaltung")

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-bo-line bg-bo-surface transition-colors hover:border-bo-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bo-accent"
    >
      {/* Fixed light grey in dark mode too: multiply would darken the bike on a dark stage. */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#f1f3f5]">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            priority={priority}
            quality={60}
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 50vw"
            className="object-contain p-[5%] mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-bo-ink-faint">
            <PlaceholderImage size={24} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex h-[18px] items-center">
          {colors.length > 0 && (
            <ul
              aria-label={`Erhältlich in: ${colors.join(", ")}`}
              className="m-0 flex list-none items-center gap-1.5 p-0"
            >
              {colors.slice(0, MAX_DOTS).map((c) => (
                <li
                  key={c}
                  title={c}
                  className="h-3 w-3 rounded-full border border-[color-mix(in_srgb,var(--bo-ink)_30%,transparent)]"
                  style={{
                    backgroundColor: swatchColor(
                      c,
                      product.metadata?.color_swatches
                    ),
                  }}
                />
              ))}
              {colors.length > MAX_DOTS && (
                <li
                  aria-hidden
                  className="font-mono text-[10.5px] text-bo-ink-muted"
                >
                  +{colors.length - MAX_DOTS}
                </li>
              )}
            </ul>
          )}
        </div>
        <div className="h-[15px] truncate font-mono text-[10px] uppercase leading-[15px] tracking-wide text-bo-ink-faint">
          {product.collection?.title}
        </div>
        <p className="m-0 line-clamp-2 min-h-[2.5em] font-heading text-[15px] font-medium leading-tight">
          {product.title}
        </p>
        <div className="h-[18px] truncate text-[12.5px] leading-[18px] text-bo-ink-muted">
          {groupsets.length > 1
            ? `${groupsets.length} Ausstattungen`
            : groupsets[0]}
        </div>
        <div className="mt-auto min-h-[28px] pt-1.5 text-[15px] font-extrabold leading-[22px] tabular-nums">
          {cheapestPrice && (
            <>
              {hasPriceRange && (
                <span className="mr-1 text-[12.5px] font-semibold text-bo-ink-muted">
                  ab
                </span>
              )}
              {cheapestPrice.calculated_price}
            </>
          )}
        </div>
        <PriceNote className="h-[14px] whitespace-nowrap !text-[10.5px]" />
      </div>
    </LocalizedClientLink>
  )
}
