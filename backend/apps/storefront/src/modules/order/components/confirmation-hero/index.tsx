import { HttpTypes } from "@medusajs/types"

/**
 * Order-confirmation hero, styled after wireframes/warenkorb-checkout.html's
 * `.confirm-hero` (checkmark, "Danke für deine Bestellung!", order number).
 * A dedicated component rather than reusing `order/components/order-details`
 * — that one also backs the account module's order-history detail page,
 * which stays untouched.
 */
const ConfirmationHero = ({ order }: { order: HttpTypes.StoreOrder }) => {
  return (
    <div className="pb-2 pt-1 text-center">
      <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full bg-bo-ok-bg text-bo-ok">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="h-7 w-7"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h1 className="m-0 mb-1.5 font-heading text-[24px] font-semibold">
        Danke für deine Bestellung!
      </h1>
      <div className="font-mono text-[13.5px] text-bo-ink-muted">
        Bestellnummer{" "}
        <b className="font-bold text-bo-ink" data-testid="order-id">
          {order.display_id}
        </b>
      </div>
      <p className="m-0 mt-2 text-[13px] text-bo-ink-muted">
        Bestellbestätigung gesendet an{" "}
        <span className="font-semibold text-bo-ink" data-testid="order-email">
          {order.email}
        </span>
      </p>
    </div>
  )
}

export default ConfirmationHero
