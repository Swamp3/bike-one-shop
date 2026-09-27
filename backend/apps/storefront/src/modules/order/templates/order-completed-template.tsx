import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ConfirmationHero from "@modules/order/components/confirmation-hero"
import ConfirmationItems from "@modules/order/components/confirmation-items"
import ConfirmationShipping from "@modules/order/components/confirmation-shipping"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

/**
 * Order-confirmation page, matching wireframes/warenkorb-checkout.html's
 * step 4 (`#stepConfirm`) — checkmark hero, order number, next-steps and a
 * return-policy note. Renders inside the (main) route group so it keeps the
 * real dark header/footer, unlike the minimal checkout chrome.
 */
export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()
  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  const itemCount = order.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  return (
    <div className="content-container max-w-[720px] py-8 md:py-12">
      {isOnboarding && <OnboardingCta orderId={order.id} />}

      <div
        className="flex flex-col gap-3"
        data-testid="order-complete-container"
      >
        <div className="rounded-xl border border-bo-line bg-bo-surface p-5">
          <ConfirmationHero order={order} />

          <ul className="m-0 mt-2 flex list-none flex-col gap-2.5 border-t border-bo-line p-0 pt-4 text-[13.5px] text-bo-ink-muted">
            <li className="flex gap-2.5">
              <CheckIcon />
              <span>
                Du erhältst eine Versandbestätigung mit Sendungsverfolgung,
                sobald dein Paket unterwegs ist.
              </span>
            </li>
            <li className="flex gap-2.5">
              <CheckIcon />
              <span>Eine Bestellbestätigung wurde an deine E-Mail-Adresse geschickt.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-bo-line bg-bo-surface p-5">
          <h2 className="m-0 mb-3 font-heading text-[14px] font-semibold uppercase tracking-wide">
            Bestellübersicht
          </h2>
          <ConfirmationItems order={order} />
          <div className="mt-3 border-t border-bo-line pt-3">
            <CartTotals totals={order} itemCount={itemCount} />
          </div>
        </div>

        <div className="rounded-xl border border-bo-line bg-bo-surface p-5">
          <h2 className="m-0 mb-3 font-heading text-[14px] font-semibold uppercase tracking-wide">
            Lieferung
          </h2>
          <ConfirmationShipping order={order} />
        </div>

        <div className="rounded-xl border border-bo-line bg-bo-surface p-5">
          <h2 className="m-0 mb-3 font-heading text-[14px] font-semibold uppercase tracking-wide">
            Zahlung
          </h2>
          <PaymentDetails order={order} />
        </div>

        <div className="rounded-xl border border-bo-line bg-bo-surface p-5">
          <h2 className="m-0 mb-2 font-heading text-[14px] font-semibold uppercase tracking-wide">
            Rückgabe &amp; Umtausch
          </h2>
          <p className="m-0 text-[13.5px] leading-relaxed text-bo-ink-muted">
            30 Tage Rückgaberecht — unkompliziert in jeder Filiale, in
            Oldenburg oder Osnabrück, ohne Versandetikett. Bei per Spedition
            geliefertem Sperrgut holen wir die Rücksendung nach Absprache
            direkt bei dir ab.
          </p>
        </div>

        <LocalizedClientLink
          href="/store"
          className="block w-full rounded border-[1.5px] border-bo-line-strong py-3 text-center text-[14.5px] font-semibold hover:border-bo-ink"
        >
          Weiter einkaufen
        </LocalizedClientLink>
      </div>
    </div>
  )
}

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="mt-0.5 h-4 w-4 shrink-0 text-bo-accent"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
