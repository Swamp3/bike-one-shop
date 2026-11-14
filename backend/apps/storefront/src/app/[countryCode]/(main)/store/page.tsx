import { Metadata } from "next"
import { notFound } from "next/navigation"

import { parseProductFilters } from "@lib/util/product-filters"
import { getRegion } from "@lib/data/regions"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Alle Produkte",
  description: "Alle Bikes und Zubehör bei BikeOne.",
}

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      q?: string
    }
  >
}

export default async function StorePage(props: Props) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page, q } = searchParams
  const filters = parseProductFilters(searchParams)

  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={countryCode}
      filters={filters}
      q={q}
    />
  )
}
