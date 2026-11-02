import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadOrderToTridataWorkflow } from "../../../../../workflows/tridata"
import { requireConfigured } from "../../helpers"

/** Manual retry of one order's UploadOrder (by Medusa order id); idempotent. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!requireConfigured(res)) {
    return
  }
  const { result } = await uploadOrderToTridataWorkflow(req.scope).run({
    input: { order_id: req.params.id, force: true },
  })
  res.json({ result })
}
