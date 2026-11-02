import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { TRIDATA_STOCK_SNAPSHOT_MODULE } from "../../../../modules/tridata-stock-snapshot"
import type TridataStockSnapshotModuleService from "../../../../modules/tridata-stock-snapshot/service"
import type { AdminTridataStockSnapshotsQueryType } from "../validators"

/** Raw TriCon quantities per variant x branch, next to the current InventoryLevel. */
export async function GET(
  req: MedusaRequest<unknown, AdminTridataStockSnapshotsQueryType>,
  res: MedusaResponse
) {
  const { limit, offset, sku, filialname } =
    req.validatedQuery as AdminTridataStockSnapshotsQueryType
  const service = req.scope.resolve<TridataStockSnapshotModuleService>(
    TRIDATA_STOCK_SNAPSHOT_MODULE
  )
  const inventory = req.scope.resolve(Modules.INVENTORY)
  const filters: Record<string, unknown> = {}
  if (sku) {
    filters.sku = { $ilike: `%${sku}%` }
  }
  if (filialname) {
    filters.filialname = filialname
  }
  const [snapshots, count] = await service.listAndCountTridataStockSnapshots(
    filters,
    { take: limit, skip: offset, order: { sku: "ASC", filialname: "ASC" } }
  )
  const levels = snapshots.length
    ? await inventory.listInventoryLevels(
        {
          inventory_item_id: [
            ...new Set(snapshots.map((s) => s.inventory_item_id)),
          ],
        },
        { take: null }
      )
    : []
  const levelByKey = new Map(
    levels.map((l) => [`${l.inventory_item_id}:${l.location_id}`, l])
  )
  res.json({
    stock_snapshots: snapshots.map((s) => {
      const level = levelByKey.get(`${s.inventory_item_id}:${s.stock_location_id}`)
      return {
        ...s,
        inventory_level: level
          ? {
              stocked_quantity: Number(level.stocked_quantity),
              reserved_quantity: Number(level.reserved_quantity),
              available_quantity: Number(level.available_quantity),
            }
          : null,
      }
    }),
    count,
    limit,
    offset,
  })
}
