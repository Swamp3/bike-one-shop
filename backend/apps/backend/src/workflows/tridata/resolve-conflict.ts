import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  ResolveConflictInput,
  resolveTridataOrderConflictStep,
} from "./steps/resolve-conflict"

/** mark_sent (TriBike record is this order) or reupload_with_new_id. */
export const resolveTridataOrderConflictWorkflow = createWorkflow(
  "resolve-tridata-order-conflict",
  (input: ResolveConflictInput) => {
    const result = resolveTridataOrderConflictStep(input)
    return new WorkflowResponse(result)
  }
)

export default resolveTridataOrderConflictWorkflow
