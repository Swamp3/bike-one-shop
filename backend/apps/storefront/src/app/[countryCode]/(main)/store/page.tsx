import { Metadata } from "next"
import { notFound } from "next/navigation"

import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { getRegion } from "@lib/data/regions"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Alle Produkte",
  description: "Alle Bikes und Zubehör bei Bike One.",
}

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      optionValueIds?: string | string[]
      q?: string
    }
  >
}

export default async function StorePage(props: Props) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page, q } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={countryCode}
      optionValueIds={optionValueIds}
      q={q}
    />
  )
}
