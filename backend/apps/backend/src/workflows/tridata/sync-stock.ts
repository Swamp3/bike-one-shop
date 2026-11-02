import { batchInventoryItemLevelsWorkflow } from "@medusajs/medusa/core-flows"
import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { fetchTridataStockStep, persistTridataStockStep } from "./steps/sync-stock"

export type SyncTridataStockInput = {
  /** Ignore the LastChange cursors and download the full stock lists. */
  force?: boolean
}

/**
 * DownloadStockBranch(Delta) + DownloadStockColorSizeBranch(Delta) ->
 * InventoryLevel (via Medusa's batch inventory-levels workflow) + snapshot
 * rows; cursors only advance after the level writes succeeded.
 */
export const syncTridataStockWorkflow = createWorkflow(
  "sync-tridata-stock",
  (input: SyncTridataStockInput) => {
    const fetched = fetchTridataStockStep(input)
    const levelInput = transform({ fetched }, ({ fetched }) => ({
      create: fetched.levelCreates,
      update: fetched.levelUpdates,
    }))
    when(
      "tridata-stock-has-level-changes",
      { fetched },
      ({ fetched }) => fetched.levelCreates.length + fetched.levelUpdates.length > 0
    ).then(() => {
      batchInventoryItemLevelsWorkflow.runAsStep({ input: levelInput })
    })
    const result = persistTridataStockStep(fetched)
    return new WorkflowResponse(result)
  }
)

export default syncTridataStockWorkflow
