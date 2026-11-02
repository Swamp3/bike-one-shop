import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { retryTridataOrderUploadsStep } from "./steps/order-updates"

export const retryTridataOrderUploadsWorkflow = createWorkflow(
  "retry-tridata-order-uploads",
  () => {
    const result = retryTridataOrderUploadsStep({})
    return new WorkflowResponse(result)
  }
)

export default retryTridataOrderUploadsWorkflow
