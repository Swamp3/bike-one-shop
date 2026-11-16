import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { sendNotificationsStep } from "@medusajs/medusa/core-flows"
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
  "discount_total",
  "tax_total",
  "items.product_title",
  "items.title",
  "items.variant_title",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "shipping_address.*",
]

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

/** Sends the German order confirmation e-mail (channel "email") for one order. */
export const sendOrderConfirmationWorkflow = createWorkflow(
  "send-order-confirmation",
  (input: { order_id: string }) => {
    const order = retrieveOrderForConfirmationStep(input)
    const notifications = transform({ order }, ({ order }) => {
      if (!order.email) {
        return []
      }
      const { subject, text, html } = buildOrderConfirmationEmail(
        order,
        process.env.STOREFRONT_URL || "http://localhost:8000"
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
          idempotency_key: `order-confirmation-${order.id}`,
        },
      ]
    })
    sendNotificationsStep(notifications)
    return new WorkflowResponse(notifications)
  }
)

export default sendOrderConfirmationWorkflow
