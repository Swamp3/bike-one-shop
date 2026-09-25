import { HttpTypes } from "@medusajs/types"

import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

/**
 * BikeOne-styled product card (wireframes/homepage.html's `.card`). Stock
 * status always shows "ab Lager verfügbar" — the seed stocks everything at
 * a flat 1,000,000 units, and real per-store Click & Collect availability
 * depends on the tridata-stock-snapshot sync (see PLAN.md), not built yet.
 * The CTA links to the product page rather than one-click-adding: these are
 * multi-variant bikes (Frame Size S/M/L/XL), so there's no single variant a
 * grid card could safely add without the customer picking a size first.
 */
export default function BikeOneProductCard({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const { cheapestPrice } = getProductPrice({ product })

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-bo-line bg-bo-surface"
    >
      <div className="aspect-[4/3] border-b border-bo-line">
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          size="full"
          className="h-full rounded-none border-none p-0"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {product.collection?.title && (
          <div className="font-mono text-[10px] uppercase tracking-wide text-bo-ink-faint">
            {product.collection.title}
          </div>
        )}
        <p className="m-0 font-heading text-[15px] font-medium leading-tight">
          {product.title}
        </p>
        <div className="mt-auto flex flex-col gap-2 pt-1.5">
          <div className="flex items-center justify-between gap-1.5">
            {cheapestPrice && (
              <span className="text-[15px] font-extrabold tabular-nums">
                {cheapestPrice.calculated_price}
              </span>
            )}
            <span className="whitespace-nowrap rounded-[5px] bg-bo-ok-bg px-1.5 py-[3px] font-mono text-[9.5px] font-bold uppercase tracking-wide text-bo-ok">
              Ab Lager verfügbar
            </span>
          </div>
          <span className="w-full rounded-lg border-[1.5px] border-bo-ink py-2.5 text-center text-[12.5px] font-bold group-hover:bg-bo-ink group-hover:text-bo-bg">
            Ansehen
          </span>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
