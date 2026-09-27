import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import Thumbnail from "@modules/products/components/thumbnail"

/**
 * Order line-item list for the confirmation page. A dedicated component
 * (rather than the shared `order/components/items`) so restyling the
 * confirmation page doesn't also change the account module's order-history
 * detail page, which reuses that shared component as-is.
 */
const ConfirmationItems = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const items = order.items ?? []

  return (
    <div className="flex flex-col divide-y divide-bo-line">
      {items
        .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))
        .map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2.5">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-bo-line">
              <Thumbnail
                thumbnail={item.thumbnail}
                size="square"
                className="h-full w-full rounded-none border-none p-0"
              />
            </div>
            <div className="min-w-0 flex-1 text-[13.5px]">
              <p className="m-0 truncate font-medium leading-tight">
                {item.product_title}
              </p>
              {item.variant_title && (
                <p className="m-0 text-[12px] text-bo-ink-muted">
                  Größe {item.variant_title}
                </p>
              )}
            </div>
            <div className="whitespace-nowrap text-right font-mono text-[13px]">
              <div className="text-bo-ink-muted">{item.quantity} ×</div>
              <div className="font-bold">
                {convertToLocale({
                  amount: item.total ?? 0,
                  currency_code: order.currency_code,
                })}
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}

export default ConfirmationItems
