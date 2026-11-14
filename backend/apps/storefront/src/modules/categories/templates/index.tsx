import { notFound } from "next/navigation"
import { Suspense } from "react"

import { ProductFilters } from "@lib/util/product-filters"
import { HttpTypes } from "@medusajs/types"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"
import PlpPageHead from "@modules/store/components/plp-page-head"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  filters,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  filters: ProductFilters
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  return (
    <div className="pb-10">
      <PlpBreadcrumb
        items={[
          { label: "Start", href: "/" },
          { label: "Fahrräder", href: "/store" },
          { label: category.name },
        ]}
      />
      <PlpPageHead title={category.name} />

      {category.description && (
        <p className="max-w-[70ch] px-4 pb-2 text-[13.5px] text-bo-ink-muted md:px-6">
          {category.description}
        </p>
      )}

      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          categoryId={category.id}
          countryCode={countryCode}
          filters={filters}
          hiddenFacets={["kategorie"]}
        />
      </Suspense>
    </div>
  )
}
