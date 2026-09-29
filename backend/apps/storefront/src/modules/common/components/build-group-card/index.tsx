import React from "react"

type BuildGroupCardProps = {
  title: string
  children: React.ReactNode
}

/**
 * Wraps the line items of one configured build (a shared
 * `metadata.build_id`, see PLAN.md Task 13 §2-3 — e.g. a Wilier Adlar plus
 * its Zipp wheelset upgrade) in one visually distinct card, reused across
 * the cart, checkout summary and order confirmation/history so the
 * grouping reads the same everywhere a customer sees their line items.
 */
const BuildGroupCard = ({ title, children }: BuildGroupCardProps) => {
  return (
    <div className="my-2.5 overflow-hidden rounded-[10px] border-[1.5px] border-bo-accent/30 bg-[color-mix(in_srgb,var(--bo-accent)_4%,var(--bo-surface))]">
      <div className="flex items-center gap-2 border-b border-bo-accent/20 px-3 py-2">
        <span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-bo-accent px-2 font-mono text-[9.5px] font-bold uppercase tracking-wide text-bo-accent-ink">
          Custom-Build
        </span>
        <span className="truncate font-heading text-[12.5px] font-semibold">
          {title}
        </span>
      </div>
      <div className="divide-y divide-bo-line px-3">{children}</div>
    </div>
  )
}

export default BuildGroupCard
