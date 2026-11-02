import { model } from "@medusajs/framework/utils"

/**
 * Append-only record of every TriCon call. correlation_id is the same id the
 * `[tridata]` integration-logger lines print. error/summary never hold PII.
 */
const TridataSyncLog = model
  .define("tridata_sync_log", {
    id: model.id({ prefix: "tdlog" }).primaryKey(),
    direction: model.enum(["inbound", "outbound"]),
    function_name: model.text(),
    entity_type: model.text().nullable(),
    entity_id: model.text().nullable(),
    correlation_id: model.text().nullable(),
    status: model.enum(["success", "failed", "skipped"]),
    duration_ms: model.number().nullable(),
    error: model.text().nullable(),
    summary: model.json().nullable(),
  })
  .indexes([
    { on: ["function_name"] },
    { on: ["status"] },
    { on: ["entity_type", "entity_id"] },
    { on: ["created_at"] },
  ])

export default TridataSyncLog
