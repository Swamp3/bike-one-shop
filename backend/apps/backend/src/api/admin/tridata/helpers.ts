import type { MedusaResponse } from "@medusajs/framework/http"
import { getTridataConfig, isTridataConfigured } from "../../../lib/tridata/config"

/** Responds 409 and returns false when TriCon credentials are not set. */
export function requireConfigured(res: MedusaResponse): boolean {
  const config = getTridataConfig()
  if (isTridataConfigured(config)) {
    return true
  }
  res.status(409).json({
    type: "not_allowed",
    message: config.unsafeReason
      ? `TriCon configuration refused in production: ${config.unsafeReason}`
      : "TriCon is not configured (set TRIDATA_ENDPOINT_URL and TRIDATA_IDENTIFY_GUID)",
  })
  return false
}

export function alreadyRunning(res: MedusaResponse) {
  res.status(409).json({ type: "conflict", message: "This sync is already running" })
}
