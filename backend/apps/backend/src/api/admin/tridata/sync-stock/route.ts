import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runExclusive } from "../../../../lib/tridata/run-guard"
import { syncTridataStockWorkflow } from "../../../../workflows/tridata"
import { alreadyRunning, requireConfigured } from "../helpers"
import type { AdminTridataSyncStockBodyType } from "../validators"

export async function POST(
  req: MedusaRequest<AdminTridataSyncStockBodyType>,
  res: MedusaResponse
) {
  if (!requireConfigured(res)) {
    return
  }
  const { force } = req.validatedBody
  const run = await runExclusive("sync-stock", () =>
    syncTridataStockWorkflow(req.scope).run({ input: { force } })
  )
  if (run.skipped) {
    return alreadyRunning(res)
  }
  res.json({ result: run.result.result })
}
