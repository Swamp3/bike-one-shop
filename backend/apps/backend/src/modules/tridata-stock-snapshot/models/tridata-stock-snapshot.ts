import { model } from "@medusajs/framework/utils"

/**
 * Raw TriCon stock per (inventory item x stock location). Quantities are
 * floats: TriCon returns doubles and some items are sold by weight/length.
 * MengeVerfuegbar is authoritative; InventoryLevel is derived from it.
 */
const TridataStockSnapshot = model
  .define("tridata_stock_snapshot", {
    id: model.id({ prefix: "tdss" }).primaryKey(),
    inventory_item_id: model.text(),
    stock_location_id: model.text(),
    variant_id: model.text().nullable(),
    sku: model.text().nullable(),
    filialname: model.text(),
    source: model.enum(["branch", "color_size_branch"]),
    lagerbestand: model.float().default(0),
    reserviert: model.float().default(0),
    bestellt: model.float().default(0),
    menge_verfuegbar: model.float().default(0),
    tribike_last_change: model.text().nullable(),
    payload_hash: model.text().nullable(),
    last_synced_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      on: ["inventory_item_id", "stock_location_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default TridataStockSnapshot
