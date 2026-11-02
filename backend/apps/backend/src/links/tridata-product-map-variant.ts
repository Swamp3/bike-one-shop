import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import TridataSyncModule from "../modules/tridata-sync"

// Read-only link over tridata_product_map.variant_id (no link table).
export default defineLink(
  {
    linkable: TridataSyncModule.linkable.tridataProductMap,
    field: "variant_id",
  },
  ProductModule.linkable.productVariant,
  { readOnly: true }
)
