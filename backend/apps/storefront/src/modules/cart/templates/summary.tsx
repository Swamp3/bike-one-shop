"use client"

import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const itemCount = (cart: HttpTypes.StoreCart) =>
  cart.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0

const Summary = ({ cart }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  return (
    <aside className="flex flex-col gap-3">
      <div className="rounded-xl border border-bo-line bg-bo-surface p-4">
        <div className="mb-3 flex items-center justify-between font-heading text-[14px] font-semibold uppercase tracking-wide">
          Lieferart
        </div>
        <div className="flex items-start gap-2.5 rounded-[10px] border-[1.5px] border-bo-accent bg-[color-mix(in_srgb,var(--bo-accent)_6%,var(--bo-surface))] p-3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 h-4 w-4 shrink-0 text-bo-accent"
          >
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 3v5h-7z" />
            <circle cx="5.5" cy="18.5" r="2" />
            <circle cx="18.5" cy="18.5" r="2" />
          </svg>
          <div>
            <div className="text-[14px] font-semibold">Versand</div>
            <div className="mt-0.5 text-[12.5px] text-bo-ink-muted">
              Spedition, Bike vormontiert &amp; fahrfertig eingestellt.
              Versandart &amp; -kosten werden im nächsten Schritt festgelegt.
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-start gap-2.5 rounded-[10px] border-[1.5px] border-bo-line p-3 opacity-60">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 h-4 w-4 shrink-0 text-bo-ink-faint"
          >
            <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <div>
            <div className="text-[14px] font-semibold">Click &amp; Collect</div>
            <div className="mt-0.5 text-[12.5px] text-bo-ink-muted">
              Bald verfügbar — Abholung in Oldenburg oder Osnabrück.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-bo-line bg-bo-surface p-4">
        <div className="mb-3 font-heading text-[14px] font-semibold uppercase tracking-wide">
          Gutscheincode
        </div>
        <DiscountCode cart={cart} />
      </div>

      <div className="rounded-xl border border-bo-line bg-bo-surface p-4">
        <div className="mb-3 font-heading text-[14px] font-semibold uppercase tracking-wide">
          Zwischensumme
        </div>
        <CartTotals totals={cart} itemCount={itemCount(cart)} />
        <LocalizedClientLink
          href={"/checkout?step=" + step}
          data-testid="checkout-button"
          className="mt-3.5 block w-full rounded border-[1.5px] border-bo-ink bg-bo-ink py-3 text-center text-[14.5px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink"
        >
          Weiter zur Kasse →
        </LocalizedClientLink>
      </div>
    </aside>
  )
}

export default Summary
