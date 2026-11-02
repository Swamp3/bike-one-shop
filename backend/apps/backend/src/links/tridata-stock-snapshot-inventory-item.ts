import { defineLink } from "@medusajs/framework/utils"
import InventoryModule from "@medusajs/medusa/inventory"
import TridataStockSnapshotModule from "../modules/tridata-stock-snapshot"

// Read-only link over tridata_stock_snapshot.inventory_item_id (no link table).
export default defineLink(
  {
    linkable: TridataStockSnapshotModule.linkable.tridataStockSnapshot,
    field: "inventory_item_id",
  },
  InventoryModule.linkable.inventoryItem,
  { readOnly: true }
)
