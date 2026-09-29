/**
 * Shapes for the "Laufradsatz slot" v0/lighter mechanism described in
 * PLAN.md Task 13 §2-3 — `product.metadata.configurable_slots`, not a real
 * linked `bike-configuration` module (explicitly out of scope for this
 * task, see PLAN.md).
 */

/** The raw shape stored in `product.metadata.configurable_slots`. */
export type ConfigurableSlotMetadataOption = {
  product_id: string
  is_default: boolean
}

export type ConfigurableSlotMetadata = {
  slot: string
  options: ConfigurableSlotMetadataOption[]
}

/**
 * A slot's option, resolved against the real, separately-sellable product
 * it points at (title, real variant id to add to cart, real live price).
 * `price`/`currencyCode` come from that product's own
 * `variants[0].calculated_price` for the current region — never a stored
 * delta (PLAN.md Task 13 §2).
 */
export type ResolvedConfigurableSlotOption = {
  productId: string
  variantId: string
  title: string
  thumbnail: string | null
  isDefault: boolean
  price: number | null
  currencyCode: string | null
}

export type ResolvedConfigurableSlot = {
  slot: string
  options: ResolvedConfigurableSlotOption[]
}
