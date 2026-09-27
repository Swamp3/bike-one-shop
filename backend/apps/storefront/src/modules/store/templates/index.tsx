import { Suspense } from "react"

import { listProducts } from "@lib/data/products"
import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"
import PlpPageHead from "@modules/store/components/plp-page-head"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  q,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  q?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const { response } = await listProducts({
    countryCode,
    queryParams: {
      limit: 1,
      ...(q ? { q } : {}),
      ...(optionValueIds?.length
        ? { option_value_id: optionValueIds }
        : {}),
    },
  }).catch(() => ({ response: { count: undefined } }))

  return (
    <div className="pb-10">
      <PlpBreadcrumb items={[{ label: "Start", href: "/" }, { label: "Alle Produkte" }]} />
      <PlpPageHead
        title={q ? `Suche: „${q}“` : "Alle Produkte"}
        count={response.count}
      />

      <div className="mt-3 flex flex-col gap-6 px-4 md:flex-row md:items-start md:gap-8 md:px-6">
        <RefinementList sortBy={sort} />
        <div className="min-w-0 flex-1">
          <Suspense fallback={<SkeletonProductGrid numberOfProducts={8} />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              countryCode={countryCode}
              optionValueIds={optionValueIds}
              q={q}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default StoreTemplate
