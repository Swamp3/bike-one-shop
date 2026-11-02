import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TRIDATA_SYNC_MODULE } from "../../../../modules/tridata-sync"
import type TridataSyncModuleService from "../../../../modules/tridata-sync/service"
import type { AdminTridataOrdersQueryType } from "../validators"

/** TridataOrderMap rows joined with the Medusa order's display_id/created_at/email/total. */
export async function GET(
  req: MedusaRequest<unknown, AdminTridataOrdersQueryType>,
  res: MedusaResponse
) {
  const { limit, offset, upload_status } =
    req.validatedQuery as AdminTridataOrdersQueryType
  const service = req.scope.resolve<TridataSyncModuleService>(TRIDATA_SYNC_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const [maps, count] = await service.listAndCountTridataOrderMaps(
    upload_status ? { upload_status } : {},
    { take: limit, skip: offset, order: { created_at: "DESC" } }
  )
  const orderIds = maps.map((m) => m.order_id)
  const { data: orders } = orderIds.length
    ? await query.graph({
        entity: "order",
        fields: [
          "id",
          "display_id",
          "created_at",
          "email",
          "total",
          "currency_code",
          "status",
        ],
        filters: { id: orderIds },
      })
    : { data: [] as Record<string, unknown>[] }
  const byId = new Map(
    (orders as { id: string }[]).map((o) => [o.id, o] as const)
  )
  res.json({
    orders: maps.map((m) => ({ ...m, order: byId.get(m.order_id) ?? null })),
    count,
    limit,
    offset,
  })
}
