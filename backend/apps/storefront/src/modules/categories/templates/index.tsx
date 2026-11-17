import { notFound } from "next/navigation"
import { Suspense } from "react"

import {
  ancestorChain,
  descendantIds,
  visibleChildren,
} from "@lib/util/category-tree"
import { ProductFilters } from "@lib/util/product-filters"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"
import PlpPageHead from "@modules/store/components/plp-page-head"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"

export default function CategoryTemplate({
  category,
  allCategories,
  sortBy,
  page,
  countryCode,
  filters,
}: {
  category: HttpTypes.StoreProductCategory
  allCategories: HttpTypes.StoreProductCategory[]
  sortBy?: SortOptions
  page?: string
  countryCode: string
  filters: ProductFilters
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const categoryIds = descendantIds(category, allCategories)
  const parents = ancestorChain(category, allCategories).slice(0, -1)
  const children = visibleChildren(category, allCategories)

  return (
    <div className="pb-10">
      <PlpBreadcrumb
        items={[
          { label: "Start", href: "/" },
          ...parents.map((c) => ({
            label: c.name,
            href: `/categories/${c.handle}`,
          })),
          { label: category.name },
        ]}
      />
      <PlpPageHead title={category.name} />

      {category.description && (
        <p className="max-w-[70ch] px-4 pb-2 text-[13.5px] text-bo-ink-muted md:px-6">
          {category.description}
        </p>
      )}

      {/* Desktop gets the same links from the nav row and the Kategorie filter. */}
      {children.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 px-4 pb-3 pt-1 md:hidden">
          {children.map((c) => (
            <li key={c.id}>
              <LocalizedClientLink
                href={`/categories/${c.handle}`}
                className="block rounded-full border border-bo-line-strong bg-bo-surface-2 px-3 py-1 text-[12.5px] hover:border-bo-accent hover:text-bo-accent"
              >
                {c.name}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      )}

      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          categoryIds={categoryIds}
          countryCode={countryCode}
          filters={filters}
          // Parent pages keep the Kategorie facet so visitors can narrow down to a subcategory.
          hiddenFacets={categoryIds.length > 1 ? undefined : ["kategorie"]}
        />
      </Suspense>
    </div>
  )
}
