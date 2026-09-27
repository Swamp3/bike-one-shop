import React, { useContext } from "react"

import { isManual } from "@lib/constants"
import { clx } from "@modules/common/components/ui"
import { PaymentElement } from "@stripe/react-stripe-js"
import PaymentTest from "../payment-test"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  setSelected: (id: string) => void
  disabled?: boolean
  children?: React.ReactNode
}

const TITLES: Record<string, string> = {
  pp_system_default: "Testzahlung",
  pp_paypal_paypal: "PayPal",
}

/**
 * A single payment-method option-card, styled after wireframes/
 * warenkorb-checkout.html's `.option-card`. Only `pp_system_default`
 * (Medusa's built-in manual/test payment provider) is actually registered
 * for this region right now — see PLAN.md Task 5/10 — so this deliberately
 * does not pretend to be a real card-entry form; it says plainly that
 * placing the order completes the cart without a real charge.
 */
const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  setSelected,
  disabled = false,
  children,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development"
  const active = selectedPaymentOptionId === paymentProviderId

  return (
    <label
      className={clx(
        "flex items-start gap-3 rounded-[10px] border-[1.5px] p-3.5",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        active
          ? "border-bo-accent bg-[color-mix(in_srgb,var(--bo-accent)_6%,var(--bo-surface))]"
          : "border-bo-line bg-bo-surface"
      )}
    >
      <input
        type="radio"
        name="paymentMethod"
        className="mt-0.5 h-4 w-4 accent-bo-accent"
        checked={active}
        disabled={disabled}
        onChange={() => setSelected(paymentProviderId)}
        data-testid="payment-container-radio"
      />
      <div className="flex-1">
        <div className="text-[14px] font-semibold">
          {TITLES[paymentProviderId] || paymentProviderId}
        </div>
        {isManual(paymentProviderId) && (
          <>
            <p className="m-0 mt-1 text-[12.5px] text-bo-ink-muted">
              Schließt die Bestellung ohne echte Zahlungsabwicklung ab —
              aktuell ist noch kein produktiver Zahlungsanbieter angebunden.
            </p>
            {isDevelopment && <PaymentTest className="mt-2" />}
          </>
        )}
        {children}
      </div>
    </label>
  )
}

export default PaymentContainer

export const StripePaymentContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  setSelected,
  setError,
  setPaymentComplete,
}: Omit<PaymentContainerProps, "disabled"> & {
  setError: (error: string | null) => void
  setPaymentComplete: (complete: boolean) => void
}) => {
  const stripeReady = useContext(StripeContext)
  const active = selectedPaymentOptionId === paymentProviderId

  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      setSelected={setSelected}
    >
      {active &&
        (stripeReady ? (
          <div className="mt-3">
            <PaymentElement
              options={{ layout: "accordion" }}
              onChange={(e) => {
                setError(null)
                setPaymentComplete(e.complete)
              }}
              onLoadError={(e) => {
                setPaymentComplete(false)
                setError(
                  e.error?.message ?? "Die Zahlungsmethoden konnten nicht geladen werden."
                )
              }}
            />
          </div>
        ) : null)}
    </PaymentContainer>
  )
}
