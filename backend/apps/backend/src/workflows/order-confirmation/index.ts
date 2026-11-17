import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { sendNotificationsStep } from "@medusajs/medusa/core-flows"
import type { MedusaContainer } from "@medusajs/framework"
import { scrubError } from "../../lib/scrub"
import {
  buildOrderConfirmationEmail,
  ConfirmationOrder,
} from "./build-email"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "total",
  "item_total",
  "shipping_total",
  "item_discount_total",
  "tax_total",
  "items.product_title",
  "items.title",
  "items.variant_title",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "shipping_address.*",
  "billing_address.*",
]

// Links in the mail must point at the real shop; a localhost fallback is only
// acceptable outside production.
const resolveStorefrontUrl = () => {
  const url = process.env.STOREFRONT_URL
  if (url) {
    return url
  }
  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "STOREFRONT_URL is not set: the order confirmation e-mail needs it for its links"
    )
  }
  return "http://localhost:8000"
}

const retrieveOrderForConfirmationStep = createStep(
  "retrieve-order-for-confirmation",
  async (input: { order_id: string }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
      filters: { id: input.order_id },
    })
    return new StepResponse(data[0] as unknown as ConfirmationOrder)
  }
)

/**
 * Sends the German order confirmation e-mail (channel "email") for one order.
 * Pass a fresh `idempotency_suffix` to deliberately send it again: the same key
 * is swallowed once a notification with it succeeded.
 */
export const sendOrderConfirmationWorkflow = createWorkflow(
  "send-order-confirmation",
  (input: { order_id: string; idempotency_suffix?: string }) => {
    const order = retrieveOrderForConfirmationStep(input)
    const notifications = transform({ order, input }, ({ order, input }) => {
      if (!order.email) {
        return []
      }
      const { subject, text, html } = buildOrderConfirmationEmail(
        order,
        resolveStorefrontUrl()
      )
      return [
        {
          to: order.email,
          channel: "email",
          template: "order-confirmation",
          content: { subject, text, html },
          // Providers that log `data` (notification-local) must not see PII.
          data: { order_id: order.id },
          trigger_type: "order.placed",
          resource_id: order.id,
          resource_type: "order",
          idempotency_key: `order-confirmation-${order.id}${input.idempotency_suffix ? `-${input.idempotency_suffix}` : ""}`,
        },
      ]
    })
    sendNotificationsStep(notifications)
    return new WorkflowResponse(notifications)
  }
)

const recordConfirmationStatusStep = createStep(
  "record-confirmation-status",
  async (input: { order_id: string; status: "sent" | "failed" }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const orderService = container.resolve(Modules.ORDER)
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "metadata"],
      filters: { id: input.order_id },
    })
    // Merge by hand: the update replaces the metadata object. No PII here.
    await orderService.updateOrders(input.order_id, {
      metadata: {
        ...(data[0]?.metadata ?? {}),
        confirmation_email: { status: input.status, at: new Date().toISOString() },
      },
    })
    return new StepResponse(null)
  }
)

/** Stores `metadata.confirmation_email = { status, at }` on the order. */
export const recordConfirmationStatusWorkflow = createWorkflow(
  "record-confirmation-status",
  (input: { order_id: string; status: "sent" | "failed" }) => {
    recordConfirmationStatusStep(input)
    return new WorkflowResponse(null)
  }
)

const ATTEMPTS = 3
const BACKOFF_MS = [2_000, 10_000]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Sends the confirmation with up to 3 attempts (2 s, 10 s backoff) and records
 * the outcome on the order. Never throws; returns the recorded status.
 * shortcut: the retry loop lives here, not in step `maxRetries`/`retryInterval`:
 * a step retry interval makes the workflow asynchronous, so the caller could
 * not tell when the last attempt failed. Replace if the outcome can be read
 * from a workflow subscription. Failed notifications keep their idempotency
 * key and are sent again on the next attempt.
 */
export async function sendOrderConfirmationWithRetry(
  container: MedusaContainer,
  orderId: string,
  opts: { resend?: boolean } = {}
): Promise<"sent" | "failed"> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const idempotency_suffix = opts.resend ? `resend-${Date.now()}` : undefined
  let status: "sent" | "failed" = "failed"
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const { result } = await sendOrderConfirmationWorkflow(container).run({
        input: { order_id: orderId, idempotency_suffix },
      })
      // No e-mail address on the order: nothing was sent, retrying cannot help.
      if (result.length) {
        status = "sent"
      } else {
        logger.error(`[notification] order confirmation for ${orderId} failed: no recipient`)
      }
      break
    } catch (e) {
      logger.error(
        `[notification] order confirmation for ${orderId} failed (attempt ${attempt}/${ATTEMPTS}): ${scrubError((e as Error).message, 300)}`
      )
      if (attempt < ATTEMPTS) {
        await sleep(BACKOFF_MS[attempt - 1])
      }
    }
  }
  try {
    await recordConfirmationStatusWorkflow(container).run({
      input: { order_id: orderId, status },
    })
  } catch (e) {
    logger.error(
      `[notification] order confirmation status for ${orderId} could not be recorded: ${scrubError((e as Error).message, 300)}`
    )
  }
  return status
}

export default sendOrderConfirmationWorkflow
