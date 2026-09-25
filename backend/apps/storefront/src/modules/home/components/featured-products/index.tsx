import { HttpTypes } from "@medusajs/types"

import { listProducts } from "@lib/data/products"
import BikeOneProductCard from "@modules/products/components/bikeone-product-card"

export default async function FeaturedProducts({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      fields: "*variants.calculated_price,*collection",
      limit: 8,
    },
  })

  if (!products.length) {
    return null
  }

  return (
    <section id="empfohlen" className="px-4 py-7 md:px-6 md:py-9">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-heading text-[22px] font-semibold">
          Empfohlen für dich
        </h2>
        <span className="font-mono text-[11.5px] text-bo-ink-faint">
          {products.length} Produkte
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {products.map((product) => (
          <BikeOneProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
