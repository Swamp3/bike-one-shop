import type { MedusaContainer } from "@medusajs/framework/types"
import { isSumupConfigured, reconcileSumupSessions } from "../lib/sumup-reconcile"

/** Completes carts whose paid SumUp checkout never reached us by webhook. No-op without SumUp credentials. */
export default async function sumupReconcileSessionsJob(container: MedusaContainer) {
  if (!isSumupConfigured()) {
    return
  }
  await reconcileSumupSessions(container)
}

export const config = {
  name: "sumup-reconcile-sessions",
  schedule: process.env.SUMUP_RECONCILE_CRON || "*/10 * * * *",
}
