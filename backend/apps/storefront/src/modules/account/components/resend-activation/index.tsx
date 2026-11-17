"use client"

import { resendActivationEmail } from "@lib/data/customer"
import { useEffect, useState } from "react"

const COOLDOWN_SECONDS = 60

/**
 * "Send the activation mail again". The server action reads the address from a
 * cookie, so nothing is typed in; the button then waits a minute (the backend
 * sends at most one mail a minute per address anyway).
 */
const ResendActivation = () => {
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState<"idle" | "sent" | "failed">("idle")

  useEffect(() => {
    if (seconds <= 0) return
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  const resend = async () => {
    setSeconds(COOLDOWN_SECONDS)
    const { ok } = await resendActivationEmail()
    setResult(ok ? "sent" : "failed")
  }

  return (
    <div className="mt-2.5" data-testid="resend-activation">
      <button
        type="button"
        onClick={resend}
        disabled={seconds > 0}
        className="text-[13px] font-semibold text-bo-ink underline underline-offset-2 disabled:cursor-not-allowed disabled:text-bo-ink-muted disabled:no-underline"
      >
        {seconds > 0
          ? `Erneut senden in ${seconds} s`
          : "Bestätigungs-E-Mail erneut senden"}
      </button>
      <p className="m-0 mt-1 text-[12.5px] text-bo-ink-muted" role="status" aria-live="polite">
        {result === "sent" && "Wir haben dir eine neue E-Mail geschickt. Prüfe auch den Spam-Ordner."}
        {result === "failed" &&
          "Das hat gerade nicht geklappt. Melde dich bitte noch einmal an, dann senden wir den Link erneut."}
      </p>
    </div>
  )
}

export default ResendActivation
