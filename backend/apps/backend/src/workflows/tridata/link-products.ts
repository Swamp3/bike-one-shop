import { batchInventoryItemLevelsWorkflow } from "@medusajs/medusa/core-flows"
import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  finalizeTridataLinkStep,
  linkTridataProductsStep,
} from "./steps/link-products"

/**
 * DownloadArtikelAll + DownloadGrFaKombi -> match on SKU -> upsert
 * TridataProductMap. Variants that lose their link get 0 available stock at
 * TriBike-mapped locations; any link change resets the stock cursors.
 */
export const linkTridataProductsWorkflow = createWorkflow(
  "link-tridata-products",
  () => {
    const linked = linkTridataProductsStep({})
    const zeroInput = transform({ linked }, ({ linked }) => ({
      update: linked.zeroLevels,
    }))
    when(
      "tridata-link-has-stale-levels",
      { linked },
      ({ linked }) => linked.zeroLevels.length > 0
    ).then(() => {
      batchInventoryItemLevelsWorkflow.runAsStep({ input: zeroInput })
    })
    const summary = finalizeTridataLinkStep(linked)
    return new WorkflowResponse(summary)
  }
)

export default linkTridataProductsWorkflow
