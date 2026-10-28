import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { IStoreModuleService } from "@medusajs/framework/types"

const METADATA_PREFIX = "payment_label_"

/**
 * Lets Admin's generic Store metadata editor (Settings → Store) override a
 * payment method's storefront display title without a deploy — set
 * `payment_label_<provider_id>` (e.g. `payment_label_pp_sumup_sumup`) there.
 * Only keys under that prefix are ever returned; nothing else in Store
 * metadata is exposed publicly.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeModuleService: IStoreModuleService = req.scope.resolve(
    Modules.STORE
  )
  const [store] = await storeModuleService.listStores({}, { take: 1 })
  const metadata = (store?.metadata ?? {}) as Record<string, unknown>

  const labels: Record<string, string> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (
      key.startsWith(METADATA_PREFIX) &&
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      labels[key.slice(METADATA_PREFIX.length)] = value.trim()
    }
  }

  res.json({ labels })
}
