"use client"

import { FormEvent, ReactNode, useId, useState } from "react"

import {
  Facet,
  FacetKey,
  Facets,
  ProductFilters,
} from "@lib/util/product-filters"

export type Chip = { id: string; label: string; remove: () => void }

type FilterPanelProps = {
  facets: Facets
  filters: ProductFilters
  chips: Chip[]
  toggleValue: (key: FacetKey, value: string) => void
  setPrice: (min?: number, max?: number) => void
  clearAll: () => void
}

const VISIBLE_VALUES = 5
const OPEN_BY_DEFAULT: (FacetKey | "preis")[] = ["kategorie", "marke", "preis"]

const PlusMinus = () => (
  <svg
    viewBox="0 0 16 16"
    className="h-3.5 w-3.5 shrink-0"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
  >
    <path d="M3 8h10" />
    <path d="M8 3v10" className="group-open/facet:hidden" />
  </svg>
)

const Group = ({
  title,
  open,
  selectedCount = 0,
  children,
}: {
  title: string
  open: boolean
  selectedCount?: number
  children: ReactNode
}) => (
  <details
    open={open}
    className="group/facet mb-2 rounded-[10px] border border-bo-line bg-bo-surface"
  >
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-[10px] px-3.5 py-3 font-heading text-[13.5px] font-semibold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bo-accent [&::-webkit-details-marker]:hidden">
      <span>
        {title}
        {selectedCount > 0 && (
          <span className="ml-1.5 font-mono text-[11px] font-normal text-bo-accent">
            ({selectedCount})
          </span>
        )}
      </span>
      <PlusMinus />
    </summary>
    <div className="px-3.5 pb-3">{children}</div>
  </details>
)

const CheckboxGroup = ({
  facet,
  selected,
  toggle,
  showAllOnDesktop = false,
}: {
  facet: Facet
  selected: string[]
  toggle: (value: string) => void
  // Desktop sidebar has room for every value, so skip the "Mehr anzeigen" cut-off there (mobile drawer keeps it).
  showAllOnDesktop?: boolean
}) => {
  const [expanded, setExpanded] = useState(false)
  const visible = facet.values.filter(
    (v, i) => expanded || i < VISIBLE_VALUES || selected.includes(v.value)
  )
  const hiddenCount = facet.values.length - visible.length
  const hiddenOnMobile = new Set(
    showAllOnDesktop && !expanded
      ? facet.values.filter((v) => !visible.includes(v)).map((v) => v.value)
      : []
  )
  const shown = showAllOnDesktop && !expanded ? facet.values : visible

  return (
    <>
      <ul className="m-0 flex list-none flex-col p-0">
        {shown.map((v) => (
          <li
            key={v.value}
            className={hiddenOnMobile.has(v.value) ? "max-md:hidden" : undefined}
          >
            <label className="flex cursor-pointer items-center gap-2.5 rounded py-1.5 text-[13.5px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bo-accent has-[:focus-visible]:[outline-offset:-2px]">
              <input
                type="checkbox"
                checked={selected.includes(v.value)}
                onChange={() => toggle(v.value)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--bo-accent)]"
              />
              {v.color && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--bo-ink)_30%,transparent)]"
                  style={{ backgroundColor: v.color }}
                />
              )}
              <span className="min-w-0 flex-1 truncate">{v.label}</span>
              <span className="font-mono text-[11.5px] text-bo-ink-faint">
                {v.count}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {(hiddenCount > 0 || (expanded && facet.values.length > VISIBLE_VALUES)) && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className={`mt-1 text-[12.5px] font-semibold text-bo-accent underline decoration-dashed underline-offset-[3px] ${
            showAllOnDesktop ? "md:hidden" : ""
          }`}
        >
          {expanded ? "Weniger anzeigen" : `Mehr anzeigen (${hiddenCount})`}
        </button>
      )}
    </>
  )
}

const PriceInputs = ({
  range,
  filters,
  setPrice,
}: {
  range: { min: number; max: number } | null
  filters: ProductFilters
  setPrice: (min?: number, max?: number) => void
}) => {
  const id = useId()

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const read = (name: string) => {
      const raw = String(data.get(name) ?? "").trim()
      const n = Number(raw)
      return raw && Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined
    }
    setPrice(read("min"), read("max"))
  }

  const inputClass =
    "w-full min-w-0 rounded-[7px] border border-bo-line bg-bo-surface px-2.5 py-2 text-[13px] tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-bo-accent"

  return (
    <form
      // Remount on URL change so the inputs show the applied values.
      key={`${filters.priceMin}-${filters.priceMax}`}
      onSubmit={onSubmit}
      className="flex items-end gap-2"
    >
      <label htmlFor={`${id}-min`} className="flex-1 text-[11.5px] text-bo-ink-muted">
        Von (€)
        <input
          id={`${id}-min`}
          name="min"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder={range ? String(range.min) : undefined}
          defaultValue={filters.priceMin ?? ""}
          className={inputClass}
        />
      </label>
      <label htmlFor={`${id}-max`} className="flex-1 text-[11.5px] text-bo-ink-muted">
        Bis (€)
        <input
          id={`${id}-max`}
          name="max"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder={range ? String(range.max) : undefined}
          defaultValue={filters.priceMax ?? ""}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        className="rounded-[7px] border border-bo-ink bg-bo-ink px-2.5 py-2 text-[12.5px] font-semibold text-bo-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bo-accent"
      >
        OK
      </button>
    </form>
  )
}

/** Active chips + facet groups. Rendered in the desktop sidebar and the mobile drawer. */
const FilterPanel = ({
  facets,
  filters,
  chips,
  toggleValue,
  setPrice,
  clearAll,
}: FilterPanelProps) => {
  const hasPrice =
    filters.priceMin !== undefined || filters.priceMax !== undefined
  const priceIndex = facets.groups.findIndex(
    (g) => g.key !== "kategorie" && g.key !== "marke"
  )
  const groups = facets.groups.map((facet) => {
    const selected = filters[facet.key] ?? []
    return (
      <Group
        key={facet.key}
        title={facet.title}
        open={OPEN_BY_DEFAULT.includes(facet.key) || selected.length > 0}
        selectedCount={selected.length}
      >
        <CheckboxGroup
          facet={facet}
          selected={selected}
          toggle={(value) => toggleValue(facet.key, value)}
          showAllOnDesktop={facet.key === "kategorie"}
        />
      </Group>
    )
  })

  if (facets.price || hasPrice) {
    groups.splice(
      priceIndex === -1 ? groups.length : priceIndex,
      0,
      <Group key="preis" title="Preis" open selectedCount={hasPrice ? 1 : 0}>
        <PriceInputs range={facets.price} filters={filters} setPrice={setPrice} />
      </Group>
    )
  }

  return (
    <div>
      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <div
              key={chip.id}
              className="flex items-center gap-1.5 rounded-full border border-bo-line-strong bg-bo-surface-2 py-1 pl-3 pr-1.5 text-[12.5px]"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                aria-label={`Filter entfernen: ${chip.label}`}
                onClick={chip.remove}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-bo-line-strong text-[11px] leading-none text-bo-surface hover:bg-bo-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-bo-accent"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-[12.5px] font-semibold text-bo-accent underline decoration-dashed underline-offset-[3px]"
          >
            Alle zurücksetzen
          </button>
        </div>
      )}
      {groups}
    </div>
  )
}

export default FilterPanel
