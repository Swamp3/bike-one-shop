import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRIDATA_SYNC_MODULE } from "../../../../modules/tridata-sync"
import type TridataSyncModuleService from "../../../../modules/tridata-sync/service"
import type { AdminTridataSyncLogsQueryType } from "../validators"

export async function GET(
  req: MedusaRequest<unknown, AdminTridataSyncLogsQueryType>,
  res: MedusaResponse
) {
  const { limit, offset, ...filters } =
    req.validatedQuery as AdminTridataSyncLogsQueryType
  const service = req.scope.resolve<TridataSyncModuleService>(TRIDATA_SYNC_MODULE)
  const where = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")
  )
  const [logs, count] = await service.listAndCountTridataSyncLogs(where, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" },
  })
  res.json({ sync_logs: logs, count, limit, offset })
}
