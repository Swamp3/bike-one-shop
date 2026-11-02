import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowPath } from "@medusajs/icons"
import {
  Alert,
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  StatusBadge,
  Switch,
  Table,
  Tabs,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ReactNode, useState } from "react"
import { Link } from "react-router-dom"
import { TriconResolveConflict } from "../../components/tricon-resolve-conflict"
import {
  ATTENTION_LABELS,
  formatDateTime,
  tridataFetch,
  TridataOrderMap,
  TridataSyncLog,
  uploadStatusColor,
} from "../../lib/tridata-api"

const PAGE_SIZE = 25

type Status = {
  configured: boolean
  refused_reason: string | null
  unmatched_shop_skus: string[]
  unmatched_tridata_keys: string[]
  conflicts: string[]
  endpoint_host: string | null
  branch_map: Record<string, string>
  streams: {
    stream: string
    last_change: string | null
    last_run_at: string | null
    last_success_at: string | null
    last_error: string | null
  }[]
  error_count_24h: number
  mapped_variants: number
  shop_variants: number | null
  unmatched_tridata: number | null
  unmatched_shop: number | null
  last_link_at: string | null
  orders: Record<string, number>
  attention: Record<string, number>
  apply_errors: number
}

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-y-1 rounded-md border px-4 py-3">
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text weight="plus">{value}</Text>
  </div>
)

const Pager = ({
  offset,
  count,
  onChange,
}: {
  offset: number
  count: number
  onChange: (offset: number) => void
}) => (
  <div className="flex items-center justify-between px-6 py-4">
    <Text size="small" className="text-ui-fg-subtle">
      {count === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE_SIZE, count)} of {count}
    </Text>
    <div className="flex gap-x-2">
      <Button
        size="small"
        variant="secondary"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}
      >
        Previous
      </Button>
      <Button
        size="small"
        variant="secondary"
        disabled={offset + PAGE_SIZE >= count}
        onClick={() => onChange(offset + PAGE_SIZE)}
      >
        Next
      </Button>
    </div>
  </div>
)

const useAction = (path: string, label: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown> = {}) =>
      tridataFetch<{ result: unknown }>(path, { method: "POST", body }),
    onSuccess: (data) => {
      toast.success(`${label} finished`, {
        description: JSON.stringify(data.result).slice(0, 300),
      })
      queryClient.invalidateQueries({ queryKey: ["tridata"] })
    },
    onError: (e: Error) => toast.error(`${label} failed`, { description: e.message }),
  })
}

