import { COMPANY } from "@lib/data/company"
import { convertToLocale } from "@lib/util/money"
import {
  getBuildBaseItem,
  groupLineItemsByBuild,
} from "@lib/util/group-line-items"
import { HttpTypes } from "@medusajs/types"
import BuildGroupCard from "@modules/common/components/build-group-card"
import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import OrderTimeline from "@modules/order/components/order-timeline"
import PaymentDetails from "@modules/order/components/payment-details"
import {
  PrintButton,
  PrintFooter,
} from "@modules/order/components/print-actions"
import StatusPill from "@modules/order/components/status-pill"
import {
  PAYMENT_STATUS_LABEL,
  STATUS_LABEL,
} from "@modules/order/lib/order-status"
import Thumbnail from "@modules/products/components/thumbnail"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const CARD =
  "rounded-xl border border-bo-line bg-bo-surface p-5 print:break-inside-avoid print:rounded-none print:border-0 print:border-t print:border-black print:bg-transparent print:px-0 print:py-3"
const CARD_TITLE =
  "m-0 mb-3 font-heading text-[14px] font-semibold uppercase tracking-wide"
const LINK = "underline underline-offset-2 hover:text-bo-ink"

type Address = HttpTypes.StoreOrderAddress

const sameAddress = (a?: Address | null, b?: Address | null) =>
  (
    [
      "first_name",
      "last_name",
      "company",
      "address_1",
      "address_2",
      "postal_code",
      "city",
      "country_code",
    ] as const
  ).every((k) => (a?.[k] ?? "") === (b?.[k] ?? ""))

const AddressLines = ({ address }: { address?: Address | null }) => (
  <>
    {address?.company && (
      <p className="m-0 text-bo-ink-muted">{address.company}</p>
    )}
    <p className="m-0 text-bo-ink-muted">
      {address?.first_name} {address?.last_name}
    </p>
    <p className="m-0 text-bo-ink-muted">
      {address?.address_1} {address?.address_2}
    </p>
    <p className="m-0 text-bo-ink-muted">
      {address?.postal_code} {address?.city}
    </p>
    <p className="m-0 text-bo-ink-muted">
      {address?.country_code?.toUpperCase()}
    </p>
  </>
)

const ChevronLeft = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
)

const ItemRow = ({
  item,
  currencyCode,
}: {
  item: HttpTypes.StoreOrderLineItem
  currencyCode: string
}) => {
  const unit = (item.total ?? 0) / (item.quantity || 1)
  const title = (
    <span data-testid="product-name">{item.product_title || item.title}</span>
  )

  return (
    <div
      className="flex items-center gap-3 py-2.5 print:break-inside-avoid"
      data-testid="product-row"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-bo-line">
        <Thumbnail
          thumbnail={item.thumbnail}
          size="square"
          className="h-full w-full rounded-none border-none p-0"
        />
      </div>
      <div className="min-w-0 flex-1 text-[13.5px]">
        <p className="m-0 font-medium leading-tight">
          {item.product_handle ? (
            <LocalizedClientLink
              href={`/products/${item.product_handle}`}
              className="hover:text-bo-accent print:no-underline"
            >
              {title}
            </LocalizedClientLink>
          ) : (
            title
          )}
        </p>
        {item.variant_title && (
          <p
            className="m-0 mt-0.5 text-[12px] text-bo-ink-muted"
            data-testid="product-variant"
          >
            Variante: {item.variant_title}
          </p>
        )}
        <p className="m-0 mt-0.5 font-mono text-[12px] text-bo-ink-muted">
          <span data-testid="product-quantity">{item.quantity}</span> ×{" "}
          {convertToLocale({ amount: unit, currency_code: currencyCode })}
        </p>
      </div>
      <div className="whitespace-nowrap text-right font-mono text-[13.5px] font-bold">
        {convertToLocale({
          amount: item.total ?? 0,
          currency_code: currencyCode,
        })}
      </div>
    </div>
  )
}

const OrderItems = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const groups = groupLineItemsByBuild(order.items ?? [])
  const row = (item: HttpTypes.StoreOrderLineItem) => (
    <ItemRow key={item.id} item={item} currencyCode={order.currency_code} />
  )

  return (
    <div
      className="flex flex-col divide-y divide-bo-line print:divide-neutral-300"
      data-testid="products-table"
    >
      {groups.map((group) => {
        if (!group.buildId) {
          return row(group.items[0])
        }
        const baseItem = getBuildBaseItem(group.items)
        return (
          <div key={group.buildId} className="print:break-inside-avoid">
            <BuildGroupCard
              title={`Custom-Build: ${
                baseItem.product_title || baseItem.title
              }`}
            >
              {group.items.map(row)}
            </BuildGroupCard>
          </div>
        )
      })}
    </div>
  )
}

