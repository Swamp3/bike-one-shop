import { Suspense } from "react"

import { listProducts } from "@lib/data/products"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { HttpTypes } from "@medusajs/types"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"
import PlpPageHead from "@modules/store/components/plp-page-head"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"

export default async function CollectionTemplate({
  sortBy,
  collection,
  page,
  countryCode,
  optionValueIds,
}: {
  sortBy?: SortOptions
  collection: HttpTypes.StoreCollection
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const { response } = await listProducts({
    countryCode,
    queryParams: {
      collection_id: [collection.id],
      limit: 1,
      ...(optionValueIds?.length
        ? { option_value_id: optionValueIds }
        : {}),
    },
  }).catch(() => ({ response: { count: undefined } }))

  return (
    <div className="pb-10">
      <PlpBreadcrumb
        items={[
          { label: "Start", href: "/" },
          { label: "Marken", href: "/store" },
          { label: collection.title },
        ]}
      />
      <PlpPageHead title={collection.title} count={response.count} />

      <div className="mt-3 flex flex-col gap-6 px-4 md:flex-row md:items-start md:gap-8 md:px-6">
        <RefinementList sortBy={sort} />
        <div className="min-w-0 flex-1">
          <Suspense
            fallback={
              <SkeletonProductGrid
                numberOfProducts={collection.products?.length}
              />
            }
          >
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              collectionId={collection.id}
              countryCode={countryCode}
              optionValueIds={optionValueIds}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
