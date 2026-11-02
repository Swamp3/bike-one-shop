import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { cancelTridataOrderStep } from "./steps/order-updates"

export const cancelTridataOrderWorkflow = createWorkflow(
  "cancel-tridata-order",
  (input: { order_id: string }) => {
    const result = cancelTridataOrderStep(input)
    return new WorkflowResponse(result)
  }
)

export default cancelTridataOrderWorkflow
