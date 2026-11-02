import type { MedusaContainer } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getTridataConfig } from "../../../lib/tridata/config"
import { runExclusive } from "../../../lib/tridata/run-guard"
import { getTridataSyncService, scrubError } from "../helpers/tracked-call"
import { markOrderPaid } from "./order-updates"
import { loadOrderForUpload, uploadOrderToTridata } from "./upload-order"

export type ResolveConflictAction = "mark_sent" | "reupload_with_new_id"

export type ResolveConflictInput = {
  order_id: string
  action: ResolveConflictAction
  admin_user_id: string | null
}

export type ResolveConflictOutput = {
  order_id: string
  action: ResolveConflictAction
  status: "resolved" | "not_conflict" | "not_found" | "failed"
  web_shop_order_id?: number
  previous_web_shop_order_id?: number
  upload_status?: string
  error?: string
}

/**
 * Re-issued WebShopOrderIDs live in their own band above the normal
 * display_id + offset range: display_id + offset + bump * REISSUE_STEP.
 * With display ids below REISSUE_STEP they cannot collide with any normal
 * id of this environment; collisions with existing maps are checked too.
 */
export const REISSUE_STEP = 100_000_000
const INT32_MAX = 2_147_483_647

export function reissuedWebShopOrderId(
  displayId: number,
  offset: number,
  bump: number
): number {
  return displayId + offset + bump * REISSUE_STEP
}

async function resolveConflict(
  container: MedusaContainer,
  input: ResolveConflictInput
): Promise<ResolveConflictOutput> {
  const base = { order_id: input.order_id, action: input.action }
  const service = getTridataSyncService(container)
  const [map] = await service.listTridataOrderMaps({ order_id: input.order_id })
  if (!map) {
    return { ...base, status: "not_found", error: "order has no TriCon sync record" }
  }
  if (map.upload_status !== "conflict") {
    return {
      ...base,
      status: "not_conflict",
      upload_status: map.upload_status,
      error: `order is not in conflict (status ${map.upload_status})`,
    }
  }
  const previous = map.web_shop_order_id
  const log = (summary: Record<string, unknown>, status: "success" | "failed", error?: string) =>
    service.createTridataSyncLogs({
      direction: "outbound",
      function_name: "resolve-conflict",
      entity_type: "order",
      entity_id: input.order_id,
      status,
      error: error ? scrubError(error) : null,
      summary: {
        action: input.action,
        admin_user_id: input.admin_user_id,
        previous_web_shop_order_id: previous,
        ...summary,
      },
    })

  if (input.action === "mark_sent") {
    // Admin confirmed in TriBike that the existing record is this order.
    await service.updateTridataOrderMaps({
      id: map.id,
      upload_status: "sent",
      sent_at: new Date(),
      next_attempt_at: null,
      last_error: null,
      // Unknown whether the existing record carries the paid flag: re-send it if paid.
      bezahlt_sent: false,
      tribike_state: map.tribike_state ?? "Neu",
      state_checked_at: new Date(),
    })
    await log({ web_shop_order_id: previous }, "success")
    const paid = await markOrderPaid(container, input.order_id)
    return {
      ...base,
      status: "resolved",
      web_shop_order_id: previous,
      upload_status: "sent",
      error: paid.status === "failed" ? `paid flag not sent: ${paid.reason}` : undefined,
    }
  }

  const order = await loadOrderForUpload(container, input.order_id)
  if (!order) {
    return { ...base, status: "not_found", error: "order not found" }
  }
  const offset = getTridataConfig().orderIdOffset
  let bump = map.id_bump
  let candidate = 0
  for (let tries = 0; tries < 20; tries++) {
    bump++
    candidate = reissuedWebShopOrderId(order.display_id, offset, bump)
    const [taken] = await service.listTridataOrderMaps({ web_shop_order_id: candidate })
    if (!taken) {
      break
    }
    candidate = 0
  }
  if (!candidate || candidate > INT32_MAX) {
    const error = "could not find a free WebShopOrderID"
    await log({ id_bump: bump }, "failed", error)
    return { ...base, status: "failed", error }
  }
  await service.updateTridataOrderMaps({
    id: map.id,
    web_shop_order_id: candidate,
    id_bump: bump,
    upload_status: "pending",
    attempts: 0,
    next_attempt_at: null,
    last_error: null,
  })
  const upload = await uploadOrderToTridata(container, { order_id: input.order_id, force: true })
  await log(
    { web_shop_order_id: candidate, id_bump: bump, upload_status: upload.status },
    upload.status === "sent" ? "success" : "failed",
    upload.error
  )
  return {
    ...base,
    status: upload.status === "sent" ? "resolved" : "failed",
    web_shop_order_id: candidate,
    previous_web_shop_order_id: previous,
    upload_status: upload.status,
    error: upload.error,
  }
}

/**
 * Admin conflict resolution. Has its own lock key, not the upload one, because
 * the re-upload path takes the upload lock itself. Conflict orders are never
 * retried automatically and the admin page hides Retry for them.
 */
export const resolveTridataOrderConflictStep = createStep(
  "resolve-tridata-order-conflict",
  async (input: ResolveConflictInput, { container }) => {
    const run = await runExclusive(`resolve-order:${input.order_id}`, () =>
      resolveConflict(container, input)
    )
    const output: ResolveConflictOutput = run.skipped
      ? { order_id: input.order_id, action: input.action, status: "failed", error: "already being resolved" }
      : run.result
    return new StepResponse(output)
  }
)
