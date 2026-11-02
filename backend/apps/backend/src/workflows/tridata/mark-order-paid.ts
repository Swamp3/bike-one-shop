import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { markTridataOrderPaidStep } from "./steps/order-updates"

export const markTridataOrderPaidWorkflow = createWorkflow(
  "mark-tridata-order-paid",
  (input: { order_id: string }) => {
    const result = markTridataOrderPaidStep(input)
    return new WorkflowResponse(result)
  }
)

export default markTridataOrderPaidWorkflow
