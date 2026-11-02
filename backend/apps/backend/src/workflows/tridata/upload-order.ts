import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { UploadOrderInput, uploadOrderToTridataStep } from "./steps/upload-order"

/** Idempotent UploadOrder for one Medusa order; failures are recorded, never thrown. */
export const uploadOrderToTridataWorkflow = createWorkflow(
  "upload-order-to-tridata",
  (input: UploadOrderInput) => {
    const result = uploadOrderToTridataStep(input)
    return new WorkflowResponse(result)
  }
)

export default uploadOrderToTridataWorkflow
