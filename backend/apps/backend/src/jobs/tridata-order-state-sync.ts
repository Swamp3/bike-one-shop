import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runExclusive } from "../lib/tridata/run-guard"
import { ensureTridataConfigured } from "../workflows/tridata/helpers/tracked-call"
import { syncTridataOrderStatesWorkflow } from "../workflows/tridata"

/** Polls DownloadOrderStateByOrder for uploaded, non-final orders. */
export default async function tridataOrderStateSyncJob(container: MedusaContainer) {
  if (!ensureTridataConfigured(container)) {
    return
  }
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await runExclusive("sync-order-states", () =>
      syncTridataOrderStatesWorkflow(container).run({ input: {} })
    )
  } catch (e) {
    logger.error(`[tridata] order-state sync failed: ${(e as Error).message}`)
  }
}

export const config = {
  name: "tridata-order-state-sync",
  schedule: process.env.TRIDATA_ORDER_STATE_SYNC_CRON || "*/5 * * * *",
}
