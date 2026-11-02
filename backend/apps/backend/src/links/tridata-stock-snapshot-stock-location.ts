import { defineLink } from "@medusajs/framework/utils"
import StockLocationModule from "@medusajs/medusa/stock-location"
import TridataStockSnapshotModule from "../modules/tridata-stock-snapshot"

// Read-only link over tridata_stock_snapshot.stock_location_id (no link table).
export default defineLink(
  {
    linkable: TridataStockSnapshotModule.linkable.tridataStockSnapshot,
    field: "stock_location_id",
  },
  StockLocationModule.linkable.stockLocation,
  { readOnly: true }
)
