"use client"

import { clx } from "@modules/common/components/ui"
import React from "react"
import { useFormStatus } from "react-dom"

/**
 * Primary CTA for a checkout step's own <form> (currently just Addresses).
 * A local component rather than the shared `checkout/components/submit-button`
 * — that one also backs the account module's forms, and restyling it here
 * would change login/register/address-book pages too.
 */
const StepSubmitButton = ({
  children,
  className,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode
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
        "w-full rounded border-[1.5px] border-bo-ink bg-bo-ink py-3 text-[14.5px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink disabled:cursor-not-allowed disabled:border-bo-line disabled:bg-bo-surface-2 disabled:text-bo-ink-faint",
        className
      )}
    >
      {pending ? "…" : children}
    </button>
  )
}

export default StepSubmitButton