const OrderDetailsTemplate = ({ order }: OrderDetailsTemplateProps) => {
  const itemCount = order.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0
  const shippingMethod = order.shipping_methods?.[0] as
    | { name?: string; total?: number }
    | undefined
  const fulfillment = STATUS_LABEL[
    order.status === "canceled" ? "canceled" : order.fulfillment_status
  ] ?? {
    label: order.fulfillment_status,
  }
  const payment = PAYMENT_STATUS_LABEL[order.payment_status] ?? {
    label: order.payment_status,
  }
  const showBilling =
    !!order.billing_address &&
    !sameAddress(order.billing_address, order.shipping_address)
  const contact = [order.email, order.shipping_address?.phone].filter(Boolean)

  // TODO(click-and-collect): render "Abholung in <Filiale>" instead of the shipping address once
  // pickup shipping options exist, see .working-files/click-and-collect/plan.md step 6.

  return (
    <div
      className="flex flex-col gap-3 print:gap-0 print:text-black"
      data-testid="order-details-container"
      data-print-order
    >
      {/* Printed letterhead; hidden on screen. */}
      <div className="mb-3 hidden items-start justify-between gap-6 border-b-2 border-black pb-3 print:flex">
        <img
          src="/images/logo/bikeone-logo.svg"
          alt="BikeOne"
          width={1683}
          height={269}
          className="h-7 w-auto"
        />
        <address className="m-0 text-right text-[11px] not-italic leading-snug">
          <b>{COMPANY.name}</b>
          <br />
          {COMPANY.street}
          <br />
          {COMPANY.city}
          <br />
          {COMPANY.email} · {COMPANY.phone}
        </address>
      </div>

      <div className={`${CARD} print:border-t-0`}>
        <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
          <LocalizedClientLink
            href="/account/orders"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-bo-ink-muted hover:text-bo-accent"
            data-testid="back-to-overview-button"
          >
            <ChevronLeft /> Zurück zur Übersicht
          </LocalizedClientLink>
          <PrintButton />
        </div>

        <p className="m-0 mb-1 hidden text-[12px] font-bold uppercase tracking-wide print:block">
          Bestellübersicht · Dies ist keine Rechnung.
        </p>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <h1 className="m-0 font-heading text-[22px] font-semibold leading-tight md:text-[26px]">
              Bestellung{" "}
              <span className="font-mono" data-testid="order-id">
                #{order.display_id}
              </span>
            </h1>
            <p className="m-0 mt-1 text-[13px] text-bo-ink-muted">
              Bestellt am{" "}
              <span data-testid="order-date">
                {new Date(order.created_at).toLocaleDateString("de-DE", {
                  dateStyle: "long",
                })}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status={fulfillment} data-testid="order-status" />
            <StatusPill status={payment} data-testid="order-payment-status" />
          </div>
        </div>
        <p className="m-0 mt-2 text-[13px] text-bo-ink-muted">
          Bestätigung gesendet an{" "}
          <span className="font-semibold text-bo-ink" data-testid="order-email">
            {order.email}
          </span>
        </p>
      </div>

      <div className={CARD}>
        <OrderTimeline order={order} />
      </div>

      <div className={CARD}>
        <h2 className={CARD_TITLE}>Artikel</h2>
        <OrderItems order={order} />
        <div className="mt-3 border-t border-bo-line pt-3 print:border-black">
          <CartTotals
            totals={{
              total: order.total,
              subtotal: order.subtotal,
              tax_total: order.tax_total,
              item_total: order.item_total,
              shipping_total: order.shipping_total,
              item_discount_total: order.item_discount_total,
              shipping_discount_total: order.shipping_discount_total,
              currency_code: order.currency_code,
            }}
            itemCount={itemCount}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 print:block">
        <div className={CARD}>
          <h2 className={CARD_TITLE}>Lieferung</h2>
          <div className="text-[13.5px]">
            <p className="m-0 mb-1 font-semibold text-bo-ink">Lieferadresse</p>
            <div data-testid="shipping-address-summary">
              <AddressLines address={order.shipping_address} />
            </div>
            {contact.length > 0 && (
              <p
                className="m-0 mt-3 text-bo-ink-muted"
                data-testid="shipping-contact-summary"
              >
                {contact.join(" · ")}
              </p>
            )}
            {shippingMethod && (
              <>
                <p className="m-0 mb-1 mt-3 font-semibold text-bo-ink">
                  Versandart
                </p>
                <p
                  className="m-0 text-bo-ink-muted"
                  data-testid="shipping-method-summary"
                >
                  {shippingMethod.name}
                  {typeof shippingMethod.total === "number" &&
                    ` (${convertToLocale({
                      amount: shippingMethod.total,
                      currency_code: order.currency_code,
                    })})`}
                </p>
              </>
            )}
          </div>
        </div>

        <div className={CARD}>
          <h2 className={CARD_TITLE}>Zahlung</h2>
          <PaymentDetails order={order} />
          {showBilling && (
            <div className="mt-3 text-[13.5px]">
              <p className="m-0 mb-1 font-semibold text-bo-ink">
                Rechnungsadresse
              </p>
              <AddressLines address={order.billing_address} />
            </div>
          )}
        </div>
      </div>

      <div className={`${CARD} print:hidden`}>
        <h2 className={CARD_TITLE}>Hilfe zur Bestellung</h2>
        <p className="m-0 text-[13.5px] leading-relaxed text-bo-ink-muted">
          Informationen zum Widerruf findest du unter{" "}
          <LocalizedClientLink href="/widerrufsrecht" className={LINK}>
            Widerrufsrecht
          </LocalizedClientLink>
          . Bei Fragen schreib uns an{" "}
          <a
            href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(
              `Frage zu Bestellung #${order.display_id}`
            )}`}
            className={LINK}
          >
            {COMPANY.email}
          </a>{" "}
          oder ruf an unter{" "}
          <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className={LINK}>
            {COMPANY.phone}
          </a>
          . Bitte nenne dabei deine Bestellnummer.
        </p>
      </div>

      <PrintFooter displayId={order.display_id ?? ""} />
    </div>
  )
}

export default OrderDetailsTemplate
