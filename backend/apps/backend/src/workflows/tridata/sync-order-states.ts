import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { applyTribikeOrderStatesStep } from "./steps/apply-tribike-states"
import { syncTridataOrderStatesStep } from "./steps/order-updates"

/**
 * DownloadOrderStateByOrder for open orders, then apply changed (or never
 * applied) TriBike states to the Medusa orders: Geliefert -> fulfilment +
 * delivered; Teilgeliefert/Abgelehnt/StorniertTriData -> admin attention flag.
 */
export const syncTridataOrderStatesWorkflow = createWorkflow(
  "sync-tridata-order-states",
  () => {
    const states = syncTridataOrderStatesStep({})
    const applied = applyTribikeOrderStatesStep({})
    return new WorkflowResponse({ states, applied })
  }
)

export default syncTridataOrderStatesWorkflow
