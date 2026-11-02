import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runExclusive } from "../lib/tridata/run-guard"
import { ensureTridataConfigured } from "../workflows/tridata/helpers/tracked-call"
import { retryTridataOrderUploadsWorkflow } from "../workflows/tridata"

/** Retries failed UploadOrder calls whose backoff elapsed (max 48 attempts, about 2 days). */
export default async function tridataRetryOrderUploadsJob(container: MedusaContainer) {
  if (!ensureTridataConfigured(container)) {
    return
  }
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await runExclusive("retry-order-uploads", () =>
      retryTridataOrderUploadsWorkflow(container).run({ input: {} })
    )
  } catch (e) {
    logger.error(`[tridata] order upload retry failed: ${(e as Error).message}`)
  }
}

export const config = {
  name: "tridata-retry-order-uploads",
  schedule: process.env.TRIDATA_ORDER_RETRY_CRON || "*/2 * * * *",
}
