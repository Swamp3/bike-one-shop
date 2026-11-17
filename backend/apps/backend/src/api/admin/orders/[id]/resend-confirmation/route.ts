import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { sendOrderConfirmationWithRetry } from "../../../../../workflows/order-confirmation"

/**
 * Sends the order confirmation e-mail again (new idempotency key, so it is not
 * swallowed by an earlier successful send) and updates
 * order.metadata.confirmation_email. Responds 200 with { status }.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id"],
    filters: { id: req.params.id },
  })
  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }
  const status = await sendOrderConfirmationWithRetry(req.scope, req.params.id, {
    resend: true,
  })
  res.json({ status })
}
