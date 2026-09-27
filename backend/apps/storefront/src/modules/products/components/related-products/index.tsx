import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import BikeOneProductCard from "@modules/products/components/bikeone-product-card"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

export default async function RelatedProducts({
  product,
  countryCode,
}: RelatedProductsProps) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const categoryId = product.categories?.[0]?.id
  const fields = "*variants.calculated_price,*collection"

  // Prefer same-category products (our catalog is small enough that
  // same-collection/brand matches are usually empty — each brand has one
  // product today). Falls back to "other products" so the section never
  // shows an empty state for lack of siblings.
  let products: HttpTypes.StoreProduct[] = []

  if (categoryId) {
    const { response } = await listProducts({
      countryCode,
      queryParams: { category_id: [categoryId], limit: 5, fields },
    })
    products = response.products.filter((p) => p.id !== product.id)
  }

  if (!products.length) {
    const { response } = await listProducts({
      countryCode,
      queryParams: { limit: 5, fields },
    })
    products = response.products.filter((p) => p.id !== product.id)
  }

  if (!products.length) {
    return null
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {products.slice(0, 4).map((p) => (
        <BikeOneProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
