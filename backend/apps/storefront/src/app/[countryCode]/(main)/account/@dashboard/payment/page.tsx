import { Metadata } from "next"

import PaymentMethodsPanel from "@modules/account/components/payment-methods-panel"

export const metadata: Metadata = {
  title: "Zahlungsmethoden",
  description: "Gespeicherte Zahlungsmethoden.",
}

export default function PaymentPage() {
  return (
    <div className="w-full" data-testid="payment-page-wrapper">
      <h2 className="m-0 mb-3.5 font-heading text-[19px] font-semibold">
        Zahlungsmethoden
      </h2>
      <PaymentMethodsPanel />
    </div>
  )
}
