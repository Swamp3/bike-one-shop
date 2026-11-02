import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import TridataSyncModule from "../modules/tridata-sync"

// Read-only link over tridata_order_map.order_id (no link table).
export default defineLink(
  {
    linkable: TridataSyncModule.linkable.tridataOrderMap,
    field: "order_id",
  },
  OrderModule.linkable.order,
  { readOnly: true }
)
