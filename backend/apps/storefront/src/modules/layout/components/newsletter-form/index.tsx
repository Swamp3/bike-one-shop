"use client"

import { useState } from "react"

/**
 * UI-only placeholder — no email/newsletter provider is wired up yet.
 * Matches the wireframe's own behavior (shows a static confirmation, sends
 * nothing).
 */
const NewsletterForm = () => {
  const [submitted, setSubmitted] = useState(false)

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted(true)
        }}
        className="flex max-w-[420px] flex-wrap gap-2"
      >
        <input
          type="email"
          required
          placeholder="deine.email@beispiel.de"
          aria-label="E-Mail-Adresse"
          className="min-w-[160px] flex-1 rounded-lg border border-bo-line bg-bo-surface px-3 py-2.5 text-[13.5px] text-bo-ink focus:border-bo-accent focus:outline-none"
        />
        <button
          type="submit"
          className="rounded border-[1.5px] border-bo-ink bg-bo-ink px-[22px] py-[13px] text-[14.5px] font-semibold text-bo-bg hover:bg-bo-accent hover:border-bo-accent"
        >
          Abonnieren
        </button>
      </form>
      {submitted && (
        <div className="mt-2 text-[12.5px] font-semibold text-bo-ok">
          ✓ Bestätigungsmail wurde verschickt (Platzhalter).
        </div>
      )}
    </div>
  )
}

export default NewsletterForm
