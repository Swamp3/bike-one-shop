"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
  itemCount?: number
}

/**
 * German-labelled totals breakdown, styled after wireframes/
 * warenkorb-checkout.html's `.summary-row` / `.summary-total`. Shared by the
 * cart sidebar, the checkout sidebar and the order-confirmation page — all
 * real Medusa cart/order totals, nothing hardcoded.
 */
const CartTotals: React.FC<CartTotalsProps> = ({ totals, itemCount }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  return (
    <div>
      <div className="flex flex-col text-[13.5px] text-bo-ink-muted">
        <div className="flex items-baseline justify-between py-1.5">
          <span>
            Zwischensumme{typeof itemCount === "number" ? ` (${itemCount} Artikel)` : ""}
          </span>
          <span
            className="font-semibold text-bo-ink"
            data-testid="cart-subtotal"
            data-value={item_subtotal || 0}
          >
            {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
          </span>
        </div>
        <div className="flex items-baseline justify-between py-1.5">
          <span>Versand</span>
          <span
            className="font-semibold text-bo-ink"
            data-testid="cart-shipping"
            data-value={shipping_subtotal || 0}
          >
            {shipping_subtotal
              ? convertToLocale({ amount: shipping_subtotal, currency_code })
              : "—"}
          </span>
        </div>
        {!!discount_subtotal && (
          <div className="flex items-baseline justify-between py-1.5 text-bo-ok">
            <span>Rabatt</span>
            <span
              className="font-semibold"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              −{convertToLocale({ amount: discount_subtotal, currency_code })}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between py-1.5">
          <span>MwSt.</span>
          <span
            className="font-semibold text-bo-ink"
            data-testid="cart-taxes"
            data-value={tax_total || 0}
          >
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-bo-line pt-3 font-heading text-[19px] font-semibold">
        <span>Gesamt</span>
        <span
          className="font-mono tabular-nums"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
      <div className="mt-1.5 text-[11.5px] text-bo-ink-faint">
        inkl. MwSt.
      </div>
    </div>
  )
}

export default CartTotals
