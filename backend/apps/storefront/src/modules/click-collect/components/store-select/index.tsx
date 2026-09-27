"use client"

import { useEffect, useState } from "react"

import { PREFERRED_STORE_STORAGE_KEY, STORES } from "@lib/data/stores"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

// Rough placeholder pin positions on the placeholder map (percent of the
// map's width/height) — purely decorative, matching the wireframe's own
// explicitly-labeled "Kartenansicht — Platzhalter". Not a real map.
const PIN_POSITION: Record<string, { left: string; top: string }> = {
  oldenburg: { left: "35%", top: "60%" },
  osnabrueck: { left: "66%", top: "42%" },
}

const PinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
    <circle cx="12" cy="10" r="3" className="fill-bo-surface" />
  </svg>
)

const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
)

/**
 * Real, working preferred-store selection — reuses the exact same
 * localStorage key as the header's `store-picker`, so a choice made here
 * shows up there immediately (and vice versa). This is deliberately *not*
 * a Click & Collect order/reservation flow: there is no pickup fulfillment
 * or per-store stock data in this store (see PLAN.md Task 10 and Task 11),
 * so nothing here claims to reserve an item or check real stock — it just
 * remembers which of the two physical stores the customer prefers.
 */
const StoreSelect = () => {
  const [selected, setSelected] = useState(STORES[0].id)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PREFERRED_STORE_STORAGE_KEY)
      const match = STORES.find((s) => s.name === stored)
      if (match) setSelected(match.id)
    } catch {
      // localStorage unavailable (private browsing etc.) — default stands.
    }
  }, [])

  const select = (id: string) => {
    setSelected(id)
    setSaved(false)
  }

  const save = () => {
    const store = STORES.find((s) => s.id === selected)
    if (!store) return
    try {
      window.localStorage.setItem(PREFERRED_STORE_STORAGE_KEY, store.name)
    } catch {
      // Ignore — the selection still works for this page view.
    }
    setSaved(true)
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-5">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden rounded-[10px] border border-bo-line bg-bo-surface-2 [background-image:repeating-linear-gradient(135deg,var(--bo-line)_0px,var(--bo-line)_1px,transparent_1px,transparent_9px)] md:aspect-auto md:w-[42%]">
        <span className="absolute left-2 top-2 rounded bg-bo-bg px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-bo-ink-faint">
          Kartenansicht — Platzhalter
        </span>
        {STORES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => select(s.id)}
            style={PIN_POSITION[s.id]}
            className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
          >
            <PinIcon
              className={clx(
                "h-[22px] w-[22px] drop-shadow",
                selected === s.id
                  ? "scale-125 text-bo-accent"
                  : "text-bo-line-strong"
              )}
            />
            <span
              className={clx(
                "mt-0.5 whitespace-nowrap rounded border bg-bo-surface px-1.5 py-0.5 text-[10px] font-bold",
                selected === s.id
                  ? "border-bo-accent text-bo-accent"
                  : "border-bo-line text-bo-ink-muted"
              )}
            >
              {s.name}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2.5">
          {STORES.map((s) => (
            <label
              key={s.id}
              className={clx(
                "flex cursor-pointer items-start gap-3 rounded-[10px] border-[1.5px] border-bo-line bg-bo-surface p-3.5",
                selected === s.id &&
                  "border-bo-accent bg-[color-mix(in_srgb,var(--bo-accent)_6%,var(--bo-surface))]"
              )}
            >
              <input
                type="radio"
                name="ccStore"
                checked={selected === s.id}
                onChange={() => select(s.id)}
                className="mt-0.5 h-[17px] w-[17px] shrink-0 accent-bo-accent"
              />
              <div className="min-w-0 flex-1">
                <div className="font-heading text-[16px] font-semibold">
                  {s.name}
                </div>
                <div className="mt-0.5 text-[12.5px] text-bo-ink-muted">
                  {s.address}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-bo-ink-faint">
                  <ClockIcon className="h-[13px] w-[13px] shrink-0" />
                  {s.hours}
                </div>
                <div className="mt-1 text-[12px] text-bo-ink-faint">
                  {s.phone} · {s.email}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-dashed border-bo-line pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <LocalizedClientLink
            href="/"
            className="rounded border-[1.5px] border-bo-line-strong px-[18px] py-3 text-center text-[14px] font-semibold text-bo-ink hover:border-bo-ink"
          >
            ← Zurück
          </LocalizedClientLink>
          <button
            type="button"
            onClick={save}
            className="rounded border-[1.5px] border-bo-ink bg-bo-ink px-[18px] py-3 text-[14px] font-semibold text-bo-bg hover:border-bo-accent hover:bg-bo-accent hover:text-bo-accent-ink"
          >
            Als bevorzugte Filiale speichern
          </button>
        </div>
        {saved && (
          <p className="text-[12.5px] font-semibold text-bo-ok">
            ✓ Gespeichert — die Kopfzeile zeigt jetzt{" "}
            {STORES.find((s) => s.id === selected)?.name} als deine Filiale.
          </p>
        )}
      </div>
    </div>
  )
}

export default StoreSelect
