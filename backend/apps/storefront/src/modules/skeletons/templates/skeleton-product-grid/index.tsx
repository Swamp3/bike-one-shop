import repeat from "@lib/util/repeat"
import SkeletonProductPreview from "@modules/skeletons/components/skeleton-product-preview"

/** Listing placeholder: sidebar column + the product grid of PaginatedProducts. */
const SkeletonProductGrid = ({
  numberOfProducts = 6,
}: {
  numberOfProducts?: number
}) => {
  return (
    <div className="mt-3 flex flex-col gap-6 px-4 md:flex-row md:items-start md:gap-8 md:px-6">
      <div className="hidden w-[250px] shrink-0 animate-pulse flex-col gap-3 md:flex">
        <div className="h-6 w-1/3 rounded bg-bo-surface-2" />
        {repeat(5).map((i) => (
          <div key={i} className="h-12 rounded-[10px] bg-bo-surface-2" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-3 h-[38px] animate-pulse rounded bg-bo-surface-2" />
        <ul
          className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-4 2xl:grid-cols-4"
          data-testid="products-list-loader"
        >
          {repeat(numberOfProducts).map((index) => (
            <li key={index}>
              <SkeletonProductPreview />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default SkeletonProductGrid
