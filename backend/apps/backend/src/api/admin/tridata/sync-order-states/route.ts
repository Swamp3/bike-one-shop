import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runExclusive } from "../../../../lib/tridata/run-guard"
import { syncTridataOrderStatesWorkflow } from "../../../../workflows/tridata"
import { alreadyRunning, requireConfigured } from "../helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!requireConfigured(res)) {
    return
  }
  const run = await runExclusive("sync-order-states", () =>
    syncTridataOrderStatesWorkflow(req.scope).run({ input: {} })
  )
  if (run.skipped) {
    return alreadyRunning(res)
  }
  res.json({ result: run.result.result })
}
