import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runExclusive } from "../../../../lib/tridata/run-guard"
import { linkTridataProductsWorkflow } from "../../../../workflows/tridata"
import { alreadyRunning, requireConfigured } from "../helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!requireConfigured(res)) {
    return
  }
  const run = await runExclusive("link-products", () =>
    linkTridataProductsWorkflow(req.scope).run({ input: {} })
  )
  if (run.skipped) {
    return alreadyRunning(res)
  }
  res.json({ result: run.result.result })
}
