import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

type Step = {
  label: string
  date?: string | null
  done: boolean
  bad?: boolean
}

const shortDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("de-DE") : null

/**
 * Order progress derived from `payment_status` + `fulfillment_status`. Only
 * the placed date and the capture date exist on the order; shipping/delivery
 * steps carry no date rather than an invented one.
 */
const buildSteps = (order: HttpTypes.StoreOrder): Step[] => {
  if (order.status === "canceled" || order.fulfillment_status === "canceled") {
    return [
      { label: "Bestellt", date: shortDate(order.created_at), done: true },
      { label: "Storniert", done: true, bad: true },
    ]
  }

  const payment = order.payment_collections?.[0]?.payments?.[0]
  const paid = ["captured", "partially_refunded", "refunded"].includes(
    order.payment_status
  )
  const shipped = ["shipped", "delivered"].includes(order.fulfillment_status)

  return [
    { label: "Bestellt", date: shortDate(order.created_at), done: true },
    {
      label: "Bezahlt",
      date: paid ? shortDate(payment?.captured_at as string | undefined) : null,
      done: paid,
    },
    { label: "Versendet", done: shipped },
    { label: "Zugestellt", done: order.fulfillment_status === "delivered" },
  ]
}

const OrderTimeline = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const steps = buildSteps(order)
  const current = steps.findIndex((s) => !s.done)

  return (
    <ol
      className="m-0 grid list-none p-0"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      data-testid="order-timeline"
    >
      {steps.map((step, i) => (
        <li
          key={step.label}
          className="relative flex flex-col items-center text-center"
          aria-current={i === current ? "step" : undefined}
        >
          {i > 0 && (
            <span
              aria-hidden="true"
              className={clx(
                "absolute right-1/2 top-[13px] h-0.5 w-full",
                step.done && !step.bad
                  ? "bg-bo-ok print:bg-black"
                  : "bg-bo-line print:bg-neutral-400",
                step.bad && "bg-bo-accent print:bg-black"
              )}
            />
          )}
          <span
            className={clx(
              "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-bold",
              step.bad
                ? "border-bo-accent bg-bo-accent text-bo-accent-ink print:border-black print:bg-black print:text-white"
                : step.done
                ? "border-bo-ok bg-bo-ok text-bo-surface print:border-black print:bg-black print:text-white"
                : i === current
                ? "border-bo-wait bg-bo-surface text-bo-wait print:border-black print:text-black"
                : "border-bo-line bg-bo-surface text-bo-ink-faint print:border-neutral-400"
            )}
          >
            {step.bad ? "×" : step.done ? "✓" : i + 1}
          </span>
          <span
            className={clx(
              "mt-1.5 text-[12px] leading-tight",
              step.done || i === current
                ? "font-semibold text-bo-ink"
                : "text-bo-ink-faint"
            )}
          >
            {step.label}
          </span>
          {step.date && (
            <span className="mt-0.5 text-[11px] text-bo-ink-faint print:text-black">
              {step.date}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

export default OrderTimeline
