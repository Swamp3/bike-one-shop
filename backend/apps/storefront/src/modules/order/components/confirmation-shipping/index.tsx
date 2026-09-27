import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

/**
 * Delivery-address/method summary for the confirmation page. Dedicated
 * component, not the shared `order/components/shipping-details` — see
 * confirmation-items for why.
 */
const ConfirmationShipping = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const method = order.shipping_methods?.[0] as
    | { name?: string; total?: number }
    | undefined

  return (
    <div className="grid grid-cols-1 gap-4 text-[13.5px] sm:grid-cols-2">
      <div>
        <p className="m-0 mb-1 font-semibold text-bo-ink">Lieferadresse</p>
        <p className="m-0 text-bo-ink-muted">
          {order.shipping_address?.first_name}{" "}
          {order.shipping_address?.last_name}
        </p>
        <p className="m-0 text-bo-ink-muted">
          {order.shipping_address?.address_1}{" "}
          {order.shipping_address?.address_2}
        </p>
        <p className="m-0 text-bo-ink-muted">
          {order.shipping_address?.postal_code}{" "}
          {order.shipping_address?.city}
        </p>
        <p className="m-0 text-bo-ink-muted">
          {order.shipping_address?.country_code?.toUpperCase()}
        </p>
      </div>
      <div>
        <p className="m-0 mb-1 font-semibold text-bo-ink">Versandart</p>
        {method && (
          <p className="m-0 text-bo-ink-muted">
            {method.name}
            {typeof method.total === "number" && (
              <>
                {" "}
                (
                {convertToLocale({
                  amount: method.total,
                  currency_code: order.currency_code,
                })}
                )
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

export default ConfirmationShipping
