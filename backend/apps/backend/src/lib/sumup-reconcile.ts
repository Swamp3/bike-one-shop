import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  PaymentActions,
} from "@medusajs/framework/utils"
import { processPaymentWorkflow } from "@medusajs/medusa/core-flows"
import { createIntegrationLogger } from "./integration-logger"
import { scrubError } from "./scrub"
import { sumupEventMatchesSession } from "./sumup-webhook-check"

const PROVIDER_ID = "pp_sumup_sumup"
const MIN_AGE_MS = 10 * 60 * 1000 // SumUp's own webhook retries cover the first minutes
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const BATCH = 100

export const isSumupConfigured = () =>
  Boolean(
    process.env.SUMUP_API_KEY &&
      process.env.SUMUP_MERCHANT_CODE &&
      process.env.SUMUP_WEBHOOK_SECRET
  )

type SessionRow = {
  id: string
  amount: unknown
  payment_collection_id?: string | null
  data?: Record<string, unknown> | null
}

/**
 * processPaymentWorkflow captures first and completes the cart in a step that
 * continues on failure, so a paid session can end without an order. True when
 * the session's cart has an order, or when no cart is linked (nothing to complete).
 */
export async function orderExistsForSession(
  query: { graph: (q: Record<string, unknown>) => Promise<{ data: any[] }> },
  session: SessionRow
): Promise<boolean> {
  const { data: links } = await query.graph({
    entity: "cart_payment_collection",
    fields: ["cart_id"],
    filters: { payment_collection_id: session.payment_collection_id },
  })
  const cartId = links[0]?.cart_id
  if (!cartId) return true
  const { data: orders } = await query.graph({
    entity: "order_cart",
    fields: ["id"],
    filters: { cart_id: cartId },
  })
  return orders.length > 0
}

/**
 * Safety net for a lost SumUp webhook (retries stop after about 2 hours): re-checks
 * pending SumUp payment sessions and, only when SumUp itself reports the checkout
 * as paid for this very session and amount, runs the same workflow the webhook
 * subscriber runs. That workflow captures and completes the cart. Idempotent: a
 * session that was handled is no longer pending, and Medusa skips an existing
 * order or capture. Returns how many sessions ended with an order.
 */
export async function reconcileSumupSessions(
  container: MedusaContainer,
  now = Date.now()
): Promise<number> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const log = createIntegrationLogger(logger, "sumup")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const payment = container.resolve(Modules.PAYMENT)

  const { data: sessions } = await query.graph({
    entity: "payment_session",
    fields: ["id", "amount", "payment_collection_id", "data"],
    filters: {
      provider_id: PROVIDER_ID,
      status: "pending",
      created_at: {
        $lt: new Date(now - MIN_AGE_MS),
        $gt: new Date(now - MAX_AGE_MS),
      },
    },
    pagination: { take: BATCH, order: { created_at: "ASC" } },
  })

  let completed = 0
  for (const session of sessions as SessionRow[]) {
    const checkoutId = session.data?.checkout_id
    if (typeof checkoutId !== "string" || !checkoutId) {
      continue
    }
    try {
      // Same call the webhook handler makes: the plugin fetches the checkout from
      // SumUp with our key and derives action, session id and amount from that.
      const event = await log.call("reconcileCheckout", { session_id: session.id }, () =>
        payment.getWebhookActionAndData({
          provider: "sumup_sumup",
          payload: {
            data: { event_type: "CHECKOUT_STATUS_CHANGED", id: checkoutId },
            rawData: "",
            headers: {},
          },
        })
      )
      if (event.action !== PaymentActions.SUCCESSFUL) {
        continue
      }
      if (!sumupEventMatchesSession(event, session)) {
        // SumUp says paid, but not for this session/amount (e.g. cart total changed): needs a human
        log.error("reconcilePaidMismatch", { session_id: session.id })
        continue
      }
      await processPaymentWorkflow(container).run({ input: event })
      if (!(await orderExistsForSession(query, session))) {
        // money is captured but the cart did not complete: needs a human
        log.error("reconcileCapturedWithoutOrder", { session_id: session.id })
        continue
      }
      completed++
      log.info("reconcileCompleted", { session_id: session.id })
    } catch (e) {
      // one bad session must not stop the rest
      log.warn("reconcileFailed", { session_id: session.id, error: scrubError((e as Error).message, 300) })
    }
  }
  return completed
}
