"use client"

import { useEffect, useState } from "react"

import { PREFERRED_STORE_STORAGE_KEY, STORES } from "@lib/data/stores"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const STORAGE_KEY = PREFERRED_STORE_STORAGE_KEY

const PinIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

const StorePicker = ({ variant }: { variant: "mobile" | "strip" }) => {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(STORES[0].name)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && STORES.some((s) => s.name === stored)) {
      setSelected(stored)
    }
  }, [])

  const choose = (name: string) => {
    setSelected(name)
    window.localStorage.setItem(STORAGE_KEY, name)
    setOpen(false)
  }

  const current = STORES.find((s) => s.name === selected) ?? STORES[0]

  const panel = open && (
    <>
      <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-full z-40 mt-1.5 w-[min(320px,calc(100vw-2rem))] rounded-[10px] border border-bo-header-line bg-bo-header-surface p-2 shadow-2xl">
        {STORES.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => choose(s.name)}
            className="flex w-full items-center justify-between gap-2.5 rounded-[7px] px-2.5 py-2.5 text-left text-[13px] text-bo-header-text hover:bg-bo-header-surface-2"
          >
            <span>
              <span className="block font-semibold">{s.name}</span>
              <span className="block text-[11.5px] text-bo-header-muted">
                {s.address}
              </span>
            </span>
            <span className="shrink-0 font-mono text-[10.5px] text-bo-ok">
              ● VORRÄTIG
            </span>
          </button>
        ))}
        <LocalizedClientLink
          href="/click-collect"
          onClick={() => setOpen(false)}
          className="mt-1 block rounded-[7px] border-t border-bo-header-line px-2.5 pt-2.5 text-[12px] font-semibold text-bo-accent"
        >
          Alle Filialen &amp; Öffnungszeiten →
        </LocalizedClientLink>
      </div>
    </>
  )

  if (variant === "mobile") {
    return (
      <div className="relative md:hidden">
        <button
          type="button"
          aria-label={`Filiale wählen: ${current.name}, ${current.address}`}
          onClick={() => setOpen((v) => !v)}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-bo-header-line bg-bo-header-surface text-bo-header-text"
        >
          <PinIcon className="h-[18px] w-[18px]" />
        </button>
        {panel}
      </div>
    )
  }

  return (
    <div className="relative hidden items-center gap-2 md:flex">
      <PinIcon className="h-3.5 w-3.5 shrink-0 text-bo-accent" />
      <span className="text-bo-header-muted">Abholung:</span>
      <span className="font-semibold text-bo-header-text">
        {current.name}, {current.address}
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-auto text-bo-accent underline decoration-dashed underline-offset-[3px]"
      >
        ändern
      </button>
      {panel}
    </div>
  )
}

export default StorePicker
