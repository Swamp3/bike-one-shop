"use client"

import { HttpTypes } from "@medusajs/types"
import { useEffect, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Props = {
  categories: HttpTypes.StoreProductCategory[] | null
}

const MobileMenu = ({ categories }: Props) => {
  const [open, setOpen] = useState(false)

  // lock body scroll while the drawer is open
  useEffect(() => {
    if (open) {
      const previous = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = previous
      }
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label="Menü öffnen"
        onClick={() => setOpen(true)}
        className="flex md:hidden h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-bo-line bg-bo-surface text-bo-ink"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-[18px] w-[18px]"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/35"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-[61] flex w-[82%] max-w-[320px] flex-col bg-bo-surface text-bo-ink shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-bo-line px-4 py-3.5">
          <span className="font-heading text-xl font-bold uppercase italic">
            BIKE<span className="text-bo-accent">•</span>ONE
          </span>
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={() => setOpen(false)}
            className="text-bo-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col gap-0.5 p-2">
          {categories
            ?.filter((c) => !c.parent_category)
            .map((c) => (
              <li key={c.id}>
                <LocalizedClientLink
                  href={`/categories/${c.handle}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2.5 py-3 text-[14.5px] font-semibold hover:bg-bo-surface-2"
                >
                  {c.name}
                </LocalizedClientLink>
              </li>
            ))}
          <li>
            <LocalizedClientLink
              href="/store"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2.5 py-3 text-[14.5px] font-semibold hover:bg-bo-surface-2"
            >
              Alle Produkte
            </LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink
              href="/account"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2.5 py-3 text-[14.5px] font-semibold hover:bg-bo-surface-2"
            >
              Mein Konto
            </LocalizedClientLink>
          </li>
        </ul>
        <div className="mt-auto border-t border-bo-line p-4 text-xs text-bo-ink-faint">
          Werkstatt · Bikefitting · Filialen
        </div>
      </div>
    </>
  )
}

export default MobileMenu
