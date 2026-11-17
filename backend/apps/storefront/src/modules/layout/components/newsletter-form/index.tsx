"use client"

import { useState } from "react"

import { DATENSCHUTZ_URL } from "@lib/data/legal-links"

/**
 * UI-only placeholder: no newsletter provider or double opt-in exists yet, so
 * nothing is sent or stored. The footer only renders this when
 * NEXT_PUBLIC_NEWSLETTER_ENABLED=true; keep it off until the real signup
 * exists. The form must never claim that a mail was sent or promise an
 * unsubscribe link while it is a placeholder.
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
          className="rounded-lg border-[1.5px] border-bo-ink bg-bo-ink px-[22px] py-[13px] text-[14.5px] font-semibold text-bo-bg hover:bg-bo-accent hover:border-bo-accent"
        >
          Abonnieren
        </button>
      </form>
      <p className="mt-2 max-w-[420px] text-[11.5px] leading-snug text-bo-ink-faint">
        Hinweise zur Datenverarbeitung findest du in der{" "}
        <a
          href={DATENSCHUTZ_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dashed underline-offset-[2px]"
        >
          Datenschutzerklärung
        </a>
        .
      </p>
      {submitted && (
        <div className="mt-2 text-[12.5px] font-semibold text-bo-ink-muted">
          Demnächst verfügbar. Es wurde nichts gespeichert oder gesendet.
        </div>
      )}
    </div>
  )
}

export default NewsletterForm
