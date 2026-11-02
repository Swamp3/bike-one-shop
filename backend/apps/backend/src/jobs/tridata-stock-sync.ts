import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runExclusive } from "../lib/tridata/run-guard"
import { ensureTridataConfigured, getCursor } from "../workflows/tridata/helpers/tracked-call"
import { syncTridataStockWorkflow } from "../workflows/tridata"
import {
  isNightlyFullSyncDue,
  STOCK_FULL_STREAM,
} from "../workflows/tridata/steps/sync-stock"

/**
 * TriCon stock sync. TRIDATA_STOCK_SYNC_CRON, default every minute (prod:
 * every 10 min). Normally a delta run; the first run after 03:00 (server
 * local time) each day is a forced full run, which re-applies rows that a
 * delta could have skipped (missing link/branch/inventory item at the time).
 */
export default async function tridataStockSyncJob(container: MedusaContainer) {
  if (!ensureTridataConfigured(container)) {
    return
  }
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const lastFull = await getCursor(container, STOCK_FULL_STREAM)
    const force = isNightlyFullSyncDue(lastFull?.last_success_at)
    const run = await runExclusive("sync-stock", () =>
      syncTridataStockWorkflow(container).run({ input: { force } })
    )
    if (run.skipped) {
      logger.info("[tridata] stock sync still running, skipping this tick")
    }
  } catch (e) {
    logger.error(`[tridata] stock sync failed: ${(e as Error).message}`)
  }
}

export const config = {
  name: "tridata-stock-sync",
  schedule: process.env.TRIDATA_STOCK_SYNC_CRON || "* * * * *",
}
