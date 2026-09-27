"use client"

import { useState } from "react"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import { convertToLocale } from "@lib/util/money"
import { clx } from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"

/**
 * Order-summary sidebar, matching wireframes/warenkorb-checkout.html's
 * `.checkout-side` card. Collapsed behind a toggle on mobile (the
 * wireframe's `.checkout-summary-toggle`), always open on desktop.
 */
const CheckoutSummary = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const [open, setOpen] = useState(false)

  const itemCount = cart.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0
  const total = convertToLocale({
    amount: cart.total ?? 0,
    currency_code: cart.currency_code,
  })

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-bo-line bg-bo-surface px-3.5 py-3 text-[13.5px] font-semibold md:hidden"
      >
        <span>
          Bestellübersicht anzeigen ·{" "}
          <span className="font-mono text-bo-accent">{total}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={clx("h-4 w-4 transition-transform", {
            "rotate-180": open,
          })}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        className={clx("mt-2 md:sticky md:top-[84px] md:mt-0 md:block", {
          block: open,
          hidden: !open,
        })}
      >
        <div className="rounded-xl border border-bo-line bg-bo-surface p-4">
          <div className="mb-3 font-heading text-[14px] font-semibold uppercase tracking-wide">
            Bestellübersicht
          </div>
          <ItemsPreviewTemplate cart={cart} />
          <div className="my-3 border-t border-bo-line" />
          <CartTotals totals={cart} itemCount={itemCount} />
          <div className="mt-4 border-t border-bo-line pt-4">
            <div className="mb-2 font-heading text-[12px] font-semibold uppercase tracking-wide text-bo-ink-muted">
              Gutscheincode
            </div>
            <DiscountCode cart={cart} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutSummary
