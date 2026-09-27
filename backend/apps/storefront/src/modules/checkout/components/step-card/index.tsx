import { clx } from "@modules/common/components/ui"
import React from "react"

type StepCardProps = {
  title: React.ReactNode
  done?: boolean
  isOpen: boolean
  showEdit?: boolean
  onEdit?: () => void
  editTestId?: string
  children: React.ReactNode
}

/**
 * Shared card shell for each checkout accordion step (Addresses/Shipping/
 * Payment/Review), styled after wireframes/warenkorb-checkout.html's
 * `.card` + `.card-title`. Purely presentational — the accordion open/close
 * state still comes from each step's own `?step=` logic.
 */
const StepCard = ({
  title,
  done,
  isOpen,
  showEdit,
  onEdit,
  editTestId,
  children,
}: StepCardProps) => {
  return (
    <div className="rounded-xl border border-bo-line bg-bo-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2
          className={clx(
            "m-0 flex items-center gap-2 font-heading text-[16px] font-semibold uppercase tracking-wide",
            { "text-bo-ink-faint": !isOpen && !done }
          )}
        >
          {title}
          {!isOpen && done && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-4 w-4 text-bo-ok"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </h2>
        {showEdit && (
          <button
            type="button"
            onClick={onEdit}
            data-testid={editTestId}
            className="shrink-0 text-[13px] font-semibold text-bo-accent underline decoration-dashed underline-offset-[3px]"
          >
            Ändern
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

export default StepCard
