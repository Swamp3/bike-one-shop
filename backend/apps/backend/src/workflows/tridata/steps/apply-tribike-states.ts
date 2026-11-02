import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  createOrderFulfillmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow,
} from "@medusajs/medusa/core-flows"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getTridataConfig } from "../../../lib/tridata/config"
import { toAmount } from "../helpers/build-upload-order"
import { getTridataSyncService, scrubError } from "../helpers/tracked-call"
import { resolvePickupFilialname } from "./upload-order"

/**
 * What a TriBike OrderState means for the Medusa order. Only "Geliefert" is
 * applied automatically; rejections/cancellations in TriBike are never
 * auto-cancelled in Medusa (payment/refund implications), they are flagged.
 */
export type TribikeStateAction =
  | { kind: "fulfill_and_deliver" }
  | { kind: "none" }
  | { kind: "flag"; attention: "partially_delivered" | "rejected" | "canceled_in_tribike" }

export function decideTribikeAction(state: string | null | undefined): TribikeStateAction {
  switch (state) {
    case "Geliefert":
      return { kind: "fulfill_and_deliver" }
    case "Teilgeliefert":
      // TriCon has no item-level info: fulfil manually.
      return { kind: "flag", attention: "partially_delivered" }
    case "Abgelehnt":
      return { kind: "flag", attention: "rejected" }
    case "StorniertTriData":
      return { kind: "flag", attention: "canceled_in_tribike" }
    // Neu, InBearbeitung: nothing to do yet. StorniertExtern came from the shop.
    default:
      return { kind: "none" }
  }
}

type Quantity = number | string | { numeric?: unknown; value?: unknown } | null | undefined

type OrderForFulfillment = {
  id: string
  status: string
  items: {
    id: string
    // Query returns BigNumber-like objects for order quantities.
    quantity: Quantity
    requires_shipping?: boolean | null
    // With items.detail.* selected, quantity is only present on detail.
    detail?: { quantity?: Quantity; fulfilled_quantity?: Quantity } | null
  }[]
  fulfillments?: { id: string; delivered_at?: string | null; canceled_at?: string | null }[]
  shipping_methods?: { shipping_option_id?: string | null }[]
}

/** Items with their not-yet-fulfilled quantity (> 0 only). */
export function remainingToFulfill(order: Pick<OrderForFulfillment, "items">) {
  return order.items
    .map((item) => ({
      id: item.id,
      quantity:
        toAmount(item.quantity ?? item.detail?.quantity) -
        toAmount(item.detail?.fulfilled_quantity ?? 0),
    }))
    .filter((item) => item.quantity > 0)
}

/**
 * Fulfillment location: the stock location of the order's shipping option's
 * fulfillment set, else the location mapped from the order's Filialname,
 * else the first TriBike-mapped branch.
 */
async function resolveFulfillmentLocation(
  container: MedusaContainer,
  order: OrderForFulfillment,
  filialname: string | null
): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const optionId = order.shipping_methods?.find((m) => m.shipping_option_id)?.shipping_option_id
  if (optionId) {
    const { data } = await query.graph({
      entity: "shipping_option",
      fields: ["id", "service_zone.fulfillment_set.location.id"],
      filters: { id: optionId },
    })
    const locationId = (data[0] as unknown as {
      service_zone?: { fulfillment_set?: { location?: { id?: string } } }
    })?.service_zone?.fulfillment_set?.location?.id
    if (locationId) {
      return locationId
    }
  }
  const branchMap = getTridataConfig().branchMap
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const byName = new Map(locations.map((l) => [l.name as string, l.id as string]))
  const preferred = filialname ? branchMap[filialname] : undefined
  if (preferred && byName.get(preferred)) {
    return byName.get(preferred)!
  }
  for (const name of Object.values(branchMap)) {
    if (byName.get(name)) {
      return byName.get(name)!
    }
  }
  return null
}

