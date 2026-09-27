"use client"

import { clx } from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type StepKey = "address" | "delivery" | "payment" | "review"

const STEPS: { key: StepKey; label: string }[] = [
  { key: "address", label: "Adresse" },
  { key: "delivery", label: "Versand" },
  { key: "payment", label: "Zahlung" },
  { key: "review", label: "Übersicht" },
]

/**
 * Visual step indicator adapted from wireframes/warenkorb-checkout.html's
 * `.step-nav`. The real checkout flow underneath is Medusa's own
 * `?step=` accordion (Addresses/Shipping/Payment/Review components) — this
 * only reflects and lets you re-navigate between steps that real cart data
 * says are actually complete, it doesn't drive the flow itself.
 */
const StepNav = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const current = (searchParams.get("step") as StepKey) || "address"

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards &&
    ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])
      ?.length > 0 &&
    cart?.total === 0
  )

  const done: Record<StepKey, boolean> = {
    address: !!(cart.shipping_address?.address_1 && cart.email),
    delivery: (cart.shipping_methods?.length ?? 0) > 0,
    payment: !!cart.payment_collection || paidByGiftcard,
    review: false,
  }

  const reachable: Record<StepKey, boolean> = {
    address: true,
    delivery: done.address,
    payment: done.address && done.delivery,
    review: done.address && done.delivery && done.payment,
  }

  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <div className="mb-5 flex items-start" data-testid="checkout-step-nav">
      {STEPS.map((step, i) => {
        const isDone = done[step.key] && step.key !== current
        const isCurrent = step.key === current
        const canGo = reachable[step.key]

        return (
          <button
            key={step.key}
            type="button"
            disabled={!canGo}
            onClick={() => {
              if (canGo) router.push(pathname + "?step=" + step.key, { scroll: false })
            }}
            className={clx(
              "relative flex flex-1 flex-col items-center gap-1.5 bg-transparent py-0 disabled:cursor-not-allowed",
              { "cursor-pointer": canGo }
            )}
          >
            {i > 0 && (
              <span
                className={clx(
                  "absolute left-[-50%] top-[13px] h-[2px] w-full",
                  i <= currentIndex || done[step.key]
                    ? "bg-bo-ok"
                    : "bg-bo-line"
                )}
              />
            )}
            <span
              className={clx(
                "relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] font-mono text-[12px] font-bold",
                isDone
                  ? "border-bo-ok bg-bo-ok text-white"
                  : isCurrent
                  ? "border-bo-accent text-bo-accent"
                  : "border-bo-line-strong bg-bo-surface text-bo-ink-muted"
              )}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span
              className={clx(
                "text-center text-[10.5px] uppercase tracking-wide text-bo-ink-faint",
                { "font-semibold text-bo-ink": isCurrent }
              )}
            >
              {step.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default StepNav
