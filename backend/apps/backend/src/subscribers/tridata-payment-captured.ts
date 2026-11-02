import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, PaymentEvents } from "@medusajs/framework/utils"
import { markTridataOrderPaidWorkflow } from "../workflows/tridata"
import { ensureTridataConfigured } from "../workflows/tridata/helpers/tracked-call"

/**
 * payment.captured (payload: payment id) -> UploadOrderChangeBezahlt when the
 * order was already uploaded unpaid. If not uploaded yet, the paid flag is
 * part of the upload itself.
 */
export default async function tridataPaymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!ensureTridataConfigured(container)) {
    return
  }
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: payments } = await query.graph({
      entity: "payment",
      fields: ["id", "payment_collection.order.id"],
      filters: { id: data.id },
    })
    const orderId = (payments[0] as unknown as {
      payment_collection?: { order?: { id?: string } }
    })?.payment_collection?.order?.id
    if (!orderId) {
      return
    }
    await markTridataOrderPaidWorkflow(container).run({ input: { order_id: orderId } })
  } catch (e) {
    logger.error(`[tridata] payment.captured for ${data.id} crashed: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: PaymentEvents.CAPTURED,
}
