import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runExclusive } from "../lib/tridata/run-guard"
import { purgeTridataSyncLogsWorkflow } from "../workflows/tridata"

/**
 * Daily retention for tridata_sync_log (TRIDATA_SYNC_LOG_RETENTION_DAYS,
 * default 30). Runs whether or not TriCon is configured, so old rows never
 * outlive the window.
 */
export default async function tridataSyncLogRetentionJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const run = await runExclusive("purge-sync-logs", () =>
      purgeTridataSyncLogsWorkflow(container).run({ input: {} })
    )
    if (!run.skipped && run.result.result.deleted) {
      logger.info(
        `[tridata] sync-log retention: deleted ${run.result.result.deleted} rows older than ${run.result.result.retentionDays} days`
      )
    }
  } catch (e) {
    logger.error(`[tridata] sync-log retention failed: ${(e as Error).message}`)
  }
}

export const config = {
  name: "tridata-sync-log-retention",
  schedule: "30 3 * * *",
}
