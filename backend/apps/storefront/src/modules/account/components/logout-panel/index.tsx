"use client"

import { useState, useTransition } from "react"
import { useParams } from "next/navigation"

import { signout } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const LogoutPanel = () => {
  const { countryCode } = useParams() as { countryCode: string }
  const [pending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState(false)

  const confirmLogout = () => {
    setConfirmed(true)
    startTransition(async () => {
      // Real sign-out: clears the auth token + cart cookie and redirects to
      // /account server-side (see @lib/data/customer.ts).
      await signout(countryCode)
    })
  }

  return (
    <div className="rounded-xl border border-bo-line bg-bo-surface p-6 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mx-auto mb-2.5 h-9 w-9 text-bo-wait"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <circle cx="12" cy="16" r=".5" fill="currentColor" />
      </svg>
      <p className="m-0 mb-4 text-[14.5px] text-bo-ink-muted">
        Möchtest du dich wirklich abmelden?
      </p>
      <div className="flex justify-center gap-2.5">
        <LocalizedClientLink
          href="/account/orders"
          className="inline-flex items-center justify-center gap-2 rounded border-[1.5px] border-bo-line-strong bg-transparent px-[18px] py-3 text-[14px] font-semibold text-bo-ink hover:border-bo-ink"
        >
          Abbrechen
        </LocalizedClientLink>
        <button
          type="button"
          onClick={confirmLogout}
          disabled={pending || confirmed}
          className="inline-flex items-center justify-center gap-2 rounded border-[1.5px] border-bo-ink bg-bo-ink px-[18px] py-3 text-[14px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink disabled:cursor-not-allowed disabled:border-bo-line disabled:bg-bo-surface-2 disabled:text-bo-ink-faint"
        >
          {confirmed ? "Wird abgemeldet…" : "Ja, abmelden"}
        </button>
      </div>
    </div>
  )
}

export default LogoutPanel
