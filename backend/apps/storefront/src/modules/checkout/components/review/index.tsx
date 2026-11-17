"use client"

import StepCard from "@modules/checkout/components/step-card"
import PaymentButton from "../payment-button"
import { useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { DATENSCHUTZ_URL } from "@lib/data/legal-links"

// New tab, so cart and form state are kept.
const newTab = { target: "_blank", rel: "noopener noreferrer" }
const link = "underline decoration-dashed underline-offset-[2px]"

const Review = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards &&
    ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])
      ?.length > 0 &&
    cart?.total === 0
  )

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <StepCard title="Bestellung prüfen" isOpen={isOpen} done={false}>
      {isOpen && previousStepsCompleted && (
        <>
          <p className="m-0 mb-4 text-[13px] text-bo-ink-muted">
            Mit Klick auf „Zahlungspflichtig bestellen“ gibst du eine
            verbindliche Bestellung ab. Es gelten unsere{" "}
            <LocalizedClientLink href="/agb" {...newTab} className={link}>
              AGB
            </LocalizedClientLink>
            . Die{" "}
            <LocalizedClientLink href="/widerrufsrecht" {...newTab} className={link}>
              Widerrufsbelehrung
            </LocalizedClientLink>{" "}
            und{" "}
            <a
              href={DATENSCHUTZ_URL}
              {...newTab}
              className={link}
            >
              Hinweise zur Datenverarbeitung
            </a>{" "}
            findest du hier.
          </p>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </>
      )}
    </StepCard>
  )
}

export default Review
