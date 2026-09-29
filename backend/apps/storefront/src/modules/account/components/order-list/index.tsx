"use client"

import { useState } from "react"

import { convertToLocale } from "@lib/util/money"
import { getBuildBaseItem, groupLineItemsByBuild } from "@lib/util/group-line-items"
import { HttpTypes } from "@medusajs/types"
import BuildGroupCard from "@modules/common/components/build-group-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

const RETURN_WINDOW_DAYS = 30

const ChevronIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

/** Maps Medusa's real fulfillment status onto the wireframe's status pill —
 * there's no in-store-pickup fulfillment option today (see PLAN.md Task 10),
 * so "Abgeholt in Filiale" from the wireframe never actually occurs here. */
const STATUS_LABEL: Record<HttpTypes.StoreOrder["fulfillment_status"], { label: string; ok?: boolean }> = {
  not_fulfilled: { label: "In Bearbeitung" },
  partially_fulfilled: { label: "Teilweise bearbeitet" },
  fulfilled: { label: "Bereit zum Versand" },
  partially_shipped: { label: "Teilweise versendet" },
  shipped: { label: "In Zustellung" },
  partially_delivered: { label: "Teilweise zugestellt" },
  delivered: { label: "Zugestellt", ok: true },
  canceled: { label: "Storniert" },
}

const daysAgo = (date: string | Date) => {
  const diffMs = Date.now() - new Date(date).getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

const OrderRow = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const [open, setOpen] = useState(false)
  const [returnRequested, setReturnRequested] = useState(false)

  const status = STATUS_LABEL[order.fulfillment_status] ?? {
    label: order.fulfillment_status,
  }
  const age = daysAgo(order.created_at)
  // Approximation: there's no separate "delivered at" timestamp surfaced
  // here, so the 30-day return window is measured from the order date, not
  // the actual delivery date (see PLAN.md Task 11).
  const canReturn = order.fulfillment_status === "delivered"
  const returnExpired = canReturn && age > RETURN_WINDOW_DAYS

  return (
    <div className="overflow-hidden rounded-xl border border-bo-line bg-bo-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-2 gap-x-3.5 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[13.5px] font-bold">
            #{order.display_id}
          </div>
          <div className="mt-0.5 text-[12px] text-bo-ink-faint">
            vor {age} {age === 1 ? "Tag" : "Tagen"}
          </div>
        </div>
        <span
          className={clx(
            "whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
            status.ok ? "bg-bo-ok-bg text-bo-ok" : "bg-bo-wait-bg text-bo-wait"
          )}
        >
          {status.label}
        </span>
        <span className="whitespace-nowrap font-mono text-[15px] font-extrabold">
          {convertToLocale({ amount: order.total, currency_code: order.currency_code })}
        </span>
        <ChevronIcon
          className={clx("h-4 w-4 shrink-0 text-bo-ink-faint transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-bo-line p-4 pt-3.5">
          {groupLineItemsByBuild(order.items ?? []).map((group) => {
            const renderItem = (item: HttpTypes.StoreOrderLineItem) => (
              <div key={item.id} className="flex justify-between gap-2.5 py-1 text-[13px] text-bo-ink-muted">
                <span>
                  {item.product_title || item.title} × {item.quantity}
                </span>
                <b className="font-semibold text-bo-ink">
                  {convertToLocale({ amount: item.total ?? 0, currency_code: order.currency_code })}
                </b>
              </div>
            )

            if (!group.buildId) {
              return renderItem(group.items[0])
            }

            const baseItem = getBuildBaseItem(group.items)

            return (
              <BuildGroupCard
                key={group.buildId}
                title={`Custom-Build: ${baseItem.product_title || baseItem.title}`}
              >
                {group.items.map(renderItem)}
              </BuildGroupCard>
            )
          })}

          <div className="mt-3 flex flex-col gap-1 border-t border-dashed border-bo-line pt-3">
            {!canReturn && (
              <span className="text-[12px] text-bo-ink-faint">
                Rücksendung erst nach Zustellung möglich.
              </span>
            )}
            {canReturn && returnExpired && (
              <span className="text-[12px] text-bo-ink-faint">
                Rückgabefrist abgelaufen ({RETURN_WINDOW_DAYS} Tage).
              </span>
            )}
            {canReturn && !returnExpired && !returnRequested && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setReturnRequested(true)
                }}
                className="self-start text-[12.5px] font-semibold text-bo-accent underline decoration-dashed underline-offset-[3px]"
              >
                Rücksendung im Store starten
              </button>
            )}
            {returnRequested && (
              <span className="text-[12px] font-semibold text-bo-ok">
                ✓ Bring den Artikel mit der Bestellnummer #{order.display_id} in
                eine unserer Filialen (Oldenburg oder Osnabrück) — dort wird die
                Rücksendung direkt bearbeitet.
              </span>
            )}
            <LocalizedClientLink
              href={`/account/orders/details/${order.id}`}
              className="mt-2 self-start text-[12.5px] font-semibold text-bo-ink-muted underline decoration-dashed underline-offset-[3px] hover:text-bo-accent"
            >
              Alle Bestelldetails ansehen →
            </LocalizedClientLink>
          </div>
        </div>
      )}
    </div>
  )
}

const OrderList = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  if (!orders?.length) {
    return (
      <div className="rounded-xl border border-bo-line bg-bo-surface p-8 text-center">
        <p className="m-0 mb-3 text-[14px] text-bo-ink-muted">
          Noch keine Bestellungen vorhanden.
        </p>
        <LocalizedClientLink
          href="/"
          className="text-[13px] font-semibold text-bo-accent underline decoration-dashed underline-offset-[3px]"
        >
          Jetzt stöbern →
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </div>
  )
}

export default OrderList
