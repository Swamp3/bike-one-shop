/**
 * TriCon configuration from the environment. The integration is "configured"
 * only when both an endpoint and an IdentifyGuid are set; everything that
 * calls TriCon checks `isTridataConfigured()` first and skips quietly
 * otherwise. The GUID is a secret: never log it or return it from an API.
 */

export type TridataConfig = {
  endpointUrl?: string
  identifyGuid?: string
  namespace: string
  timeoutMs: number
  /** TriBike Filialname -> Medusa stock_location.name */
  branchMap: Record<string, string>
  /** Added to order.display_id to form WebShopOrderID; differ per environment. */
  orderIdOffset: number
  /** Send customer phone numbers in UploadOrder (data minimisation: off by default). */
  sendPhone: boolean
  syncLogRetentionDays: number
  /** Why a set endpoint/GUID is still refused (production safety), if it is. */
  unsafeReason?: string
}

/** GUID the TriCon mock accepts in dev; never valid against a real TriCon. */
export const MOCK_IDENTIFY_GUID = "00000000-0000-0000-0000-000000000001"

export const DEFAULT_BRANCH_MAP: Record<string, string> = {
  Oldenburg: "BikeOne Oldenburg",
  "Osnabrück": "BikeOne Osnabrück",
}

function resolveEndpointUrl(env: NodeJS.ProcessEnv): string | undefined {
  const explicit = env.TRIDATA_ENDPOINT_URL?.trim()
  if (explicit) {
    return explicit
  }
  const wsdl = env.TRIDATA_WSDL_URL?.trim()
  if (wsdl) {
    return wsdl.replace(/\?wsdl$/i, "")
  }
  return undefined
}

export function parseBranchMap(raw: string | undefined): Record<string, string> {
  if (!raw || !raw.trim()) {
    return { ...DEFAULT_BRANCH_MAP }
  }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const result: Record<string, string> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
          result[key] = value
        }
      }
      return result
    }
  } catch {
    // fall through to default
  }
  return { ...DEFAULT_BRANCH_MAP }
}

function intFromEnv(value: string | undefined, fallback: number, min = 0): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= min ? n : fallback
}

/**
 * In production, refuse the mock GUID and non-https endpoints, unless
 * TRIDATA_ALLOW_INSECURE_ENDPOINT=true (the test server talks to the mock on
 * 127.0.0.1 over http).
 */
export function productionUnsafeReason(
  endpointUrl: string | undefined,
  identifyGuid: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (env.NODE_ENV !== "production" || env.TRIDATA_ALLOW_INSECURE_ENDPOINT === "true") {
    return undefined
  }
  if (identifyGuid && identifyGuid.toLowerCase() === MOCK_IDENTIFY_GUID) {
    return "TRIDATA_IDENTIFY_GUID is the mock default GUID"
  }
  if (endpointUrl && !/^https:\/\//i.test(endpointUrl)) {
    return "TRIDATA_ENDPOINT_URL is not https"
  }
  return undefined
}

export function getTridataConfig(
  env: NodeJS.ProcessEnv = process.env
): TridataConfig {
  const timeout = Number(env.TRIDATA_TIMEOUT_MS)
  const endpointUrl = resolveEndpointUrl(env)
  const identifyGuid = env.TRIDATA_IDENTIFY_GUID?.trim() || undefined
  return {
    endpointUrl,
    identifyGuid,
    namespace: env.TRIDATA_SOAP_NAMESPACE?.trim() || "http://tempuri.org/",
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 15000,
    branchMap: parseBranchMap(env.TRIDATA_BRANCH_MAP),
    orderIdOffset: intFromEnv(env.TRIDATA_ORDER_ID_OFFSET, 0),
    sendPhone: env.TRIDATA_SEND_PHONE === "true",
    syncLogRetentionDays: intFromEnv(env.TRIDATA_SYNC_LOG_RETENTION_DAYS, 30, 1),
    unsafeReason: productionUnsafeReason(endpointUrl, identifyGuid, env),
  }
}

/** Endpoint + GUID set, and not refused by the production safety check. */
export function isTridataConfigured(
  config: Pick<TridataConfig, "endpointUrl" | "identifyGuid" | "unsafeReason"> = getTridataConfig()
): boolean {
  return Boolean(config.endpointUrl && config.identifyGuid && !config.unsafeReason)
}
/** Host (and port) of the endpoint only — safe to show in the admin UI. */
export function tridataEndpointHost(config = getTridataConfig()): string | null {
  if (!config.endpointUrl) {
    return null
  }
  try {
    return new URL(config.endpointUrl).host
  } catch {
    return null
  }
}

/** Medusa stock location name -> TriBike Filialname. */
export function reverseBranchMap(
  branchMap: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(branchMap).map(([filiale, location]) => [location, filiale])
  )
}
