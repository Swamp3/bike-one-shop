import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  getTridataConfig,
  isTridataConfigured,
  tridataEndpointHost,
} from "../../../../lib/tridata/config"
import { TRIDATA_SYNC_MODULE } from "../../../../modules/tridata-sync"
import type TridataSyncModuleService from "../../../../modules/tridata-sync/service"

/** Connection target (host only, never the GUID), per-stream run state, counts. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<TridataSyncModuleService>(TRIDATA_SYNC_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const config = getTridataConfig()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [cursors, [, errorCount24h], [, mappedVariants], [lastLink]] =
    await Promise.all([
      service.listTridataSyncCursors({}),
      service.listAndCountTridataSyncLogs(
        { status: "failed", created_at: { $gte: since } },
        { take: 1 }
      ),
      service.listAndCountTridataProductMaps({}, { take: 1 }),
      service.listTridataSyncLogs(
        { function_name: "link-products", status: "success" },
        { take: 1, order: { created_at: "DESC" } }
      ),
    ])
  const { metadata } = await query.graph({
    entity: "product_variant",
    fields: ["id"],
    pagination: { take: 1, skip: 0 },
  })

  const orderCounts: Record<string, number> = {}
  for (const status of ["pending", "sent", "failed", "skipped", "conflict"] as const) {
    const [, count] = await service.listAndCountTridataOrderMaps(
      { upload_status: status },
      { take: 1 }
    )
    orderCounts[status] = count
  }

  const attention: Record<string, number> = {}
  for (const kind of ["partially_delivered", "rejected", "canceled_in_tribike", "review"]) {
    const [, count] = await service.listAndCountTridataOrderMaps(
      { attention: kind },
      { take: 1 }
    )
    attention[kind] = count
  }
  const [, applyErrors] = await service.listAndCountTridataOrderMaps(
    { medusa_apply_pending: true, medusa_apply_error: { $ne: null } },
    { take: 1 }
  )

  const summary = (lastLink?.summary ?? {}) as Record<string, unknown>
  res.json({
    configured: isTridataConfigured(config),
    refused_reason: config.endpointUrl && config.identifyGuid ? config.unsafeReason ?? null : null,
    endpoint_host: tridataEndpointHost(config),
    branch_map: config.branchMap,
    streams: cursors.map((c) => ({
      stream: c.stream,
      last_change: c.last_change,
      last_run_at: c.last_run_at,
      last_success_at: c.last_success_at,
      last_error: c.last_error,
    })),
    error_count_24h: errorCount24h,
    mapped_variants: mappedVariants,
    shop_variants: metadata?.count ?? null,
    unmatched_tridata: summary.unmatchedTridataCount ?? null,
    unmatched_shop: summary.unmatchedShopCount ?? null,
    unmatched_shop_skus: Array.isArray(summary.unmatchedShop) ? summary.unmatchedShop : [],
    unmatched_tridata_keys: Array.isArray(summary.unmatchedTridata) ? summary.unmatchedTridata : [],
    conflicts: Array.isArray(summary.conflicts) ? summary.conflicts : [],
    last_link_at: lastLink?.created_at ?? null,
    orders: orderCounts,
    attention,
    apply_errors: applyErrors,
  })
}
