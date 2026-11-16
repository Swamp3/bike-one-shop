import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { FacetKey, ProductFilters } from "@lib/util/product-filters"
import BikeOneProductCard from "@modules/products/components/bikeone-product-card"
import { Pagination } from "@modules/store/components/pagination"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
}

/** Listing body shared by store, category and collection pages: sidebar, toolbar, grid. */
export default async function PaginatedProducts({
  sortBy = "created_at",
  page,
  collectionId,
  categoryIds,
  productsIds,
  countryCode,
  filters,
  hiddenFacets,
  q,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryIds?: string[]
  productsIds?: string[]
  countryCode: string
  filters?: ProductFilters
  hiddenFacets?: FacetKey[]
  q?: string
}) {
  const queryParams: PaginatedProductsParams = {
    limit: PRODUCT_LIMIT,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryIds) {
    queryParams["category_id"] = categoryIds
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const {
    response: { products, count },
    facets,
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    filters,
    hiddenFacets,
    q,
  })

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  return (
    <RefinementList sortBy={sortBy} facets={facets} count={count}>
      {products.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-bo-line-strong px-4 py-12 text-center text-[14px] text-bo-ink-muted">
          {q
            ? `Keine Ergebnisse für „${q}“.`
            : "Keine Produkte gefunden. Versuch's mit weniger Filtern."}
        </div>
      ) : (
        <>
          <ul
            className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 lg:grid-cols-3 lg:gap-4 2xl:grid-cols-4"
            data-testid="products-list"
          >
            {products.map((p, index) => (
              <li key={p.id}>
                <BikeOneProductCard product={p} priority={index < 2} />
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <Pagination
              data-testid="product-pagination"
              page={page}
              totalPages={totalPages}
            />
          )}
        </>
      )}
    </RefinementList>
  )
}
