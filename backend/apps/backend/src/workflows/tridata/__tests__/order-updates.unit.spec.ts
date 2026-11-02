import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { TRIDATA_SYNC_MODULE } from "../../../modules/tridata-sync"
import { isSuspiciousEmptyCatalog } from "../steps/link-products"
import { cancelOrder, findOrdersWithoutMap, syncOrderStates } from "../steps/order-updates"

type Map = Record<string, unknown> & { id: string; order_id: string }

const soapResponse = (fn: string, result: string) =>
  new Response(
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>` +
      `<${fn}Response><${fn}Result>${result}</${fn}Result></${fn}Response></soap:Body></soap:Envelope>`
  )

/** Fake TriCon: answers by SOAPAction, records calls, fails the functions in `down`. */
function fakeTricon(state: string, down: string[] = []) {
  const calls: string[] = []
  global.fetch = (async (_url: string, init: RequestInit) => {
    const fn = /(\w+)"$/.exec((init.headers as Record<string, string>).SOAPAction)![1]
    calls.push(fn)
    if (down.includes(fn)) {
      throw new Error("connection refused")
    }
    return fn === "DownloadOrderStateByOrder"
      ? soapResponse(fn, `<WebShopOrderID>1</WebShopOrderID><OrderState>${state}</OrderState>`)
      : soapResponse(fn, "true")
  }) as typeof fetch
  return calls
}

function fakeContainer(map: Map, order: Record<string, unknown>) {
  const service = {
    listTridataOrderMaps: async () => [map],
    updateTridataOrderMaps: async (data: Record<string, unknown>) => Object.assign(map, data),
    createTridataSyncLogs: async () => ({}),
    listTridataSyncCursors: async () => [{ id: "cur" }],
    updateTridataSyncCursors: async () => ({}),
  }
  const logger = { info: () => undefined, warn: () => undefined, error: () => undefined }
  const query = { graph: async () => ({ data: [order] }) }
  const deps: Record<string, unknown> = {
    [TRIDATA_SYNC_MODULE]: service,
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.QUERY]: query,
  }
  return { resolve: (key: string) => deps[key] } as unknown as MedusaContainer
}

const sentMap = (overrides: Record<string, unknown> = {}): Map => ({
  id: "tdom_1",
  order_id: "order_1",
  web_shop_order_id: 1,
  upload_status: "sent",
  attempts: 1,
  bezahlt_sent: false,
  storno_sent_at: null,
  tribike_state: "Neu",
  attention: null,
  ...overrides,
})

const paidOrder = {
  id: "order_1",
  status: "pending",
  created_at: "2026-11-02T09:00:00.000Z",
  items: [],
  payment_collections: [{ status: "completed", payments: [] }],
}
const canceledOrder = { ...paidOrder, status: "canceled", payment_collections: [] }

describe("order-state poll re-sends what the event handlers missed", () => {
  const env = process.env
  const realFetch = global.fetch

  beforeEach(() => {
    process.env = {
      ...env,
      TRIDATA_ENDPOINT_URL: "http://tricon.test/soap",
      TRIDATA_IDENTIFY_GUID: "11111111-1111-1111-1111-111111111111",
    }
  })
  afterEach(() => {
    process.env = env
    global.fetch = realFetch
  })

  it("sends a paid flag the upload did not carry", async () => {
    const map = sentMap()
    const calls = fakeTricon("Neu")
    const summary = await syncOrderStates(fakeContainer(map, paidOrder))
    expect(calls).toContain("UploadOrderChangeBezahlt")
    expect(map.bezahlt_sent).toBe(true)
    expect(summary.reconciled).toBe(1)
  })

  it("sends a storno that failed earlier, then stops once it went through", async () => {
    const map = sentMap()
    const container = fakeContainer(map, canceledOrder)
    fakeTricon("Neu", ["UploadOrderChangeStorno"])
    expect((await syncOrderStates(container)).failed).toBe(1)
    expect(map.storno_sent_at).toBeNull()

    fakeTricon("Neu")
    await syncOrderStates(container)
    expect(map.storno_sent_at).toBeInstanceOf(Date)

    const calls = fakeTricon("Neu")
    await syncOrderStates(container)
    expect(calls).not.toContain("UploadOrderChangeStorno")
  })

  it("moves an order back in the queue when its poll fails", async () => {
    const map = sentMap({ state_checked_at: null })
    fakeTricon("Neu", ["DownloadOrderStateByOrder"])
    await syncOrderStates(fakeContainer(map, paidOrder))
    expect(map.state_checked_at).toBeInstanceOf(Date)
  })

  it("sends no storno for an order already final in TriBike", async () => {
    const calls = fakeTricon("Geliefert")
    await syncOrderStates(fakeContainer(sentMap(), canceledOrder))
    expect(calls).not.toContain("UploadOrderChangeStorno")
  })
})

describe("cancelOrder before a confirmed upload", () => {
  const env = process.env

  beforeEach(() => {
    process.env = {
      ...env,
      TRIDATA_ENDPOINT_URL: "http://tricon.test/soap",
      TRIDATA_IDENTIFY_GUID: "11111111-1111-1111-1111-111111111111",
    }
  })
  afterEach(() => {
    process.env = env
  })

  it("skips quietly when no upload was ever attempted", async () => {
    const map = sentMap({ upload_status: "pending", attempts: 0 })
    await cancelOrder(fakeContainer(map, canceledOrder), "order_1")
    expect(map.upload_status).toBe("skipped")
    expect(map.attention).toBeNull()
  })

  it("flags a failed attempt, which may have reached TriCon", async () => {
    const map = sentMap({ upload_status: "failed", attempts: 2 })
    await cancelOrder(fakeContainer(map, canceledOrder), "order_1")
    expect(map.upload_status).toBe("skipped")
    expect(map.attention).toBe("review")
  })

  it("keeps a conflict and its message", async () => {
    const map = sentMap({ upload_status: "conflict", attempts: 1, last_error: "CONFLICT: x" })
    await cancelOrder(fakeContainer(map, canceledOrder), "order_1")
    expect(map.upload_status).toBe("conflict")
    expect(map.last_error).toBe("CONFLICT: x")
    expect(map.attention).toBe("review")
  })
})

describe("findOrdersWithoutMap", () => {
  const container = (orderIds: string[], mappedIds: string[]) => {
    const deps: Record<string, unknown> = {
      [TRIDATA_SYNC_MODULE]: {
        listTridataOrderMaps: async () => mappedIds.map((order_id) => ({ order_id })),
      },
      [ContainerRegistrationKeys.QUERY]: {
        graph: async () => ({ data: orderIds.map((id) => ({ id })) }),
      },
    }
    return { resolve: (key: string) => deps[key] } as unknown as MedusaContainer
  }
  const now = new Date("2026-11-02T12:00:00.000Z")

  it("returns only the orders with no row", async () => {
    expect(
      await findOrdersWithoutMap(container(["a", "b", "c"], ["a", "c"]), now, now)
    ).toEqual(["b"])
  })

  it("returns nothing when there are no recent orders", async () => {
    expect(await findOrdersWithoutMap(container([], []), now, now)).toEqual([])
  })
})

describe("isSuspiciousEmptyCatalog", () => {
  const grfa = { grfa: true }
  const plain = { grfa: false }

  it("catches an empty Kombi list while GrFa links exist", () => {
    expect(isSuspiciousEmptyCatalog(10, 0, [grfa, plain])).toBe(true)
  })
  it("catches an empty Artikel list while non-GrFa links exist", () => {
    expect(isSuspiciousEmptyCatalog(0, 10, [plain])).toBe(true)
  })
  it("allows empty lists that no existing link depends on", () => {
    expect(isSuspiciousEmptyCatalog(10, 0, [plain])).toBe(false)
    expect(isSuspiciousEmptyCatalog(0, 10, [grfa])).toBe(false)
    expect(isSuspiciousEmptyCatalog(0, 0, [])).toBe(false)
  })
})
