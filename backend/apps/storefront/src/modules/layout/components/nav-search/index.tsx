"use client"

import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { STORE_PANEL_OPEN_EVENT } from "@modules/layout/components/store-picker"

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

/**
 * Submits to /store?q=... (matched in memory, see lib/util/product-search.ts)
 * rather than live-search-as-you-type — no search index powers suggestions yet.
 */
const NavSearch = ({ variant }: { variant: "icon" | "bar" }) => {
  const router = useRouter()
  const { countryCode } = useParams()
  const [value, setValue] = useState("")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener(STORE_PANEL_OPEN_EVENT, close)
    return () => window.removeEventListener(STORE_PANEL_OPEN_EVENT, close)
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    router.push(`/${countryCode}/store?q=${encodeURIComponent(value.trim())}`)
  }

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          aria-label="Suche öffnen"
          onClick={() => setOpen((v) => !v)}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-bo-header-line bg-bo-header-surface text-bo-header-text md:hidden"
        >
          <SearchIcon className="h-[18px] w-[18px]" />
        </button>
        {open && (
          <form
            onSubmit={submit}
            className="absolute inset-x-0 top-full z-30 flex items-center gap-2 border-t border-bo-header-line bg-bo-header px-4 py-3 md:hidden"
          >
            <SearchIcon className="h-4 w-4 shrink-0 text-bo-header-muted" />
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Rennrad, Gravelbike, Bremsbeläge …"
              className="w-full bg-transparent text-[14px] text-bo-header-text outline-none placeholder:text-bo-header-muted"
            />
          </form>
        )}
      </>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-[9px] border border-bo-header-line bg-bo-header-surface-2 px-3 py-2.5 focus-within:border-bo-accent"
    >
      <SearchIcon className="h-4 w-4 shrink-0 text-bo-header-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rennrad, Gravelbike, Bremsbeläge …"
        className="w-full bg-transparent text-[14px] text-bo-header-text outline-none placeholder:text-bo-header-muted"
      />
    </form>
  )
}

export default NavSearch
