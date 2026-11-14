"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ReactNode, useCallback, useMemo, useState } from "react"

import { convertToLocale } from "@lib/util/money"
import {
  FACET_KEYS,
  FacetKey,
  Facets,
  parseProductFilters,
  PRICE_MAX_KEY,
  PRICE_MIN_KEY,
} from "@lib/util/product-filters"
import FilterPanel, { Chip } from "./filter-panel"
import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  facets: Facets
  count: number
  children: ReactNode
  "data-testid"?: string
}

const FilterIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="h-[15px] w-[15px]"
    aria-hidden
  >
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
)

const euro = (amount: number) =>
  convertToLocale({ amount, currency_code: "eur", maximumFractionDigits: 0 })

/**
 * Listing layout: filter sidebar (desktop) or drawer (mobile), toolbar with
 * count + sort, and the grid as children. Filter state lives in the URL only.
 */
const RefinementList = ({
  sortBy,
  facets,
  count,
  children,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filters = useMemo(
    () => parseProductFilters(searchParams),
    [searchParams]
  )

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)
      params.delete("page")
      const queryString = params.toString()
      const currentQuery = searchParams.toString()
      const nextPath = queryString ? `${pathname}?${queryString}` : pathname
      const currentPath = currentQuery
        ? `${pathname}?${currentQuery}`
        : pathname
      if (nextPath !== currentPath) router.push(nextPath, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const setQueryParams = (name: string, value: string) =>
    updateQueryParams((params) => params.set(name, value))

  const toggleValue = (key: FacetKey, value: string) =>
    updateQueryParams((params) => {
      const current = params.getAll(key)
      params.delete(key)
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      next.forEach((v) => params.append(key, v))
    })

  const setPrice = (min?: number, max?: number) =>
    updateQueryParams((params) => {
      params.delete(PRICE_MIN_KEY)
      params.delete(PRICE_MAX_KEY)
      if (min !== undefined) params.set(PRICE_MIN_KEY, String(min))
      if (max !== undefined) params.set(PRICE_MAX_KEY, String(max))
    })

  const clearAll = () =>
    updateQueryParams((params) => {
      FACET_KEYS.forEach((key) => params.delete(key))
      params.delete(PRICE_MIN_KEY)
      params.delete(PRICE_MAX_KEY)
    })

  // Chips come from the facets, so groups the page hides (e.g. Kategorie on a category page) never show.
  const chips: Chip[] = [
    ...facets.groups.flatMap((group) =>
      group.values
        .filter((v) => filters[group.key]?.includes(v.value))
        .map((v) => ({
          id: `${group.key}:${v.value}`,
          label: `${group.title}: ${v.label}`,
          remove: () => toggleValue(group.key, v.value),
        }))
    ),
    ...(filters.priceMin !== undefined
      ? [
          {
            id: PRICE_MIN_KEY,
            label: `Preis ab ${euro(filters.priceMin)}`,
            remove: () => setPrice(undefined, filters.priceMax),
          },
        ]
      : []),
    ...(filters.priceMax !== undefined
      ? [
          {
            id: PRICE_MAX_KEY,
            label: `Preis bis ${euro(filters.priceMax)}`,
            remove: () => setPrice(filters.priceMin, undefined),
          },
        ]
      : []),
  ]

  const panelProps = {
    facets,
    filters,
    chips,
    toggleValue,
    setPrice,
    clearAll,
  }

  return (
    <div className="mt-3 flex flex-col px-4 md:flex-row md:items-start md:gap-8 md:px-6">
      <aside
        aria-label="Filter"
        className="hidden md:sticky md:top-[100px] md:block md:max-h-[calc(100vh-110px)] md:w-[250px] md:shrink-0 md:overflow-y-auto md:pb-4 md:pr-1"
      >
        <h2 className="m-0 mb-3 font-heading text-[17px] font-semibold">
          Filter
        </h2>
        <FilterPanel {...panelProps} />
      </aside>

      <div className="min-w-0 flex-1">
        {/* toolbar: sticky under the header on mobile, plain row above the grid on desktop */}
        <div className="sticky top-[59px] z-30 -mx-4 mb-3 flex items-center gap-2.5 border-b border-bo-line bg-bo-bg px-4 py-2.5 md:static md:mx-0 md:mb-4 md:border-b-0 md:bg-transparent md:px-0 md:py-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            className="flex items-center gap-2 rounded-[7px] border border-bo-line-strong bg-bo-surface px-3 py-2 text-[13.5px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-bo-accent md:hidden"
          >
            <FilterIcon />
            Filter
            {chips.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-bo-accent px-1 font-mono text-[10px] font-bold text-bo-accent-ink">
                {chips.length}
              </span>
            )}
          </button>
          <span
            className="whitespace-nowrap font-mono text-[12.5px] text-bo-ink-muted"
            aria-live="polite"
          >
            {count} Artikel
          </span>
          <div className="ml-auto min-w-0">
            <SortProducts
              sortBy={sortBy}
              setQueryParams={setQueryParams}
              data-testid={dataTestId}
            />
          </div>
        </div>

        {children}
      </div>

      {/* mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/35 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter"
        inert={!drawerOpen}
        className={`fixed inset-y-0 right-0 z-[61] flex w-[86%] max-w-[340px] flex-col bg-bo-surface shadow-2xl transition-transform duration-200 md:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-bo-line px-4 py-3.5">
          <h2 className="m-0 font-heading text-[17px] font-semibold">
            Filter
          </h2>
          <button
            type="button"
            aria-label="Filter schließen"
            onClick={() => setDrawerOpen(false)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <FilterPanel {...panelProps} />
        </div>
        <div className="flex gap-2.5 border-t border-bo-line p-3.5">
          <button
            type="button"
            onClick={clearAll}
            className="flex-1 rounded border-[1.5px] border-bo-line-strong bg-transparent py-2.5 text-[13px] font-semibold"
          >
            Zurücksetzen
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex-1 rounded border-[1.5px] border-bo-ink bg-bo-ink py-2.5 text-[13px] font-semibold text-bo-bg"
          >
            {count} Artikel anzeigen
          </button>
        </div>
      </div>
    </div>
  )
}

export default RefinementList
