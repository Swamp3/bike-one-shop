"use client"

import { clx } from "@modules/common/components/ui"
import React from "react"
import { useFormStatus } from "react-dom"

/**
 * Local `.btn-primary` / `.btn-secondary` from the wireframes, scoped to the
 * account module — a local component rather than the shared, generic
 * `checkout/components/submit-button` (deleted alongside this: it was only
 * ever used by these account forms, see PLAN.md Task 11).
 */
export const AccountSubmitButton = ({
  children,
  small,
  className,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode
  small?: boolean
  className?: string
  "data-testid"?: string
}) => {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      data-testid={dataTestId}
      className={clx(
        "inline-flex items-center justify-center gap-2 rounded border-[1.5px] border-bo-ink bg-bo-ink font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink disabled:cursor-not-allowed disabled:border-bo-line disabled:bg-bo-surface-2 disabled:text-bo-ink-faint",
        small ? "px-3.5 py-2 text-[13px]" : "px-[18px] py-3 text-[14px]",
        className
      )}
    >
      {pending ? "…" : children}
    </button>
  )
}

export const AccountSecondaryButton = ({
  children,
  small,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { small?: boolean }) => {
  return (
    <button
      type={type}
      className={clx(
        "inline-flex items-center justify-center gap-2 rounded border-[1.5px] border-bo-line-strong bg-transparent font-semibold text-bo-ink hover:border-bo-ink",
        small ? "px-3.5 py-2 text-[13px]" : "px-[18px] py-3 text-[14px]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
