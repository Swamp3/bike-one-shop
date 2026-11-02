import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TridataClient } from "../../../lib/tridata/client"
import { getTridataConfig, isTridataConfigured } from "../../../lib/tridata/config"
import { TridataError } from "../../../lib/tridata/soap"
import type { TridataCallResult } from "../../../lib/tridata/types"
import { scrubError } from "../../../lib/scrub"
import { TRIDATA_SYNC_MODULE } from "../../../modules/tridata-sync"
import type TridataSyncModuleService from "../../../modules/tridata-sync/service"

export { scrubError }

export type SyncDirection = "inbound" | "outbound"

export type TrackedCallContext = {
  functionName: string
  direction: SyncDirection
  entityType?: string
  entityId?: string
  /** Extra non-PII summary stored with the log row. */
  summary?: Record<string, unknown>
}

export type TrackedResult<T> =
  | { ok: true; data: T; correlationId: string; durationMs: number }
  | {
      ok: false
      error: TridataError
      correlationId: string | null
      durationMs: number
    }

export function getTridataSyncService(
  container: MedusaContainer
): TridataSyncModuleService {
  return container.resolve<TridataSyncModuleService>(TRIDATA_SYNC_MODULE)
}

export function getTridataClient(container: MedusaContainer): TridataClient {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  return new TridataClient(logger)
}

let notConfiguredLogged = false
let unsafeLogged = false

/**
 * True when TriCon credentials are set and allowed. Otherwise logs once per
 * process (so jobs running every minute do not spam the log) and returns
 * false: info when simply unset, error when refused in production.
 */
export function ensureTridataConfigured(container: MedusaContainer): boolean {
  const config = getTridataConfig()
  if (isTridataConfigured(config)) {
    return true
  }
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  if (config.unsafeReason && config.endpointUrl && config.identifyGuid) {
    if (!unsafeLogged) {
      unsafeLogged = true
      logger.error(
        `[tridata] refusing TriCon configuration in production: ${config.unsafeReason} ` +
          "(TRIDATA_ALLOW_INSECURE_ENDPOINT=true is only meant for the mock test server); sync is disabled"
      )
    }
    return false
  }
  if (!notConfiguredLogged) {
    notConfiguredLogged = true
    logger.info(
      "[tridata] not configured (TRIDATA_ENDPOINT_URL/TRIDATA_IDENTIFY_GUID unset), TriCon sync is skipped"
    )
  }
  return false
}

/**
 * Runs one TriCon call and appends a TridataSyncLog row for it (success or
 * failure). Never throws for TriCon errors; the caller decides what to do.
 */
export async function trackedCall<T>(
  container: MedusaContainer,
  ctx: TrackedCallContext,
  call: () => Promise<TridataCallResult<T>>,
  summarize?: (data: T) => Record<string, unknown>
): Promise<TrackedResult<T>> {
  const service = getTridataSyncService(container)
  const startedAt = Date.now()
  try {
    const result = await call()
    await service.createTridataSyncLogs({
      direction: ctx.direction,
      function_name: ctx.functionName,
      entity_type: ctx.entityType ?? null,
      entity_id: ctx.entityId ?? null,
      correlation_id: result.correlationId,
      status: "success",
      duration_ms: result.durationMs,
      summary: { ...(ctx.summary ?? {}), ...(summarize?.(result.data) ?? {}) },
    })
    return { ok: true, ...result }
  } catch (e) {
    const error =
      e instanceof TridataError
        ? e
        : new TridataError(e instanceof Error ? e.message : String(e))
    const durationMs = error.durationMs ?? Date.now() - startedAt
    await service.createTridataSyncLogs({
      direction: ctx.direction,
      function_name: ctx.functionName,
      entity_type: ctx.entityType ?? null,
      entity_id: ctx.entityId ?? null,
      correlation_id: error.correlationId ?? null,
      status: "failed",
      duration_ms: durationMs,
      error: scrubError(`${error.name}: ${error.message}`),
      summary: ctx.summary ?? null,
    })
    return {
      ok: false,
      error,
      correlationId: error.correlationId ?? null,
      durationMs,
    }
  }
}

/** Run-level summary row (not a TriCon call itself), e.g. the result of a link-products run. */
export async function writeRunSummary(
  container: MedusaContainer,
  params: {
    functionName: string
    direction: SyncDirection
    status: "success" | "failed" | "skipped"
    durationMs: number
    summary: Record<string, unknown>
    error?: string
  }
) {
  await getTridataSyncService(container).createTridataSyncLogs({
    direction: params.direction,
    function_name: params.functionName,
    status: params.status,
    duration_ms: params.durationMs,
    summary: params.summary,
    error: params.error ? scrubError(params.error) : null,
  })
}

/** Upserts the run-state row for a stream (catalog, stock_branch, ...). */
export async function updateCursor(
  container: MedusaContainer,
  stream: string,
  data: {
    last_change?: string | null
    last_run_at?: Date
    last_success_at?: Date
    last_error?: string | null
  }
) {
  const service = getTridataSyncService(container)
  const [existing] = await service.listTridataSyncCursors({ stream })
  if (existing) {
    await service.updateTridataSyncCursors({ id: existing.id, ...data })
  } else {
    await service.createTridataSyncCursors({ stream, ...data })
  }
}

export async function getCursor(container: MedusaContainer, stream: string) {
  const [existing] = await getTridataSyncService(container).listTridataSyncCursors(
    { stream }
  )
  return existing ?? null
}
