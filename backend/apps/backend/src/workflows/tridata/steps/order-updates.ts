import type { MedusaContainer } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getTridataConfig } from "../../../lib/tridata/config"
import { TRIDATA_FINAL_ORDER_STATES } from "../../../lib/tridata/types"
import { MAX_UPLOAD_ATTEMPTS } from "../helpers/backoff"
import { resolvePaid } from "../helpers/build-upload-order"
import {
  ensureTridataConfigured,
  getTridataClient,
  getTridataSyncService,
  scrubError,
  trackedCall,
  updateCursor,
  writeRunSummary,
} from "../helpers/tracked-call"
import { loadOrderForUpload, uploadOrderToTridata } from "./upload-order"

type SimpleResult = {
  order_id: string
  status: "sent" | "skipped" | "failed" | "not_configured"
  reason?: string
}

export async function markOrderPaid(
  container: MedusaContainer,
  orderId: string
): Promise<SimpleResult> {
  const out = (r: Omit<SimpleResult, "order_id">): SimpleResult => ({ order_id: orderId, ...r })
  if (!ensureTridataConfigured(container)) {
    return out({ status: "not_configured" })
  }
  try {
    const service = getTridataSyncService(container)
    const [map] = await service.listTridataOrderMaps({ order_id: orderId })
    if (!map || map.upload_status !== "sent") {
      // Not uploaded yet: the paid flag goes along with the (re)upload.
      return out({ status: "skipped", reason: "not uploaded yet" })
    }
    if (map.bezahlt_sent) {
      return out({ status: "skipped", reason: "paid flag already sent" })
    }
    const order = await loadOrderForUpload(container, orderId)
    const { paid, paidAt } = order ? resolvePaid(order) : { paid: false, paidAt: null }
    if (!paid) {
      return out({ status: "skipped", reason: "order not paid" })
    }
    const res = await trackedCall(
      container,
      {
        functionName: "UploadOrderChangeBezahlt",
        direction: "outbound",
        entityType: "order",
        entityId: orderId,
        summary: { webShopOrderId: map.web_shop_order_id },
      },
      () =>
        getTridataClient(container).uploadOrderChangeBezahlt({
          webShopOrderId: map.web_shop_order_id,
          bezahlt: true,
          ausgeglichenAm: paidAt ?? new Date(),
        })
    )
    await service.updateTridataOrderMaps({
      id: map.id,
      last_correlation_id: res.correlationId,
      ...(res.ok
        ? { bezahlt_sent: true, paid_sent_at: new Date() }
        : { last_error: scrubError(`UploadOrderChangeBezahlt: ${res.error.message}`) }),
    })
    return out(res.ok ? { status: "sent" } : { status: "failed", reason: res.error.message })
  } catch (e) {
    return out({ status: "failed", reason: scrubError((e as Error).message) })
  }
}

export async function cancelOrder(
  container: MedusaContainer,
  orderId: string
): Promise<SimpleResult> {
  const out = (r: Omit<SimpleResult, "order_id">): SimpleResult => ({ order_id: orderId, ...r })
  if (!ensureTridataConfigured(container)) {
    return out({ status: "not_configured" })
  }
  try {
    const service = getTridataSyncService(container)
    const [map] = await service.listTridataOrderMaps({ order_id: orderId })
    if (!map) {
      return out({ status: "skipped", reason: "never uploaded" })
    }
    if (map.upload_status !== "sent") {
      await service.updateTridataOrderMaps({
        id: map.id,
        upload_status: "skipped",
        next_attempt_at: null,
        last_error: "order canceled before upload",
      })
      return out({ status: "skipped", reason: "canceled before upload" })
    }
    if (map.storno_sent_at) {
      return out({ status: "skipped", reason: "storno already sent" })
    }
    const res = await trackedCall(
      container,
      {
        functionName: "UploadOrderChangeStorno",
        direction: "outbound",
        entityType: "order",
        entityId: orderId,
        summary: { webShopOrderId: map.web_shop_order_id },
      },
      () => getTridataClient(container).uploadOrderChangeStorno(map.web_shop_order_id)
    )
    await service.updateTridataOrderMaps({
      id: map.id,
      last_correlation_id: res.correlationId,
      ...(res.ok
        ? { storno_sent_at: new Date() }
        : { last_error: scrubError(`UploadOrderChangeStorno: ${res.error.message}`) }),
    })
    return out(res.ok ? { status: "sent" } : { status: "failed", reason: res.error.message })
  } catch (e) {
    return out({ status: "failed", reason: scrubError((e as Error).message) })
  }
}

/** UploadOrderChangeBezahlt, only for orders already uploaded without the paid flag. */
export const markTridataOrderPaidStep = createStep(
  "mark-tridata-order-paid",
  async (input: { order_id: string }, { container }) => {
    return new StepResponse(await markOrderPaid(container, input.order_id))
  }
)

/** UploadOrderChangeStorno for uploaded orders; marks never-uploaded ones as skipped. */
export const cancelTridataOrderStep = createStep(
  "cancel-tridata-order",
  async (input: { order_id: string }, { container }) => {
    return new StepResponse(await cancelOrder(container, input.order_id))
  }
)

const STATE_BATCH = 100

/**
 * Re-sends a storno or paid flag this open order still needs: the event
 * handlers run only once, so a failed call or an event that fired during the
 * upload would otherwise never reach TriCon. Both calls are safe to repeat.
 */
