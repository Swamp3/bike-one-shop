import { model } from "@medusajs/framework/utils"

/**
 * Per-stream run state: the TriBike LastChange watermark for delta calls
 * (stock streams) plus last run / last success timestamps for the admin
 * status view. stream: catalog | stock_branch | stock_color_size_branch |
 * order_state | order_retry.
 */
const TridataSyncCursor = model
  .define("tridata_sync_cursor", {
    id: model.id({ prefix: "tdcur" }).primaryKey(),
    stream: model.text(),
    last_change: model.text().nullable(),
    last_run_at: model.dateTime().nullable(),
    last_success_at: model.dateTime().nullable(),
    last_error: model.text().nullable(),
  })
  .indexes([{ on: ["stream"], unique: true, where: "deleted_at IS NULL" }])

export default TridataSyncCursor
