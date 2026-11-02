import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getTridataConfig, reverseBranchMap } from "../../../lib/tridata/config"
import { runExclusive } from "../../../lib/tridata/run-guard"
import { TridataSoapFaultError } from "../../../lib/tridata/soap"
import { MAX_UPLOAD_ATTEMPTS, nextAttemptAt } from "../helpers/backoff"
import {
  buildUploadOrderPayload,
  ProductMapEntry,
  SourceOrder,
} from "../helpers/build-upload-order"
import { payloadHash } from "../helpers/hash"
import {
  ensureTridataConfigured,
  getTridataClient,
  getTridataSyncService,
  scrubError,
  trackedCall,
} from "../helpers/tracked-call"

export type UploadOrderInput = {
  order_id: string
  /** Manual retry: ignore next_attempt_at and the max-attempts cap. */
  force?: boolean
}

export type UploadOrderOutput = {
  order_id: string
  status:
    | "sent"
    | "already_sent"
    | "failed"
    | "skipped"
    | "not_configured"
    | "not_due"
    | "conflict"
    | "in_progress"
  web_shop_order_id?: number
  error?: string
  correlation_id?: string | null
}

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "status",
  "created_at",
  "customer.has_account",
  "billing_address.*",
  "shipping_address.*",
  "items.id",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.variant_id",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "items.created_at",
  "shipping_methods.name",
  "shipping_methods.amount",
  "shipping_methods.total",
  "shipping_methods.shipping_option_id",
  "shipping_total",
  "payment_collections.status",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.captured_at",
  "payment_collections.payment_sessions.provider_id",
]

type LoadedOrder = SourceOrder & {
  status?: string
}

export async function loadOrderForUpload(
  container: MedusaContainer,
  orderId: string
): Promise<LoadedOrder | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderId },
  })
  return (data[0] as unknown as LoadedOrder) ?? null
}

type PickupOption = {
  service_zone?: {
    fulfillment_set?: { type?: string | null; location?: { name?: string | null } | null } | null
  } | null
}

/**
 * Pure part of the Click & Collect detection: the first shipping option whose
 * fulfillment set is of type "pickup" AND whose stock location maps to a
 * TriBike branch in TRIDATA_BRANCH_MAP. Anything else (no pickup set, or a
 * location not in the map) -> null, i.e. the order is shipped ("Versand").
 */
export function pickupFilialnameFromOptions(
  options: PickupOption[],
  branchMap: Record<string, string>
): string | null {
  const reverse = reverseBranchMap(branchMap)
  for (const option of options) {
    const set = option.service_zone?.fulfillment_set
    const locationName = set?.location?.name
    if (set?.type === "pickup" && locationName && reverse[locationName]) {
      return reverse[locationName]
    }
  }
  return null
}

/**
 * Click & Collect detection from the order's shipping methods only (shop
 * data, not customer-writable metadata). No pickup fulfillment set is seeded
 * yet, so today every order is "Versand".
 */
export async function resolvePickupFilialname(
  container: MedusaContainer,
  order: LoadedOrder
): Promise<string | null> {
  const optionIds = (order.shipping_methods ?? [])
    .map((m) => m.shipping_option_id)
    .filter((id): id is string => !!id)
  if (!optionIds.length) {
    return null
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "service_zone.fulfillment_set.type",
      "service_zone.fulfillment_set.location.name",
    ],
    filters: { id: optionIds },
  })
  return pickupFilialnameFromOptions(
    data as unknown as PickupOption[],
    getTridataConfig().branchMap
  )
}

async function ensureOrderMap(
  container: MedusaContainer,
  orderId: string,
  webShopOrderId: number
) {
  const service = getTridataSyncService(container)
  const [existing] = await service.listTridataOrderMaps({ order_id: orderId })
  if (existing) {
    return existing
  }
  try {
    return await service.createTridataOrderMaps({
      order_id: orderId,
      web_shop_order_id: webShopOrderId,
      upload_status: "pending",
    })
  } catch {
    // Lost a race against a concurrent upload attempt (unique order_id).
    const [row] = await service.listTridataOrderMaps({ order_id: orderId })
    return row
  }
}

/**
 * Per-order in-process lock shared by the order.placed subscriber, the retry
 * job and the admin retry action, so one order is never uploaded twice in
 * parallel (which would otherwise show up as a false "already exists" conflict).
 */
export async function uploadOrderToTridata(
  container: MedusaContainer,
  input: UploadOrderInput
): Promise<UploadOrderOutput> {
  const run = await runExclusive(`upload-order:${input.order_id}`, () =>
    uploadOrderUnlocked(container, input)
  )
  return run.skipped ? { order_id: input.order_id, status: "in_progress" } : run.result
}

