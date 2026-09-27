"use client"
import { isStripeLike } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import StepCard from "@modules/checkout/components/step-card"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripePaymentContainer,
} from "@modules/checkout/components/payment-container"
import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending"
  )

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)
    if (isStripeLike(method)) {
      await initiatePaymentSession(cart, {
        provider_id: method,
      })
    }
  }

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards &&
    ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])
      ?.length > 0 &&
    cart?.total === 0
  )

  const paymentReady =
    (activeSession && (cart?.shipping_methods?.length ?? 0) !== 0) ||
    paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const shouldInputPaymentDetails =
        isStripeLike(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })
      }

      if (!shouldInputPaymentDetails) {
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          { scroll: false }
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <StepCard
      title="Zahlung"
      done={!isOpen && paymentReady}
      isOpen={isOpen}
      showEdit={!isOpen && paymentReady}
      onEdit={handleEdit}
      editTestId="edit-payment-button"
    >
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <div className="flex flex-col gap-2">
              {availablePaymentMethods.map((paymentMethod) =>
                isStripeLike(paymentMethod.id) ? (
                  <StripePaymentContainer
                    key={paymentMethod.id}
                    paymentProviderId={paymentMethod.id}
                    selectedPaymentOptionId={selectedPaymentMethod}
                    setSelected={setPaymentMethod}
                    setError={setError}
                    setPaymentComplete={setPaymentComplete}
                  />
                ) : (
                  <PaymentContainer
                    key={paymentMethod.id}
                    paymentProviderId={paymentMethod.id}
                    selectedPaymentOptionId={selectedPaymentMethod}
                    setSelected={setPaymentMethod}
                  />
                )
              )}
            </div>
          )}

          {paidByGiftcard && (
            <div className="text-[13.5px]">
              <p className="m-0 mb-1 font-semibold text-bo-ink">
                Zahlungsmethode
              </p>
              <p className="m-0 text-bo-ink-muted" data-testid="payment-method-summary">
                Gutschein
              </p>
            </div>
          )}

          <ErrorMessage error={error} data-testid="payment-method-error-message" />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (isStripeLike(selectedPaymentMethod) && !paymentComplete) ||
              (!selectedPaymentMethod && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
            className="mt-4 w-full rounded border-[1.5px] border-bo-ink bg-bo-ink py-3 text-[14.5px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink disabled:cursor-not-allowed disabled:border-bo-line disabled:bg-bo-surface-2 disabled:text-bo-ink-faint"
          >
            {isLoading
              ? "…"
              : !activeSession && isStripeLike(selectedPaymentMethod)
              ? "Zahlungsdaten eingeben"
              : "Weiter zur Übersicht →"}
          </button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="text-[13.5px]">
              <p className="m-0 mb-1 font-semibold text-bo-ink">
                Zahlungsmethode
              </p>
              <p
                className="m-0 text-bo-ink-muted"
                data-testid="payment-method-summary"
              >
                {activeSession?.provider_id === "pp_system_default"
                  ? "Testzahlung (kein produktiver Anbieter aktiv)"
                  : activeSession?.provider_id}
              </p>
            </div>
          ) : paidByGiftcard ? (
            <div className="text-[13.5px]">
              <p className="m-0 mb-1 font-semibold text-bo-ink">
                Zahlungsmethode
              </p>
              <p
                className="m-0 text-bo-ink-muted"
                data-testid="payment-method-summary"
              >
                Gutschein
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </StepCard>
  )
}

export default Payment
