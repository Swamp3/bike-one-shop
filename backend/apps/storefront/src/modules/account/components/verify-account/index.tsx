"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { confirmEmailVerification } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type VerificationState = "verifying" | "success" | "error"

const VerifyAccount = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<VerificationState>("verifying")
  // Guard against the effect running twice in React Strict Mode, which would
  // consume the single-use token before the customer sees the result.
  const confirmed = useRef(false)

  useEffect(() => {
    if (confirmed.current) {
      return
    }
    confirmed.current = true

    if (!token) {
      setState("error")
      return
    }

    confirmEmailVerification(token).then(({ success }) =>
      setState(success ? "success" : "error")
    )
  }, [token])

  return (
    <div
      className="mx-auto flex w-full max-w-sm flex-col items-center gap-y-4 rounded-xl border border-bo-line bg-bo-surface p-8 text-center"
      data-testid="verify-account-page"
    >
      <h1 className="m-0 font-heading text-[20px] font-semibold uppercase">
        E-Mail-Bestätigung
      </h1>

      {state === "verifying" && (
        <p className="m-0 text-[13.5px] text-bo-ink-muted">
          Deine E-Mail-Adresse wird bestätigt …
        </p>
      )}

      {state === "success" && (
        <>
          <p className="m-0 text-[13.5px] text-bo-ink-muted">
            Deine E-Mail-Adresse ist bestätigt. Du kannst dich jetzt anmelden.
          </p>
          <LocalizedClientLink
            href="/account"
            className="inline-flex items-center justify-center rounded border-[1.5px] border-bo-ink bg-bo-ink px-[18px] py-3 text-[14px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink"
          >
            Zur Anmeldung
          </LocalizedClientLink>
        </>
      )}

      {state === "error" && (
        <>
          <p className="m-0 text-[13.5px] text-bo-ink-muted">
            Dieser Bestätigungslink ist ungültig oder abgelaufen. Melde dich
            an, um einen neuen zu erhalten.
          </p>
          <LocalizedClientLink
            href="/account"
            className="inline-flex items-center justify-center rounded border-[1.5px] border-bo-line-strong px-[18px] py-3 text-[14px] font-semibold text-bo-ink hover:border-bo-ink"
          >
            Zur Anmeldung
          </LocalizedClientLink>
        </>
      )}
    </div>
  )
}

export default VerifyAccount
