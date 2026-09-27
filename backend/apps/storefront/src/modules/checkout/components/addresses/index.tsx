"use client"
import { setAddresses } from "@lib/data/cart"
import useToggleState from "@lib/hooks/use-toggle-state"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import StepSubmitButton from "../step-submit-button"
import StepCard from "../step-card"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"
  const isDone = !!(cart?.shipping_address?.address_1 && cart?.email)

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useActionState(setAddresses, null)

  return (
    <StepCard
      title="Kontakt & Lieferadresse"
      done={isDone}
      isOpen={isOpen}
      onEdit={handleEdit}
      showEdit={!isOpen && isDone}
    >
      {isOpen ? (
        <form action={formAction}>
          {!customer && (
            <p className="mb-4 text-[13px] text-bo-ink-muted">
              Du bestellst als Gast. Bereits Kunde?{" "}
              <LocalizedClientLink
                href="/account"
                className="font-semibold text-bo-accent underline decoration-dashed underline-offset-[3px]"
              >
                Jetzt anmelden
              </LocalizedClientLink>
              .
            </p>
          )}
          <ShippingAddress
            customer={customer}
            checked={sameAsBilling}
            onChange={toggleSameAsBilling}
            cart={cart}
          />

          {!sameAsBilling && (
            <div className="mt-6">
              <div className="mb-3 font-heading text-[14px] font-semibold uppercase tracking-wide">
                Rechnungsadresse
              </div>
              <BillingAddress cart={cart} />
            </div>
          )}
          <StepSubmitButton className="mt-5" data-testid="submit-address-button">
            Weiter zur Versandart →
          </StepSubmitButton>
          <ErrorMessage error={message} data-testid="address-error-message" />
        </form>
      ) : (
        <div>
          {cart && cart.shipping_address ? (
            <div className="grid grid-cols-1 gap-4 text-[13.5px] sm:grid-cols-3">
              <div data-testid="shipping-address-summary">
                <p className="m-0 mb-1 font-semibold text-bo-ink">
                  Lieferadresse
                </p>
                <p className="m-0 text-bo-ink-muted">
                  {cart.shipping_address.first_name}{" "}
                  {cart.shipping_address.last_name}
                </p>
                <p className="m-0 text-bo-ink-muted">
                  {cart.shipping_address.address_1}{" "}
                  {cart.shipping_address.address_2}
                </p>
                <p className="m-0 text-bo-ink-muted">
                  {cart.shipping_address.postal_code}{" "}
                  {cart.shipping_address.city}
                </p>
                <p className="m-0 text-bo-ink-muted">
                  {cart.shipping_address.country_code?.toUpperCase()}
                </p>
              </div>

              <div data-testid="shipping-contact-summary">
                <p className="m-0 mb-1 font-semibold text-bo-ink">Kontakt</p>
                <p className="m-0 text-bo-ink-muted">
                  {cart.shipping_address.phone}
                </p>
                <p className="m-0 text-bo-ink-muted">{cart.email}</p>
              </div>

              <div data-testid="billing-address-summary">
                <p className="m-0 mb-1 font-semibold text-bo-ink">
                  Rechnungsadresse
                </p>
                {sameAsBilling ? (
                  <p className="m-0 text-bo-ink-muted">
                    Entspricht der Lieferadresse.
                  </p>
                ) : (
                  <>
                    <p className="m-0 text-bo-ink-muted">
                      {cart.billing_address?.first_name}{" "}
                      {cart.billing_address?.last_name}
                    </p>
                    <p className="m-0 text-bo-ink-muted">
                      {cart.billing_address?.address_1}{" "}
                      {cart.billing_address?.address_2}
                    </p>
                    <p className="m-0 text-bo-ink-muted">
                      {cart.billing_address?.postal_code}{" "}
                      {cart.billing_address?.city}
                    </p>
                    <p className="m-0 text-bo-ink-muted">
                      {cart.billing_address?.country_code?.toUpperCase()}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Spinner />
          )}
        </div>
      )}
    </StepCard>
  )
}

export default Addresses
