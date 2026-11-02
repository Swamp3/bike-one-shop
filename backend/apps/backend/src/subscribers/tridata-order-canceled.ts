import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { cancelTridataOrderWorkflow } from "../workflows/tridata"
import { ensureTridataConfigured } from "../workflows/tridata/helpers/tracked-call"

/** order.canceled -> UploadOrderChangeStorno (only if the order was uploaded). */
export default async function tridataOrderCanceledHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!ensureTridataConfigured(container)) {
    return
  }
  try {
    await cancelTridataOrderWorkflow(container).run({ input: { order_id: data.id } })
  } catch (e) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .error(`[tridata] order.canceled storno for ${data.id} crashed: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.CANCELED,
}
