import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { purgeTridataSyncLogsStep } from "./steps/purge-sync-logs"

export const purgeTridataSyncLogsWorkflow = createWorkflow(
  "purge-tridata-sync-logs",
  () => {
    const result = purgeTridataSyncLogsStep({})
    return new WorkflowResponse(result)
  }
)

export default purgeTridataSyncLogsWorkflow
