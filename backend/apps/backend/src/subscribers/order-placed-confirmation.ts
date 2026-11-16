import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { scrubError } from "../lib/scrub"
import { sendOrderConfirmationWorkflow } from "../workflows/order-confirmation"

/**
 * order.placed -> German confirmation e-mail. A failure (no provider in
 * production, provider outage) must never affect the order itself; only the
 * order id and error message are logged, never the recipient or content.
 */
export default async function orderPlacedConfirmationHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await sendOrderConfirmationWorkflow(container).run({
      input: { order_id: data.id },
    })
    logger.info(`[notification] order confirmation handed to provider for ${data.id}`)
  } catch (e) {
    logger.error(
      `[notification] order confirmation for ${data.id} failed: ${scrubError((e as Error).message, 300)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
