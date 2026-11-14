import { Suspense } from "react"

import { ProductFilters } from "@lib/util/product-filters"
import { HttpTypes } from "@medusajs/types"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"
import PlpPageHead from "@modules/store/components/plp-page-head"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"

export default function CollectionTemplate({
  sortBy,
  collection,
  page,
  countryCode,
  filters,
}: {
  sortBy?: SortOptions
  collection: HttpTypes.StoreCollection
  page?: string
  countryCode: string
  filters: ProductFilters
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div className="pb-10">
      <PlpBreadcrumb
        items={[
          { label: "Start", href: "/" },
          { label: "Marken", href: "/store" },
          { label: collection.title },
        ]}
      />
      <PlpPageHead title={collection.title} />

      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          collectionId={collection.id}
          countryCode={countryCode}
          filters={filters}
          hiddenFacets={["marke"]}
        />
      </Suspense>
    </div>
  )
}