/** Creates a fulfillment for every unfulfilled item and marks all open fulfillments delivered. */
async function fulfillAndDeliver(
  container: MedusaContainer,
  orderId: string
): Promise<{ fulfilled: number; delivered: number; note?: string }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "status",
      "items.id",
      "items.quantity",
      "items.requires_shipping",
      "items.detail.quantity",
      "items.detail.fulfilled_quantity",
      "fulfillments.id",
      "fulfillments.delivered_at",
      "fulfillments.canceled_at",
      "shipping_methods.shipping_option_id",
    ],
    filters: { id: orderId },
  })
  const order = data[0] as unknown as OrderForFulfillment | undefined
  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `order ${orderId} not found`)
  }
  if (order.status === "canceled") {
    return { fulfilled: 0, delivered: 0, note: "order is canceled in Medusa; not fulfilled" }
  }
  const remaining = remainingToFulfill(order)
  let fulfilled = 0
  if (remaining.length) {
    const filialname = await resolvePickupFilialname(container, order as never)
    const locationId = await resolveFulfillmentLocation(container, order, filialname)
    await createOrderFulfillmentWorkflow(container).run({
      input: {
        order_id: orderId,
        items: remaining,
        location_id: locationId,
        no_notification: true,
        metadata: { source: "tricon", tribike_state: "Geliefert" },
      },
    })
    fulfilled = remaining.length
  }
  // Re-read: deliver every fulfillment (ours or a manual one) not yet delivered.
  const { data: after } = await query.graph({
    entity: "order",
    fields: ["id", "fulfillments.id", "fulfillments.delivered_at", "fulfillments.canceled_at"],
    filters: { id: orderId },
  })
  const fulfillments = ((after[0] as unknown as OrderForFulfillment)?.fulfillments ?? []).filter(
    (f) => !f.canceled_at
  )
  if (!fulfillments.length) {
    // Never record "applied" for a delivered order that has no fulfillment.
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "nothing was fulfilled and the order has no fulfillment"
    )
  }
  const open = fulfillments.filter((f) => !f.delivered_at)
  for (const fulfillment of open) {
    await markOrderFulfillmentAsDeliveredWorkflow(container).run({
      input: { orderId, fulfillmentId: fulfillment.id },
    })
  }
  return { fulfilled, delivered: open.length }
}

export type ApplyStatesSummary = {
  checked: number
  applied: number
  fulfilled: number
  flagged: number
  failed: number
}

const BATCH = 50

/**
 * Applies changed TriBike states to Medusa orders. Picks maps flagged
 * pending by the state sync, plus maps with a state that was never applied
 * (backfill, e.g. orders that reached a final state before this existed).
 * Failures are logged and retried on the next run; never throws.
 */
export async function applyTribikeOrderStates(
  container: MedusaContainer
): Promise<ApplyStatesSummary> {
  const service = getTridataSyncService(container)
  const summary: ApplyStatesSummary = { checked: 0, applied: 0, fulfilled: 0, flagged: 0, failed: 0 }
  const due = await service.listTridataOrderMaps(
    {
      tribike_state: { $ne: null },
      $or: [{ medusa_apply_pending: true }, { medusa_applied_state: null }],
    },
    { take: BATCH, order: { state_checked_at: "ASC" } }
  )
  for (const map of due) {
    summary.checked++
    const state = map.tribike_state!
    const action = decideTribikeAction(state)
    const startedAt = Date.now()
    try {
      let attention: string | null = null
      let note: string | undefined
      let result: Record<string, unknown> = {}
      if (action.kind === "fulfill_and_deliver") {
        const r = await fulfillAndDeliver(container, map.order_id)
        result = { fulfilled: r.fulfilled, delivered: r.delivered }
        note = r.note
        attention = r.note ? "review" : null
        if (r.fulfilled) {
          summary.fulfilled++
        }
      } else if (action.kind === "flag") {
        attention = action.attention
        summary.flagged++
      }
      await service.updateTridataOrderMaps({
        id: map.id,
        medusa_applied_state: state,
        medusa_applied_at: new Date(),
        medusa_apply_error: note ?? null,
        medusa_apply_pending: false,
        attention,
      })
      if (action.kind !== "none") {
        await service.createTridataSyncLogs({
          direction: "inbound",
          function_name: "apply-tribike-state",
          entity_type: "order",
          entity_id: map.order_id,
          status: "success",
          duration_ms: Date.now() - startedAt,
          summary: { tribikeState: state, action: action.kind, attention, ...result, note },
        })
      }
      summary.applied++
    } catch (e) {
      summary.failed++
      const error = scrubError(e instanceof Error ? e.message : String(e))
      await service.updateTridataOrderMaps({
        id: map.id,
        medusa_apply_error: error,
        medusa_apply_pending: true,
      })
      await service.createTridataSyncLogs({
        direction: "inbound",
        function_name: "apply-tribike-state",
        entity_type: "order",
        entity_id: map.order_id,
        status: "failed",
        duration_ms: Date.now() - startedAt,
        error,
        summary: { tribikeState: state, action: action.kind },
      })
    }
  }
  return summary
}

export const applyTribikeOrderStatesStep = createStep(
  "apply-tribike-order-states",
  async (_input: Record<string, never>, { container }) => {
    return new StepResponse(await applyTribikeOrderStates(container))
  }
)
