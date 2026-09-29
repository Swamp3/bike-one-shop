import { listProducts } from "@lib/data/products"
import {
  ConfigurableSlotMetadata,
  ResolvedConfigurableSlot,
  ResolvedConfigurableSlotOption,
} from "@lib/types/configurable-slot"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

type VariantWithCalculatedPrice = HttpTypes.StoreProductVariant & {
  calculated_price?: {
    calculated_amount: number
    currency_code: string
  }
}

/**
 * Resolves `product.metadata.configurable_slots` (the Laufradsatz
 * slot mechanism, PLAN.md Task 13 §2-3) against the real, separately
 * sellable products it points at (Miche/Zipp), fetched with real,
 * region-priced `calculated_price` — never a stored delta. Returns `[]`
 * for every product without the metadata (everything except Wilier
 * Adlar today), so `ProductActions` renders no slot UI for them.
 */
async function resolveConfigurableSlots(
  product: HttpTypes.StoreProduct,
  regionId: string
): Promise<ResolvedConfigurableSlot[]> {
  const rawSlots = (product.metadata?.configurable_slots ?? []) as
    | ConfigurableSlotMetadata[]
    | null

  if (!rawSlots || rawSlots.length === 0) {
    return []
  }

  const componentProductIds = Array.from(
    new Set(rawSlots.flatMap((slot) => slot.options.map((o) => o.product_id)))
  )

  if (componentProductIds.length === 0) {
    return []
  }

  const { response } = await listProducts({
    queryParams: {
      id: componentProductIds,
      fields: "id,title,thumbnail,*variants.calculated_price",
    },
    regionId,
  })

  const componentProductsById = new Map(
    response.products.map((p) => [p.id, p])
  )

  return rawSlots.map((slot) => {
    const options = slot.options
      .map((opt): ResolvedConfigurableSlotOption | null => {
        const componentProduct = componentProductsById.get(opt.product_id)
        const variant = componentProduct?.variants?.[0] as
          | VariantWithCalculatedPrice
          | undefined

        if (!componentProduct || !variant) {
          return null
        }

        return {
          productId: opt.product_id,
          variantId: variant.id,
          title: componentProduct.title,
          thumbnail: componentProduct.thumbnail ?? null,
          isDefault: opt.is_default,
          price: variant.calculated_price?.calculated_amount ?? null,
          currencyCode: variant.calculated_price?.currency_code ?? null,
        }
      })
      .filter((o): o is ResolvedConfigurableSlotOption => o !== null)

    return { slot: slot.slot, options }
  })
}

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  const configurableSlots = await resolveConfigurableSlots(product, region.id)

  return (
    <ProductActions
      product={product}
      region={region}
      configurableSlots={configurableSlots}
    />
  )
}
