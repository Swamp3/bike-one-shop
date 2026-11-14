import { Suspense } from "react"

import { ProductFilters } from "@lib/util/product-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"
import PlpPageHead from "@modules/store/components/plp-page-head"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  filters,
  q,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  filters: ProductFilters
  q?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div className="pb-10">
      <PlpBreadcrumb items={[{ label: "Start", href: "/" }, { label: "Alle Produkte" }]} />
      <PlpPageHead title={q ? `Suche: „${q}“` : "Alle Produkte"} />

      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          countryCode={countryCode}
          filters={filters}
          q={q}
        />
      </Suspense>
    </div>
  )
}

export default StoreTemplate
