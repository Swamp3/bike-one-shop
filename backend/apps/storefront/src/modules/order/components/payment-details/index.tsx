import { getPaymentMethodLabel, isStripeLike } from "@lib/constants"
import { getPaymentMethodLabels } from "@lib/data/payment"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = async ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0].payments?.[0]

  if (!payment) {
    return null
  }

  const isManualTest = payment.provider_id === "pp_system_default"
  const labelOverrides = await getPaymentMethodLabels()

  return (
    <div className="text-[13.5px]">
      <p className="m-0 mb-1 font-semibold text-bo-ink">Zahlungsmethode</p>
      <p className="m-0 text-bo-ink-muted" data-testid="payment-method">
        {isManualTest
          ? "Testzahlung (kein produktiver Anbieter aktiv)"
          : getPaymentMethodLabel(payment.provider_id, labelOverrides)}
      </p>
      <p className="m-0 mt-1 font-mono text-bo-ink-muted" data-testid="payment-amount">
        {isStripeLike(payment.provider_id) && payment.data?.card_last4
          ? `**** **** **** ${payment.data.card_last4}`
          : `${convertToLocale({
              amount: payment.amount,
              currency_code: order.currency_code,
            })} bezahlt am ${new Date(
              payment.created_at ?? ""
            ).toLocaleString("de-DE")}`}
      </p>
    </div>
  )
}

export default PaymentDetails
