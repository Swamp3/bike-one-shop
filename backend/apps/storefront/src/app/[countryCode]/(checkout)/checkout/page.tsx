import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import StepNav from "@modules/checkout/components/step-nav"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Kasse",
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  return (
    <div className="content-container py-6 md:py-8">
      <h1 className="m-0 mb-1 font-heading text-[26px] font-semibold md:text-[30px]">
        Kasse
      </h1>
      <StepNav cart={cart} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_320px] md:items-start md:gap-7">
        <div className="order-2 md:order-1">
          <PaymentWrapper cart={cart}>
            <CheckoutForm cart={cart} customer={customer} />
          </PaymentWrapper>
        </div>
        <div className="order-1 md:order-2">
          <CheckoutSummary cart={cart} />
        </div>
      </div>
    </div>
  )
}