async function uploadOrderUnlocked(
  container: MedusaContainer,
  input: UploadOrderInput
): Promise<UploadOrderOutput> {
  if (!ensureTridataConfigured(container)) {
    return { order_id: input.order_id, status: "not_configured" }
  }
  const service = getTridataSyncService(container)
  const order = await loadOrderForUpload(container, input.order_id)
  if (!order) {
    return { order_id: input.order_id, status: "failed", error: "order not found" }
  }
  const config = getTridataConfig()
  const map = await ensureOrderMap(
    container,
    order.id,
    order.display_id + config.orderIdOffset
  )
  // The WebShopOrderID stored on first contact is the one always sent, even
  // if TRIDATA_ORDER_ID_OFFSET changes later.
  const webShopOrderId = map.web_shop_order_id
  const base = { order_id: order.id, web_shop_order_id: webShopOrderId }

  if (map.upload_status === "sent") {
    return { ...base, status: "already_sent" }
  }
  if (order.status === "canceled") {
    await service.updateTridataOrderMaps({
      id: map.id,
      upload_status: "skipped",
      last_error: "order canceled before upload",
      next_attempt_at: null,
    })
    return { ...base, status: "skipped" }
  }
  if (map.upload_status === "conflict" && !input.force) {
    return { ...base, status: "conflict", error: map.last_error ?? undefined }
  }
  if (!input.force) {
    if (map.attempts >= MAX_UPLOAD_ATTEMPTS) {
      return { ...base, status: "not_due", error: "max attempts reached" }
    }
    if (map.next_attempt_at && new Date(map.next_attempt_at) > new Date()) {
      return { ...base, status: "not_due" }
    }
  }

  const maps = await service.listTridataProductMaps({
    variant_id: order.items.map((i) => i.variant_id).filter((id): id is string => !!id),
  })
  const productMaps: Record<string, ProductMapEntry> = Object.fromEntries(
    maps.map((m) => [
      m.variant_id,
      {
        artikel_id: m.artikel_id,
        artikel_gr_fa_kombi_id: m.artikel_gr_fa_kombi_id,
        grfa: m.grfa,
        ean: m.ean,
      },
    ])
  )
  const pickupFilialname = await resolvePickupFilialname(container, order)
  const { to, bezahlt, unmappedItems } = buildUploadOrderPayload({
    order,
    productMaps,
    pickupFilialname,
    webShopOrderId,
    sendPhone: config.sendPhone,
  })
  const attempts = map.attempts + 1
  await service.updateTridataOrderMaps({ id: map.id, last_attempt_at: new Date() })

  if (unmappedItems.length) {
    const error = `Unmapped items (run link-products): ${unmappedItems.join(", ")}`
    await service.createTridataSyncLogs({
      direction: "outbound",
      function_name: "UploadOrder",
      entity_type: "order",
      entity_id: order.id,
      status: "skipped",
      error: scrubError(error),
      summary: { webShopOrderId, attempt: attempts },
    })
    await service.updateTridataOrderMaps({
      id: map.id,
      upload_status: "failed",
      attempts,
      last_error: scrubError(error),
      next_attempt_at: nextAttemptAt(attempts),
    })
    return { ...base, status: "failed", error }
  }

  const client = getTridataClient(container)
  const res = await trackedCall(
    container,
    {
      functionName: "UploadOrder",
      direction: "outbound",
      entityType: "order",
      entityId: order.id,
      summary: {
        webShopOrderId,
        items: to.OrderItemsList.OrderItemsObj.length,
        bezahlt,
        filialname: pickupFilialname,
        attempt: attempts,
      },
    },
    () => client.uploadOrder(to)
  )

  const alreadyExists =
    !res.ok &&
    res.error instanceof TridataSoapFaultError &&
    /already exists/i.test(res.error.faultString)

  if (alreadyExists) {
    // TriCon already has an order with this WebShopOrderID, but this shop has
    // no record of a successful upload: either another environment uses the
    // same number range (check TRIDATA_ORDER_ID_OFFSET) or an earlier upload
    // succeeded without us recording it. Needs a human; never auto-retried.
    const error =
      `CONFLICT: TriCon already has WebShopOrderID ${webShopOrderId}. Check in TriBike whether it ` +
      "is this order or another environment's order (then fix TRIDATA_ORDER_ID_OFFSET). Not retried " +
      "automatically; resolving it needs a developer (no admin action for this yet)."
    await service.updateTridataOrderMaps({
      id: map.id,
      upload_status: "conflict",
      attempts,
      last_error: error,
      next_attempt_at: null,
      last_correlation_id: res.correlationId,
    })
    return { ...base, status: "conflict", error, correlation_id: res.correlationId }
  }

  if (res.ok) {
    const now = new Date()
    await service.updateTridataOrderMaps({
      id: map.id,
      upload_status: "sent",
      attempts,
      sent_at: now,
      last_error: null,
      next_attempt_at: null,
      bezahlt_sent: bezahlt,
      paid_sent_at: bezahlt ? now : map.paid_sent_at,
      tribike_state: map.tribike_state ?? "Neu",
      last_correlation_id: res.correlationId,
      payload_hash: payloadHash(to),
    })
    return { ...base, status: "sent", correlation_id: res.correlationId }
  }

  const error = scrubError(res.error.message)
  await service.updateTridataOrderMaps({
    id: map.id,
    upload_status: "failed",
    attempts,
    last_error: error,
    next_attempt_at: nextAttemptAt(attempts),
    last_correlation_id: res.correlationId,
  })
  return { ...base, status: "failed", error, correlation_id: res.correlationId }
}

/**
 * Never throws: a TriCon failure is recorded on TridataOrderMap and retried
 * by the retry job, it must never affect order placement.
 */
export const uploadOrderToTridataStep = createStep(
  "upload-order-to-tridata",
  async (input: UploadOrderInput, { container }) => {
    try {
      return new StepResponse(await uploadOrderToTridata(container, input))
    } catch (e) {
      const output: UploadOrderOutput = {
        order_id: input.order_id,
        status: "failed",
        error: scrubError(e instanceof Error ? e.message : String(e)),
      }
      return new StepResponse(output)
    }
  }
)
