import { HttpTypes } from "@medusajs/types"

import { colorFamily, COLOR_FAMILIES, swatchColor } from "./color-swatches"

/** URL query keys of the list facets, in sidebar order. */
export const FACET_KEYS = [
  "kategorie",
  "marke",
  "schaltgruppe",
  "farbe",
  "material",
] as const
export type FacetKey = (typeof FACET_KEYS)[number]

export const PRICE_MIN_KEY = "preis_min"
export const PRICE_MAX_KEY = "preis_max"

export type ProductFilters = Partial<Record<FacetKey, string[]>> & {
  priceMin?: number
  priceMax?: number
}

export type FacetValue = {
  value: string
  label: string
  count: number
  color?: string
}

export type Facet = { key: FacetKey; title: string; values: FacetValue[] }

export type Facets = {
  groups: Facet[]
  price: { min: number; max: number } | null
}

const FACET_TITLES: Record<FacetKey, string> = {
  kategorie: "Kategorie",
  marke: "Marke",
  schaltgruppe: "Schaltgruppe",
  farbe: "Farbe",
  material: "Rahmenmaterial",
}

type SearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>

const getAll = (params: SearchParams, key: string): string[] => {
  const raw =
    params instanceof URLSearchParams ? params.getAll(key) : params[key]
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return Array.from(new Set(list.map((v) => v.trim()).filter(Boolean)))
}

const parsePrice = (params: SearchParams, key: string) => {
  const n = Number(getAll(params, key)[0])
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export const parseProductFilters = (params: SearchParams): ProductFilters => {
  const filters: ProductFilters = {
    priceMin: parsePrice(params, PRICE_MIN_KEY),
    priceMax: parsePrice(params, PRICE_MAX_KEY),
  }
  FACET_KEYS.forEach((key) => {
    const values = getAll(params, key)
    if (values.length) filters[key] = values
  })
  return filters
}

/** Number of active filter values (chips), for the mobile "Filter (n)" badge. */
export const countActiveFilters = (filters: ProductFilters) =>
  FACET_KEYS.reduce((n, key) => n + (filters[key]?.length ?? 0), 0) +
  (filters.priceMin !== undefined ? 1 : 0) +
  (filters.priceMax !== undefined ? 1 : 0)

const optionValues = (product: HttpTypes.StoreProduct, title: string) =>
  (product.options ?? [])
    .filter((o) => o.title === title)
    .flatMap((o) => (o.values ?? []).map((v) => v.value))
    .filter((v): v is string => !!v)

/** Gross variant prices in major units (EUR). */
export const variantPrices = (product: HttpTypes.StoreProduct): number[] =>
  (product.variants ?? [])
    .map((v) => v.calculated_price?.calculated_amount)
    .filter((n): n is number => typeof n === "number")

/** Facet entries of one product per group: `value` goes into the URL. */
const facetEntries: Record<
  FacetKey,
  (p: HttpTypes.StoreProduct) => { value: string; label: string; color?: string }[]
> = {
  kategorie: (p) =>
    (p.categories ?? []).map((c) => ({ value: c.handle, label: c.name })),
  marke: (p) =>
    p.collection?.handle
      ? [{ value: p.collection.handle, label: p.collection.title }]
      : [],
  schaltgruppe: (p) =>
    optionValues(p, "Schaltung").map((v) => ({ value: v, label: v })),
  farbe: (p) =>
    optionValues(p, "Farbe").map((v) => {
      const family = colorFamily(swatchColor(v, p.metadata?.color_swatches))
      return { value: family, label: family, color: COLOR_FAMILIES[family] }
    }),
  material: (p) =>
    p.material ? [{ value: p.material, label: p.material }] : [],
}

/**
 * OR within a group, AND across groups, all on product level (a product with
 * SRAM Force in red and SRAM Rival in black matches "SRAM Force + Schwarz").
 * `skip` leaves one group out, for that group's own facet counts.
 */
export const matchesFilters = (
  product: HttpTypes.StoreProduct,
  filters: ProductFilters,
  skip?: FacetKey | "price"
): boolean => {
  for (const key of FACET_KEYS) {
    const selected = filters[key]
    if (key === skip || !selected?.length) continue
    if (!facetEntries[key](product).some((e) => selected.includes(e.value)))
      return false
  }
  if (skip !== "price" && (filters.priceMin !== undefined || filters.priceMax !== undefined)) {
    const min = filters.priceMin ?? 0
    const max = filters.priceMax ?? Infinity
    // Any variant in range: "bis 5.000 €" keeps a bike whose cheapest build fits.
    if (!variantPrices(product).some((n) => n >= min && n <= max)) return false
  }
  return true
}

/**
 * Facets of the current listing. Each group counts the products matching all
 * other groups, so its own values stay selectable (OR). Values with 0 results
 * are hidden unless selected.
 */
export const computeFacets = (
  products: HttpTypes.StoreProduct[],
  filters: ProductFilters,
  hidden: FacetKey[] = []
): Facets => {
  const groups = FACET_KEYS.filter((key) => !hidden.includes(key))
    .map((key): Facet => {
      const byValue = new Map<string, FacetValue>()
      for (const p of products) {
        if (!matchesFilters(p, filters, key)) continue
        const seen = new Set<string>()
        for (const e of facetEntries[key](p)) {
          if (seen.has(e.value)) continue
          seen.add(e.value)
          const entry = byValue.get(e.value) ?? { ...e, count: 0 }
          entry.count++
          byValue.set(e.value, entry)
        }
      }
      for (const value of filters[key] ?? []) {
        if (byValue.has(value)) continue
        const known = products
          .flatMap(facetEntries[key])
          .find((e) => e.value === value)
        byValue.set(value, { value, label: value, ...known, count: 0 })
      }
      const values = Array.from(byValue.values()).sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label, "de")
      )
      return { key, title: FACET_TITLES[key], values }
    })
    .filter((g) => g.values.length > 0)

  const prices = products
    .filter((p) => matchesFilters(p, filters, "price"))
    .flatMap(variantPrices)

  return {
    groups,
    price: prices.length
      ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
      : null,
  }
}