async function reconcileOrder(
  container: MedusaContainer,
  orderId: string,
  tribikeState: string | null
): Promise<SimpleResult> {
  try {
    const order = await loadOrderForUpload(container, orderId)
    if (order?.status !== "canceled") {
      return await markOrderPaid(container, orderId)
    }
    return tribikeState && TRIDATA_FINAL_ORDER_STATES.includes(tribikeState)
      ? { order_id: orderId, status: "skipped", reason: "final in TriBike" }
      : await cancelOrder(container, orderId)
  } catch (e) {
    return { order_id: orderId, status: "failed", reason: scrubError((e as Error).message) }
  }
}

/** DownloadOrderStateByOrder for sent orders not yet in a final TriBike state. */
export async function syncOrderStates(container: MedusaContainer) {
  const summary = {
    status: "skipped" as "skipped" | "success" | "failed",
    checked: 0,
    changed: 0,
    reconciled: 0,
    failed: 0,
  }
  if (!ensureTridataConfigured(container)) {
    return summary
  }
  const startedAt = Date.now()
  const service = getTridataSyncService(container)
  await updateCursor(container, "order_state", { last_run_at: new Date() })
  const open = await service.listTridataOrderMaps(
    {
      upload_status: "sent",
      $or: [
        { tribike_state: null },
        { tribike_state: { $nin: TRIDATA_FINAL_ORDER_STATES } },
      ],
    },
    { take: STATE_BATCH, order: { state_checked_at: "ASC" } }
  )
  const client = getTridataClient(container)
  let lastError: string | null = null
  for (const map of open) {
    summary.checked++
    const res = await trackedCall(
      container,
      {
        functionName: "DownloadOrderStateByOrder",
        direction: "inbound",
        entityType: "order",
        entityId: map.order_id,
        summary: { webShopOrderId: map.web_shop_order_id },
      },
      () => client.downloadOrderStateByOrder(map.web_shop_order_id),
      (data) => ({ orderState: data.OrderState })
    )
    if (!res.ok) {
      summary.failed++
      lastError = res.error.message
      continue
    }
    const state = res.data.OrderState || null
    if (state !== map.tribike_state) {
      summary.changed++
    }
    await service.updateTridataOrderMaps({
      id: map.id,
      tribike_state: state,
      state_checked_at: new Date(),
      last_correlation_id: res.correlationId,
      // Applied to the Medusa order by apply-tribike-order-states.
      ...(state !== map.tribike_state ? { medusa_apply_pending: true } : {}),
    })
    const reconciled = await reconcileOrder(container, map.order_id, state)
    if (reconciled.status === "sent") {
      summary.reconciled++
    } else if (reconciled.status === "failed") {
      summary.failed++
      lastError = reconciled.reason ?? "reconcile failed"
    }
  }
  summary.status = summary.failed ? "failed" : "success"
  await writeRunSummary(container, {
    functionName: "sync-order-states",
    direction: "inbound",
    status: summary.status,
    durationMs: Date.now() - startedAt,
    summary,
    error: lastError ?? undefined,
  })
  await updateCursor(
    container,
    "order_state",
    summary.failed && summary.failed === summary.checked
      ? { last_error: lastError }
      : { last_success_at: new Date(), last_error: lastError }
  )
  return summary
}

export const syncTridataOrderStatesStep = createStep(
  "sync-tridata-order-states",
  async (_input: Record<string, never>, { container }) => {
    return new StepResponse(await syncOrderStates(container))
  }
)

/** Re-attempts failed (and stuck pending) uploads whose backoff has elapsed. */
export const retryTridataOrderUploadsStep = createStep(
  "retry-tridata-order-uploads",
  async (_input: Record<string, never>, { container }) => {
    const summary = { status: "skipped" as "skipped" | "success", due: 0, sent: 0, failed: 0 }
    if (!ensureTridataConfigured(container)) {
      return new StepResponse(summary)
    }
    const service = getTridataSyncService(container)
    const now = new Date()
    // An attempt younger than the client timeout (+30s margin) may still be
    // in flight in another process; picking it would risk a duplicate upload.
    const attemptSettledBefore = new Date(
      now.getTime() - getTridataConfig().timeoutMs - 30_000
    )
    const stuckBefore = new Date(now.getTime() - 2 * 60_000)
    const due = await service.listTridataOrderMaps(
      {
        attempts: { $lt: MAX_UPLOAD_ATTEMPTS },
        $and: [
          {
            $or: [
              { last_attempt_at: null },
              { last_attempt_at: { $lte: attemptSettledBefore } },
            ],
          },
          {
            // "conflict" and "skipped" are never picked up automatically.
            $or: [
              {
                upload_status: "failed",
                $or: [{ next_attempt_at: null }, { next_attempt_at: { $lte: now } }],
              },
              // A pending row older than 2 minutes means the subscriber never finished.
              { upload_status: "pending", created_at: { $lte: stuckBefore } },
            ],
          },
        ],
      },
      { take: 50, order: { next_attempt_at: "ASC" } }
    )
    summary.status = "success"
    for (const map of due) {
      summary.due++
      const result = await uploadOrderToTridata(container, { order_id: map.order_id })
      if (result.status === "sent") {
        summary.sent++
      } else if (result.status === "failed") {
        summary.failed++
      }
    }
    await updateCursor(container, "order_retry", {
      last_run_at: now,
      last_success_at: new Date(),
    })
    return new StepResponse(summary)
  }
)
