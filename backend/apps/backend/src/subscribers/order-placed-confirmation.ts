import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { sendOrderConfirmationWithRetry } from "../workflows/order-confirmation"

/**
 * order.placed -> German confirmation e-mail, 3 attempts, outcome stored in
 * order.metadata.confirmation_email. A failure (provider outage) must never
 * affect the order itself; only the order id and error message are logged,
 * never the recipient or content.
 */
export default async function orderPlacedConfirmationHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  // Same condition as medusa-config.ts: no notification module is registered.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NOTIFICATION_ALLOW_NONE === "true" &&
    !(
      process.env.NOTIFICATION_PROVIDER_RESOLVE &&
      process.env.NOTIFICATION_API_KEY &&
      process.env.NOTIFICATION_FROM
    )
  ) {
    logger.warn(
      `[notification] NOTIFICATION_ALLOW_NONE=true: order confirmation for ${data.id} was SKIPPED (no e-mail sent)`
    )
    return
  }
  const status = await sendOrderConfirmationWithRetry(container, data.id)
  if (status === "sent") {
    logger.info(`[notification] order confirmation handed to provider for ${data.id}`)
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