const OverviewTab = () => {
  const [force, setForce] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ["tridata", "status"],
    queryFn: () => tridataFetch<Status>("/status"),
    refetchInterval: 15000,
  })
  const link = useAction("/link-products", "Link products")
  const stock = useAction("/sync-stock", "Stock sync")
  const states = useAction("/sync-order-states", "Order-state sync")

  if (isLoading || !data) {
    return <Text className="px-6 py-4">Loading...</Text>
  }
  const unmatchedShop = data.unmatched_shop ?? 0
  return (
    <div className="flex flex-col gap-y-6 px-6 py-4">
      {data.refused_reason && (
        <Alert variant="error">
          TriCon configuration refused in production: {data.refused_reason}. Sync is disabled.
        </Alert>
      )}
      {(data.orders.conflict ?? 0) > 0 && (
        <Alert variant="error">
          {data.orders.conflict} order(s) in CONFLICT: TriCon already had their WebShopOrderID.
          Review them in the Orders tab; they are not retried automatically.
        </Alert>
      )}
      {Object.entries(data.attention ?? {})
        .filter(([, count]) => count > 0)
        .map(([kind, count]) => (
          <Alert key={kind} variant={kind === "partially_delivered" ? "warning" : "error"}>
            {count} order(s): {ATTENTION_LABELS[kind] ?? kind}. See the Orders tab.
          </Alert>
        ))}
      {data.apply_errors > 0 && (
        <Alert variant="error">
          {data.apply_errors} order(s): applying the TriBike state to Medusa failed (retried on
          every order-state sync). See the Orders tab.
        </Alert>
      )}
      {unmatchedShop > 0 && (
        <Alert variant="warning">
          <div className="flex flex-col gap-y-1">
            <Text size="small" weight="plus">
              {unmatchedShop} shop variant(s) have no TriBike item: no stock sync, and orders
              containing them cannot be uploaded.
            </Text>
            <Text size="small" className="font-mono break-all">
              {data.unmatched_shop_skus.join(", ")}
              {unmatchedShop > data.unmatched_shop_skus.length ? ", ..." : ""}
            </Text>
          </div>
        </Alert>
      )}
      {data.conflicts.length > 0 && (
        <Alert variant="warning">
          Duplicate match keys, not linked (fix SKUs in Medusa or TriBike):{" "}
          <span className="font-mono">{data.conflicts.join(", ")}</span>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge color={data.configured ? "green" : "grey"}>
          {data.configured ? "Configured" : "Not configured"}
        </StatusBadge>
        <Text size="small" className="text-ui-fg-subtle">
          Endpoint: {data.endpoint_host ?? "-"}
          {data.endpoint_host?.startsWith("localhost") ? " (mock)" : ""}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Branches:{" "}
          {Object.entries(data.branch_map)
            .map(([k, v]) => `${k} -> ${v}`)
            .join(", ")}
        </Text>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Errors (24h)" value={data.error_count_24h} />
        <Stat
          label="Mapped variants"
          value={`${data.mapped_variants} / ${data.shop_variants ?? "?"}`}
        />
        <Stat
          label="Unmatched (TriBike / shop)"
          value={`${data.unmatched_tridata ?? "-"} / ${data.unmatched_shop ?? "-"}`}
        />
        <Stat
          label="Orders sent / failed / pending"
          value={`${data.orders.sent ?? 0} / ${data.orders.failed ?? 0} / ${data.orders.pending ?? 0}${data.orders.conflict ? ` (+${data.orders.conflict} conflict)` : ""}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="small"
          disabled={!data.configured}
          isLoading={link.isPending}
          onClick={() => link.mutate({})}
        >
          Link products
        </Button>
        <Button
          size="small"
          disabled={!data.configured}
          isLoading={stock.isPending}
          onClick={() => stock.mutate({ force })}
        >
          Run stock sync now
        </Button>
        <div className="flex items-center gap-x-2">
          <Switch id="force-full" checked={force} onCheckedChange={setForce} />
          <Text size="small" asChild>
            <label htmlFor="force-full">Full (ignore LastChange)</label>
          </Text>
        </div>
        <Button
          size="small"
          disabled={!data.configured}
          isLoading={states.isPending}
          onClick={() => states.mutate({})}
        >
          Run order-state sync now
        </Button>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Stream</Table.HeaderCell>
            <Table.HeaderCell>Last success</Table.HeaderCell>
            <Table.HeaderCell>Last run</Table.HeaderCell>
            <Table.HeaderCell>LastChange cursor</Table.HeaderCell>
            <Table.HeaderCell>Last error</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.streams.map((s) => (
            <Table.Row key={s.stream}>
              <Table.Cell>{s.stream}</Table.Cell>
              <Table.Cell>{formatDateTime(s.last_success_at)}</Table.Cell>
              <Table.Cell>{formatDateTime(s.last_run_at)}</Table.Cell>
              <Table.Cell>{s.last_change ?? "-"}</Table.Cell>
              <Table.Cell className="max-w-[320px] truncate" title={s.last_error ?? ""}>
                {s.last_error ?? "-"}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

const SyncLogTab = () => {
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState("all")
  const [direction, setDirection] = useState("all")
  const [fn, setFn] = useState("")
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
  if (status !== "all") {
    params.set("status", status)
  }
  if (direction !== "all") {
    params.set("direction", direction)
  }
  if (fn.trim()) {
    params.set("function_name", fn.trim())
  }
  const { data } = useQuery({
    queryKey: ["tridata", "sync-logs", params.toString()],
    queryFn: () =>
      tridataFetch<{ sync_logs: TridataSyncLog[]; count: number }>(
        `/sync-logs?${params.toString()}`
      ),
    refetchInterval: 15000,
  })
  return (
    <div>
      <div className="flex flex-wrap gap-3 px-6 py-4">
        <Input
          size="small"
          placeholder="Function (exact), e.g. UploadOrder"
          value={fn}
          onChange={(e) => {
            setFn(e.target.value)
            setOffset(0)
          }}
          className="w-64"
        />
        <Select
          size="small"
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setOffset(0)
          }}
        >
          <Select.Trigger className="w-36">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All statuses</Select.Item>
            <Select.Item value="success">success</Select.Item>
            <Select.Item value="failed">failed</Select.Item>
            <Select.Item value="skipped">skipped</Select.Item>
          </Select.Content>
        </Select>
        <Select
          size="small"
          value={direction}
          onValueChange={(v) => {
            setDirection(v)
            setOffset(0)
          }}
        >
          <Select.Trigger className="w-36">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">Both directions</Select.Item>
            <Select.Item value="inbound">inbound</Select.Item>
            <Select.Item value="outbound">outbound</Select.Item>
          </Select.Content>
        </Select>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Time</Table.HeaderCell>
            <Table.HeaderCell>Dir</Table.HeaderCell>
            <Table.HeaderCell>Function</Table.HeaderCell>
            <Table.HeaderCell>Entity</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>ms</Table.HeaderCell>
            <Table.HeaderCell>Correlation id</Table.HeaderCell>
            <Table.HeaderCell>Error / summary</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.sync_logs ?? []).map((log) => (
            <Table.Row key={log.id}>
              <Table.Cell>{formatDateTime(log.created_at)}</Table.Cell>
              <Table.Cell>{log.direction === "inbound" ? "in" : "out"}</Table.Cell>
              <Table.Cell>{log.function_name}</Table.Cell>
              <Table.Cell>
                {log.entity_type === "order" && log.entity_id ? (
                  <Link to={`/orders/${log.entity_id}`} className="text-ui-fg-interactive">
                    order
                  </Link>
                ) : (
                  log.entity_type ?? "-"
                )}
              </Table.Cell>
              <Table.Cell>
                <StatusBadge
                  color={
                    log.status === "success" ? "green" : log.status === "failed" ? "red" : "grey"
                  }
                >
                  {log.status}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>{log.duration_ms ?? "-"}</Table.Cell>
              <Table.Cell className="font-mono text-xs">{log.correlation_id ?? "-"}</Table.Cell>
              <Table.Cell
                className="max-w-[360px] truncate"
                title={log.error ?? JSON.stringify(log.summary ?? {})}
              >
                {log.error ?? JSON.stringify(log.summary ?? {})}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Pager offset={offset} count={data?.count ?? 0} onChange={setOffset} />
    </div>
  )
}

type OrderRow = TridataOrderMap & {
  order: {
    id: string
    display_id: number
    created_at: string
    email: string | null
    total: number | null
    currency_code: string
  } | null
}

const OrdersTab = () => {
  const [offset, setOffset] = useState(0)
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ["tridata", "orders", offset],
    queryFn: () =>
      tridataFetch<{ orders: OrderRow[]; count: number }>(
        `/orders?limit=${PAGE_SIZE}&offset=${offset}`
      ),
    refetchInterval: 15000,
  })
  const retry = useMutation({
    mutationFn: (orderId: string) =>
      tridataFetch<{ result: { status: string; error?: string } }>(
        `/retry-order/${orderId}`,
        { method: "POST", body: {} }
      ),
    onSuccess: (res) => {
      if (res.result.status === "failed") {
        toast.error("Upload failed again", { description: res.result.error })
      } else {
        toast.success(`Upload: ${res.result.status}`)
      }
      queryClient.invalidateQueries({ queryKey: ["tridata"] })
    },
    onError: (e: Error) => toast.error("Retry failed", { description: e.message }),
  })
  return (
    <div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>WebShopOrderID</Table.HeaderCell>
            <Table.HeaderCell>Placed</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell>Total</Table.HeaderCell>
            <Table.HeaderCell>Upload</Table.HeaderCell>
            <Table.HeaderCell>Attempts</Table.HeaderCell>
            <Table.HeaderCell>TriBike state</Table.HeaderCell>
            <Table.HeaderCell>Applied in Medusa</Table.HeaderCell>
            <Table.HeaderCell>Last error</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.orders ?? []).map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell>
                <Link to={`/orders/${row.order_id}`} className="text-ui-fg-interactive">
                  #{row.web_shop_order_id}
                </Link>
              </Table.Cell>
              <Table.Cell>{formatDateTime(row.order?.created_at)}</Table.Cell>
              <Table.Cell>{row.order?.email ?? "-"}</Table.Cell>
              <Table.Cell>
                {row.order?.total !== null && row.order?.total !== undefined
                  ? `${Number(row.order.total).toFixed(2)} ${row.order.currency_code.toUpperCase()}`
                  : "-"}
              </Table.Cell>
              <Table.Cell>
                <StatusBadge color={uploadStatusColor(row.upload_status)}>
                  {row.upload_status}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>{row.attempts}</Table.Cell>
              <Table.Cell>
                {row.tribike_state ? <Badge size="2xsmall">{row.tribike_state}</Badge> : "-"}
                {row.storno_sent_at ? " (storno sent)" : ""}
              </Table.Cell>
              <Table.Cell>
                {row.attention ? (
                  <StatusBadge color={row.attention === "partially_delivered" ? "orange" : "red"}>
                    {ATTENTION_LABELS[row.attention] ?? row.attention}
                  </StatusBadge>
                ) : row.medusa_apply_error && row.medusa_apply_pending ? (
                  <span className="text-ui-fg-error" title={row.medusa_apply_error}>
                    failed: {row.medusa_apply_error.slice(0, 60)}
                  </span>
                ) : (
                  row.medusa_applied_state ?? "-"
                )}
              </Table.Cell>
              <Table.Cell
                className={`max-w-[260px] truncate ${row.upload_status === "conflict" ? "text-ui-fg-error" : ""}`}
                title={row.last_error ?? ""}
              >
                {row.last_error ?? "-"}
              </Table.Cell>
              <Table.Cell>
                {row.upload_status === "conflict" && (
                  <TriconResolveConflict orderId={row.order_id} />
                )}
                {row.upload_status !== "sent" &&
                  row.upload_status !== "skipped" &&
                  row.upload_status !== "conflict" && (
                  <Button
                    size="small"
                    variant="secondary"
                    isLoading={retry.isPending && retry.variables === row.order_id}
                    onClick={() => retry.mutate(row.order_id)}
                  >
                    Retry
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Pager offset={offset} count={data?.count ?? 0} onChange={setOffset} />
    </div>
  )
}

type SnapshotRow = {
  id: string
  sku: string | null
  filialname: string
  source: string
  lagerbestand: number
  reserviert: number
  bestellt: number
  menge_verfuegbar: number
  tribike_last_change: string | null
  last_synced_at: string | null
  inventory_level: {
    stocked_quantity: number
    reserved_quantity: number
    available_quantity: number
  } | null
}

const StockTab = () => {
  const [offset, setOffset] = useState(0)
  const [sku, setSku] = useState("")
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
  if (sku.trim()) {
    params.set("sku", sku.trim())
  }
  const { data } = useQuery({
    queryKey: ["tridata", "stock", params.toString()],
    queryFn: () =>
      tridataFetch<{ stock_snapshots: SnapshotRow[]; count: number }>(
        `/stock-snapshots?${params.toString()}`
      ),
  })
  return (
    <div>
      <div className="px-6 py-4">
        <Input
          size="small"
          placeholder="Filter SKU"
          value={sku}
          onChange={(e) => {
            setSku(e.target.value)
            setOffset(0)
          }}
          className="w-64"
        />
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>SKU</Table.HeaderCell>
            <Table.HeaderCell>Branch</Table.HeaderCell>
            <Table.HeaderCell>Lagerbestand</Table.HeaderCell>
            <Table.HeaderCell>Reserviert</Table.HeaderCell>
            <Table.HeaderCell>Bestellt</Table.HeaderCell>
            <Table.HeaderCell>MengeVerfuegbar</Table.HeaderCell>
            <Table.HeaderCell>Medusa stocked / reserved / available</Table.HeaderCell>
            <Table.HeaderCell>TriBike LastChange</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.stock_snapshots ?? []).map((s) => (
            <Table.Row key={s.id}>
              <Table.Cell>{s.sku ?? "-"}</Table.Cell>
              <Table.Cell>{s.filialname}</Table.Cell>
              <Table.Cell>{s.lagerbestand}</Table.Cell>
              <Table.Cell>{s.reserviert}</Table.Cell>
              <Table.Cell>{s.bestellt}</Table.Cell>
              <Table.Cell>{s.menge_verfuegbar}</Table.Cell>
              <Table.Cell>
                {s.inventory_level
                  ? `${s.inventory_level.stocked_quantity} / ${s.inventory_level.reserved_quantity} / ${s.inventory_level.available_quantity}`
                  : "no level"}
              </Table.Cell>
              <Table.Cell>{s.tribike_last_change ?? "-"}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Pager offset={offset} count={data?.count ?? 0} onChange={setOffset} />
    </div>
  )
}

const TriconSyncPage = () => {
  return (
    <Container className="divide-y p-0">
      <Toaster />
      <div className="px-6 py-4">
        <Heading level="h1">TriCon Sync</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          What the shop sent to and received from TriCon (TriData/TriBike ERP).
        </Text>
      </div>
      <Tabs defaultValue="overview">
        <Tabs.List className="px-6 py-2">
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="logs">Sync log</Tabs.Trigger>
          <Tabs.Trigger value="orders">Orders</Tabs.Trigger>
          <Tabs.Trigger value="stock">Stock snapshot</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview">
          <OverviewTab />
        </Tabs.Content>
        <Tabs.Content value="logs">
          <SyncLogTab />
        </Tabs.Content>
        <Tabs.Content value="orders">
          <OrdersTab />
        </Tabs.Content>
        <Tabs.Content value="stock">
          <StockTab />
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "TriCon Sync",
  icon: ArrowPath,
})

export default TriconSyncPage
