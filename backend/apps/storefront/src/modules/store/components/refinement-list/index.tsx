"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { sdk } from "@lib/config"
import {
  OPTION_VALUE_QUERY_KEY,
  parseOptionValueIds,
} from "@lib/util/product-option-filters"
import { HttpTypes } from "@medusajs/types"
import OptionsPicker from "./options-picker"
import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  hideOptionsPicker?: boolean
  "data-testid"?: string
}

const FilterIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="h-[15px] w-[15px]"
  >
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
)

const RefinementList = ({
  sortBy,
  hideOptionsPicker = false,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [options, setOptions] = useState<HttpTypes.StoreProductOption[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (hideOptionsPicker) return
    sdk.client
      .fetch<{ product_options?: HttpTypes.StoreProductOption[] }>(
        "/store/product-options",
        { method: "GET", query: { is_exclusive: false, fields: "*values" } }
      )
      .then((res) => setOptions(res?.product_options ?? []))
      .catch(() => setOptions([]))
  }, [hideOptionsPicker])

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
      if (nextPath !== currentPath) router.push(nextPath)
    },
    [pathname, router, searchParams]
  )

  const setQueryParams = (name: string, value: string) =>
    updateQueryParams((params) => params.set(name, value))

  const selectedOptionValueIds = useMemo(
    () => parseOptionValueIds(searchParams),
    [searchParams]
  )

  const setOptionValueIds = (valueIds: string[]) =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      valueIds.forEach((id) => params.append(OPTION_VALUE_QUERY_KEY, id))
    })

  const valueLabel = (valueId: string) => {
    for (const option of options) {
      const match = option.values?.find((v) => v.id === valueId)
      if (match) return { optionTitle: option.title, label: match.value }
    }
    return null
  }

  const filtersBody = !hideOptionsPicker && (
    <OptionsPicker
      options={options}
      selectedValueIds={selectedOptionValueIds}
      setOptionValueIds={setOptionValueIds}
    />
  )

  return (
    <div className="w-full md:w-[250px] md:shrink-0">
      {/* toolbar: mobile filter-open button + sort, desktop just sort above the sidebar */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5 border-b border-bo-line px-4 py-3.5 md:mb-0 md:border-b-0 md:px-0 md:py-0">
        {!hideOptionsPicker && options.length > 0 && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 rounded-[7px] border border-bo-line-strong bg-bo-surface px-3.5 py-2 text-[13.5px] font-semibold md:hidden"
          >
            <FilterIcon />
            Filter
            {selectedOptionValueIds.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-bo-accent px-1 font-mono text-[10px] font-bold text-bo-accent-ink">
                {selectedOptionValueIds.length}
              </span>
            )}
          </button>
        )}
        <div className="md:hidden">
          <SortProducts
            sortBy={sortBy}
            setQueryParams={setQueryParams}
            data-testid={dataTestId}
          />
        </div>
      </div>

      {/* active filter chips */}
      {selectedOptionValueIds.length > 0 && (
        <div className="mb-3.5 flex flex-wrap items-center gap-2 px-4 md:px-0">
          {selectedOptionValueIds.map((id) => {
            const info = valueLabel(id)
            if (!info) return null
            return (
              <div
                key={id}
                className="flex items-center gap-1.5 rounded-full border border-bo-line-strong bg-bo-surface-2 py-1.5 pl-3 pr-1.5 text-[12.5px]"
              >
                <span>
                  {info.optionTitle}: {info.label}
                </span>
                <button
                  type="button"
                  aria-label={`Filter entfernen: ${info.label}`}
                  onClick={() =>
                    setOptionValueIds(
                      selectedOptionValueIds.filter((v) => v !== id)
                    )
                  }
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-bo-line-strong text-[11px] leading-none text-bo-surface hover:bg-bo-ink"
                >
                  ✕
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={() => setOptionValueIds([])}
            className="text-[12.5px] font-semibold text-bo-accent underline decoration-dashed underline-offset-[3px]"
          >
            Alle zurücksetzen
          </button>
        </div>
      )}

      {/* desktop sort, above the sticky sidebar */}
      {!hideOptionsPicker && (
        <div className="mb-4 hidden md:block">
          <SortProducts
            sortBy={sortBy}
            setQueryParams={setQueryParams}
            data-testid={dataTestId}
          />
        </div>
      )}

      {/* desktop sticky sidebar */}
      {!hideOptionsPicker && options.length > 0 && (
        <aside className="hidden md:sticky md:top-[100px] md:block">
          {filtersBody}
        </aside>
      )}

      {/* mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/35 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <div
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
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">{filtersBody}</div>
        <div className="flex gap-2.5 border-t border-bo-line p-3.5">
          <button
            type="button"
            onClick={() => setOptionValueIds([])}
            className="flex-1 rounded border-[1.5px] border-bo-line-strong bg-transparent py-2.5 text-[13px] font-semibold"
          >
            Zurücksetzen
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex-1 rounded border-[1.5px] border-bo-ink bg-bo-ink py-2.5 text-[13px] font-semibold text-bo-bg"
          >
            Anwenden
          </button>
        </div>
      </div>
    </div>
  )
}

export default RefinementList
