import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRIDATA_SYNC_MODULE } from "../../../../../modules/tridata-sync"
import type TridataSyncModuleService from "../../../../../modules/tridata-sync/service"

/** Sync state of one Medusa order (by order id), for the order detail widget. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const service = req.scope.resolve<TridataSyncModuleService>(TRIDATA_SYNC_MODULE)
  const [map] = await service.listTridataOrderMaps({ order_id: orderId })
  const logs = await service.listTridataSyncLogs(
    { entity_type: "order", entity_id: orderId },
    { take: 10, order: { created_at: "DESC" } }
  )
  res.json({ order_map: map ?? null, sync_logs: logs })
}
