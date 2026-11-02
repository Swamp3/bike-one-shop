/**
 * Minimal fetch wrapper for the /admin/tridata/* routes. The admin dashboard
 * authenticates with a session cookie, so same-origin fetch with credentials
 * is enough (no extra SDK dependency).
 */
const BASE = import.meta.env.VITE_BACKEND_URL || ""

export async function tridataFetch<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${BASE}/admin/tridata${path}`, {
    method: init.method ?? "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((json as { message?: string }).message || `HTTP ${res.status}`)
  }
  return json as T
}

export const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("de-DE") : "-"

export type TridataOrderMap = {
  id: string
  order_id: string
  web_shop_order_id: number
  upload_status: "pending" | "sent" | "failed" | "skipped" | "conflict"
  attempts: number
  last_error: string | null
  next_attempt_at: string | null
  last_attempt_at: string | null
  sent_at: string | null
  bezahlt_sent: boolean
  paid_sent_at: string | null
  storno_sent_at: string | null
  tribike_state: string | null
  state_checked_at: string | null
  medusa_applied_state: string | null
  medusa_applied_at: string | null
  medusa_apply_error: string | null
  medusa_apply_pending: boolean
  attention: string | null
  last_correlation_id: string | null
  created_at: string
}

export type TridataSyncLog = {
  id: string
  direction: "inbound" | "outbound"
  function_name: string
  entity_type: string | null
  entity_id: string | null
  correlation_id: string | null
  status: "success" | "failed" | "skipped"
  duration_ms: number | null
  error: string | null
  summary: Record<string, unknown> | null
  created_at: string
}

export const uploadStatusColor = (status: string) =>
  status === "sent"
    ? "green"
    : status === "failed" || status === "conflict"
      ? "red"
      : status === "pending"
        ? "orange"
        : "grey"

export const ATTENTION_LABELS: Record<string, string> = {
  partially_delivered: "Partially delivered in TriBike - fulfil manually",
  rejected: "Rejected in TriBike - review",
  canceled_in_tribike: "Cancelled in TriBike - review",
  review: "Needs review",
}
