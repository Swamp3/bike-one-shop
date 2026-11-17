"use client"

import { useEffect, useState } from "react"

export const PrintButton = () => (
  <button
    type="button"
    onClick={() => window.print()}
    className="inline-flex items-center gap-1.5 rounded border-[1.5px] border-bo-line-strong px-3 py-1.5 text-[13px] font-semibold hover:border-bo-ink print:hidden"
    data-testid="print-order-button"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M6 9V3h12v6" />
      <rect x="6" y="14" width="12" height="7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    </svg>
    Drucken
  </button>
)

const today = () =>
  new Date().toLocaleDateString("de-DE", { dateStyle: "long" })

/** Print-only footer line. Client-side so the date is the print date, not the render date. */
export const PrintFooter = ({ displayId }: { displayId: number | string }) => {
  const [date, setDate] = useState("")

  useEffect(() => {
    setDate(today())
    const update = () => setDate(today())
    window.addEventListener("beforeprint", update)
    return () => window.removeEventListener("beforeprint", update)
  }, [])

  return (
    <p className="m-0 hidden border-t border-black pt-2 text-[11px] print:block">
      Bestellung #{displayId} · Ausgedruckt am {date} · Dies ist keine Rechnung.
    </p>
  )
}
