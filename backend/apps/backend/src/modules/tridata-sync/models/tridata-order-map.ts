import { model } from "@medusajs/framework/utils"

/**
 * Outbound order sync state. WebShopOrderID = Medusa order.display_id.
 * upload_status: pending (not yet attempted / in flight), sent, failed
 * (retried with backoff), skipped (canceled before it was ever uploaded),
 * conflict (TriCon already had this WebShopOrderID; admin review, no auto retry).
 * web_shop_order_id is the value actually sent (display_id + TRIDATA_ORDER_ID_OFFSET).
 */
const TridataOrderMap = model
  .define("tridata_order_map", {
    id: model.id({ prefix: "tdom" }).primaryKey(),
    order_id: model.text(),
    web_shop_order_id: model.number(),
    /** Times an admin re-issued the WebShopOrderID to resolve a conflict. */
    id_bump: model.number().default(0),
    upload_status: model
      .enum(["pending", "sent", "failed", "skipped", "conflict"])
      .default("pending"),
    attempts: model.number().default(0),
    last_error: model.text().nullable(),
    next_attempt_at: model.dateTime().nullable(),
    last_attempt_at: model.dateTime().nullable(),
    sent_at: model.dateTime().nullable(),
    bezahlt_sent: model.boolean().default(false),
    paid_sent_at: model.dateTime().nullable(),
    storno_sent_at: model.dateTime().nullable(),
    tribike_state: model.text().nullable(),
    state_checked_at: model.dateTime().nullable(),
    /** TriBike state last applied to the Medusa order (see apply-tribike-order-states). */
    medusa_applied_state: model.text().nullable(),
    medusa_applied_at: model.dateTime().nullable(),
    medusa_apply_error: model.text().nullable(),
    /** Set when tribike_state changed and still has to be applied to Medusa. */
    medusa_apply_pending: model.boolean().default(false),
    /** Needs a human: partially_delivered | rejected | canceled_in_tribike | review */
    attention: model.text().nullable(),
    last_correlation_id: model.text().nullable(),
    payload_hash: model.text().nullable(),
  })
  .indexes([
    { on: ["order_id"], unique: true, where: "deleted_at IS NULL" },
    { on: ["web_shop_order_id"], unique: true, where: "deleted_at IS NULL" },
    { on: ["upload_status", "next_attempt_at"] },
    { on: ["medusa_apply_pending"] },
  ])

export default TridataOrderMap
