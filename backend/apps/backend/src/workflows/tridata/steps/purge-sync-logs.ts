import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getTridataConfig } from "../../../lib/tridata/config"
import { getTridataSyncService } from "../helpers/tracked-call"

const BATCH = 1000

/** Hard-deletes TridataSyncLog rows older than TRIDATA_SYNC_LOG_RETENTION_DAYS (default 30). */
export const purgeTridataSyncLogsStep = createStep(
  "purge-tridata-sync-logs",
  async (_input: Record<string, never>, { container }) => {
    const service = getTridataSyncService(container)
    const days = getTridataConfig().syncLogRetentionDays
    const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    let deleted = 0
    for (;;) {
      const rows = await service.listTridataSyncLogs(
        { created_at: { $lt: before } },
        { take: BATCH, select: ["id"] }
      )
      if (!rows.length) {
        break
      }
      await service.deleteTridataSyncLogs(rows.map((r) => r.id))
      deleted += rows.length
      if (rows.length < BATCH) {
        break
      }
    }
    return new StepResponse({ deleted, retentionDays: days, before: before.toISOString() })
  }
)
