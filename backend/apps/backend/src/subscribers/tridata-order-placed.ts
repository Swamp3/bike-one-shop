import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils"
import { uploadOrderToTridataWorkflow } from "../workflows/tridata"
import { ensureTridataConfigured } from "../workflows/tridata/helpers/tracked-call"

/** order.placed -> UploadOrder. Runs after placement; failures go to the retry job. */
export default async function tridataOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!ensureTridataConfigured(container)) {
    return
  }
  try {
    await uploadOrderToTridataWorkflow(container).run({
      input: { order_id: data.id },
    })
  } catch (e) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .error(`[tridata] order.placed upload for ${data.id} crashed: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
}
