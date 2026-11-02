import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, StatusBadge, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { TriconResolveConflict } from "../components/tricon-resolve-conflict"
import {
  ATTENTION_LABELS,
  formatDateTime,
  tridataFetch,
  TridataOrderMap,
  TridataSyncLog,
  uploadStatusColor,
} from "../lib/tridata-api"

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-2 items-center px-6 py-3">
    <Text size="small" weight="plus" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="small">{children}</Text>
  </div>
)

const TriconOrderWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["tridata", "order", order.id],
    queryFn: () =>
      tridataFetch<{ order_map: TridataOrderMap | null; sync_logs: TridataSyncLog[] }>(
        `/orders/${order.id}`
      ),
  })
  const retry = useMutation({
    mutationFn: () =>
      tridataFetch<{ result: { status: string; error?: string } }>(
        `/retry-order/${order.id}`,
        { method: "POST", body: {} }
      ),
    onSuccess: (res) => {
      if (res.result.status === "failed") {
        toast.error("TriCon upload failed", { description: res.result.error })
      } else {
        toast.success(`TriCon upload: ${res.result.status}`)
      }
      queryClient.invalidateQueries({ queryKey: ["tridata"] })
    },
    onError: (e: Error) => toast.error("Retry failed", { description: e.message }),
  })

  const map = data?.order_map
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">TriCon</Heading>
        <Link to="/tricon" className="text-ui-fg-interactive text-sm">
          Sync overview
        </Link>
      </div>
      {isLoading ? (
        <Text size="small" className="px-6 py-3">
          Loading...
        </Text>
      ) : !map ? (
        <Text size="small" className="text-ui-fg-subtle px-6 py-3">
          Not synced to TriCon (yet).
        </Text>
      ) : (
        <>
          <Row label="WebShopOrderID">{map.web_shop_order_id}</Row>
          <Row label="Upload">
            <StatusBadge color={uploadStatusColor(map.upload_status)}>
              {map.upload_status}
            </StatusBadge>{" "}
            {map.attempts > 0 ? `(${map.attempts} attempt${map.attempts > 1 ? "s" : ""})` : ""}
          </Row>
          <Row label="Sent at">{formatDateTime(map.sent_at)}</Row>
          <Row label="TriBike state">
            {map.tribike_state ? <Badge size="2xsmall">{map.tribike_state}</Badge> : "-"}
            {map.state_checked_at ? ` (checked ${formatDateTime(map.state_checked_at)})` : ""}
          </Row>
          <Row label="Applied in Medusa">
            {map.medusa_applied_state
              ? `${map.medusa_applied_state} (${formatDateTime(map.medusa_applied_at)})`
              : "-"}
          </Row>
          {map.attention && (
            <div className="px-6 py-3">
              <Text size="small" weight="plus" className="text-ui-fg-error">
                {ATTENTION_LABELS[map.attention] ?? map.attention}
              </Text>
            </div>
          )}
          {map.medusa_apply_error && (
            <Row label="Apply error">{map.medusa_apply_error}</Row>
          )}
          <Row label="Paid flag sent">{map.bezahlt_sent ? formatDateTime(map.paid_sent_at) : "no"}</Row>
          {map.storno_sent_at && <Row label="Storno sent">{formatDateTime(map.storno_sent_at)}</Row>}
          {map.upload_status === "conflict" && (
            <div className="px-6 py-3">
              <Text size="small" className="text-ui-fg-error">
                Needs admin review: {map.last_error}
              </Text>
            </div>
          )}
          {map.last_error && map.upload_status !== "conflict" && (
            <Row label="Last error">{map.last_error}</Row>
          )}
          <Row label="Last correlation id">
            <span className="font-mono text-xs">{map.last_correlation_id ?? "-"}</span>
          </Row>
        </>
      )}
      {map?.upload_status === "conflict" && (
        <div className="flex justify-end px-6 py-3">
          <TriconResolveConflict orderId={order.id} />
        </div>
      )}
      {map?.upload_status !== "sent" &&
        map?.upload_status !== "skipped" &&
        map?.upload_status !== "conflict" && (
        <div className="flex justify-end px-6 py-3">
          <Button size="small" variant="secondary" isLoading={retry.isPending} onClick={() => retry.mutate()}>
            {map ? "Retry upload" : "Upload now"}
          </Button>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default TriconOrderWidget
