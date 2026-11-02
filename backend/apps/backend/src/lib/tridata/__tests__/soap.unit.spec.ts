import {
  buildSoapEnvelope,
  extractBoolean,
  extractList,
  extractRecord,
  formatTridataDateTime,
  parseSoapResponse,
  parseTridataDateTime,
  readBodyCapped,
  soapCall,
  TridataResponseError,
  TridataSoapFaultError,
  TridataTransportError,
} from "../soap"
import { TridataClient } from "../client"
import { getTridataConfig, isTridataConfigured, MOCK_IDENTIFY_GUID } from "../config"
import { scrubError } from "../../scrub"
import { createIntegrationLogger } from "../../integration-logger"

const envelope = (inner: string) =>
  `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${inner}</soap:Body>
</soap:Envelope>`

const stockRecord = (id: string, menge: string) => `
  <StockColorSizeBranch>
    <ArtikelID>${id}</ArtikelID>
    <Artikelnummer>0012</Artikelnummer>
    <MengeVerfuegbar>${menge}</MengeVerfuegbar>
    <Filialname>Osnabr&#252;ck</Filialname>
  </StockColorSizeBranch>`

describe("buildSoapEnvelope", () => {
  it("builds a SOAP 1.1 envelope with the operation in the tempuri namespace", () => {
    const xml = buildSoapEnvelope("DownloadStockColorSizeBranchDelta", {
      IdentifyGuid: "00000000-0000-0000-0000-000000000001",
      LastChange: "2026-11-03T10:00:00",
    })
    expect(xml).toContain(
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
    )
    expect(xml).toContain(
      '<DownloadStockColorSizeBranchDelta xmlns="http://tempuri.org/">'
    )
    expect(xml).toMatch(
      /<IdentifyGuid>00000000-0000-0000-0000-000000000001<\/IdentifyGuid>\s*<LastChange>2026-11-03T10:00:00<\/LastChange>/
    )
  })

  it("serializes nested objects, repeated arrays, dates, numbers, booleans and escapes text", () => {
    const xml = buildSoapEnvelope("UploadOrder", {
      IdentifyGuid: "g",
      TO: {
        Customer: { Kundenname: "Müller & <Söhne>", Mailingsperre: true },
        Order: {
          WebShopOrderID: 42,
          ShippingCost: 4.9,
          OrderCompletedDate: new Date("2026-11-03T09:05:07.123Z"),
          Comment: undefined,
        },
        OrderItemsList: {
          OrderItemsObj: [{ Positionsnummer: 1 }, { Positionsnummer: 2 }],
        },
      },
    })
    expect(xml).toContain("<Kundenname>Müller &amp; &lt;Söhne&gt;</Kundenname>")
    expect(xml).toContain("<Mailingsperre>true</Mailingsperre>")
    expect(xml).toContain("<ShippingCost>4.9</ShippingCost>")
    expect(xml).toContain("<OrderCompletedDate>2026-11-03T09:05:07</OrderCompletedDate>")
    expect(xml).not.toContain("<Comment")
    expect(xml.match(/<OrderItemsObj>/g)).toHaveLength(2)
  })
})

describe("parseSoapResponse", () => {
  it("normalizes repeated and single records to arrays and keeps values as strings", () => {
    const many = parseSoapResponse(
      "DownloadStockColorSizeBranchDelta",
      envelope(`<DownloadStockColorSizeBranchDeltaResponse xmlns="http://tempuri.org/">
        <DownloadStockColorSizeBranchDeltaResult>${stockRecord("a", "2.5")}${stockRecord("b", "0")}</DownloadStockColorSizeBranchDeltaResult>
      </DownloadStockColorSizeBranchDeltaResponse>`)
    )
    const list = extractList(many, "StockColorSizeBranch")
    expect(list).toHaveLength(2)
    expect(list[0].MengeVerfuegbar).toBe("2.5")
    expect(list[0].Artikelnummer).toBe("0012")
    expect(list[1].Filialname).toBe("Osnabrück")

    const one = parseSoapResponse(
      "DownloadStockColorSizeBranch",
      envelope(`<DownloadStockColorSizeBranchResponse xmlns="http://tempuri.org/">
        <DownloadStockColorSizeBranchResult>${stockRecord("a", "1")}</DownloadStockColorSizeBranchResult>
      </DownloadStockColorSizeBranchResponse>`)
    )
    expect(extractList(one, "StockColorSizeBranch")).toHaveLength(1)
  })

  it("treats an empty result element as an empty list", () => {
    const result = parseSoapResponse(
      "DownloadStockBranchDelta",
      envelope(`<DownloadStockBranchDeltaResponse xmlns="http://tempuri.org/"><DownloadStockBranchDeltaResult/></DownloadStockBranchDeltaResponse>`)
    )
    expect(extractList(result, "StockBranch")).toEqual([])
  })

  it("parses single-record and boolean results", () => {
    const state = parseSoapResponse(
      "DownloadOrderStateByOrder",
      envelope(`<DownloadOrderStateByOrderResponse xmlns="http://tempuri.org/"><DownloadOrderStateByOrderResult><WebShopOrderID>7</WebShopOrderID><OrderState>Neu</OrderState></DownloadOrderStateByOrderResult></DownloadOrderStateByOrderResponse>`)
    )
    expect(extractRecord(state)).toEqual({ WebShopOrderID: "7", OrderState: "Neu" })

    const ok = parseSoapResponse(
      "UploadOrder",
      envelope(`<UploadOrderResponse xmlns="http://tempuri.org/"><UploadOrderResult>true</UploadOrderResult></UploadOrderResponse>`)
    )
    expect(extractBoolean(ok)).toBe(true)
  })

  it("throws a typed fault error", () => {
    const xml = envelope(`<soap:Fault><faultcode>soap:Client</faultcode><faultstring>WebShopOrderID 5 already exists</faultstring></soap:Fault>`)
    let error: unknown
    try {
      parseSoapResponse("UploadOrder", xml, 500)
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(TridataSoapFaultError)
    expect((error as TridataSoapFaultError).faultCode).toBe("soap:Client")
    expect((error as TridataSoapFaultError).faultString).toBe(
      "WebShopOrderID 5 already exists"
    )
    expect((error as TridataSoapFaultError).httpStatus).toBe(500)
  })

  it("does not expand DTD entities (XXE) and rejects DOCTYPE responses", () => {
    const xxe = `<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> <!ENTITY big "EXPANDED"> ]>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
<UploadOrderResponse xmlns="http://tempuri.org/"><UploadOrderResult>&xxe;&big;</UploadOrderResult></UploadOrderResponse>
</soap:Body></soap:Envelope>`
    expect(() => parseSoapResponse("UploadOrder", xxe)).toThrow(TridataResponseError)
  })

  it("leaves unknown entity references undecoded", () => {
    const result = parseSoapResponse(
      "DownloadOrderStateByOrder",
      envelope(`<DownloadOrderStateByOrderResponse xmlns="http://tempuri.org/"><DownloadOrderStateByOrderResult><OrderState>&foo;&amp;</OrderState></DownloadOrderStateByOrderResult></DownloadOrderStateByOrderResponse>`)
    )
    expect(extractRecord(result).OrderState).toBe("&foo;&")
  })

  it("rejects non-envelope responses", () => {
    expect(() => parseSoapResponse("UploadOrder", "<html></html>")).toThrow(
      TridataResponseError
    )
  })
})

describe("dateTime helpers", () => {
  it("formats and parses TriCon dateTimes as UTC", () => {
    const d = new Date(Date.UTC(2026, 10, 3, 10, 0, 0))
    expect(formatTridataDateTime(d)).toBe("2026-11-03T10:00:00")
    expect(parseTridataDateTime("2026-11-03T10:00:00")?.toISOString()).toBe(
      "2026-11-03T10:00:00.000Z"
    )
    expect(parseTridataDateTime("")).toBeNull()
  })
})

describe("soapCall transport", () => {
  const fakeFetch = (status: number, body: string) =>
    (async () =>
      ({ status, text: async () => body }) as unknown as Response) as unknown as typeof fetch

  it("maps a SOAP fault on HTTP 500 to TridataSoapFaultError", async () => {
    await expect(
      soapCall({
        endpointUrl: "http://x/soap",
        functionName: "UploadOrder",
        params: {},
        fetchImpl: fakeFetch(
          500,
          envelope(`<soap:Fault><faultcode>soap:Server</faultcode><faultstring>Injected failure</faultstring></soap:Fault>`)
        ),
      })
    ).rejects.toBeInstanceOf(TridataSoapFaultError)
  })

  it("maps a non-SOAP HTTP error to TridataTransportError", async () => {
    await expect(
      soapCall({
        endpointUrl: "http://x/soap",
        functionName: "UploadOrder",
        params: {},
        fetchImpl: fakeFetch(502, "Bad gateway"),
      })
    ).rejects.toBeInstanceOf(TridataTransportError)
  })

  it("times out", async () => {
    const hanging = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("aborted")
          err.name = "AbortError"
          reject(err)
        })
      })) as unknown as typeof fetch
    await expect(
      soapCall({
        endpointUrl: "http://x/soap",
        functionName: "UploadOrder",
        params: {},
        timeoutMs: 20,
        fetchImpl: hanging,
      })
    ).rejects.toThrow(/timed out/)
  })
})

describe("TridataClient", () => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

  it("sends the GUID but never logs it, and returns the logged correlation id", async () => {
    let sentBody = ""
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sentBody = String(init.body)
      return {
        status: 200,
        text: async () =>
          envelope(`<DownloadOrderStateByOrderResponse xmlns="http://tempuri.org/"><DownloadOrderStateByOrderResult><WebShopOrderID>9</WebShopOrderID><OrderState>Geliefert</OrderState></DownloadOrderStateByOrderResult></DownloadOrderStateByOrderResponse>`),
      } as unknown as Response
    }) as unknown as typeof fetch
    const client = new TridataClient(logger as never, {
      endpointUrl: "http://localhost:3001/soap",
      identifyGuid: "secret-guid-1234",
      namespace: "http://tempuri.org/",
      timeoutMs: 1000,
      fetchImpl,
    })
    const res = await client.downloadOrderStateByOrder(9)
    expect(res.data).toEqual({ WebShopOrderID: 9, OrderState: "Geliefert" })
    expect(sentBody).toContain("<IdentifyGuid>secret-guid-1234</IdentifyGuid>")
    expect(sentBody).toContain("<WebshopOrderID>9</WebshopOrderID>")
    const logged = logger.info.mock.calls.map((c) => String(c[0])).join("\n")
    expect(logged).not.toContain("secret-guid-1234")
    expect(logged).toContain(res.correlationId)
  })
})

describe("strict stock quantities", () => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const clientFor = (body: string) =>
    new TridataClient(logger as never, {
      endpointUrl: "http://localhost:3001/soap",
      identifyGuid: "g",
      namespace: "http://tempuri.org/",
      timeoutMs: 1000,
      fetchImpl: (async () =>
        ({ status: 200, text: async () => body }) as unknown as Response) as unknown as typeof fetch,
    })

  it("fails the call when MengeVerfuegbar is missing instead of reading 0", async () => {
    const body = envelope(`<DownloadStockBranchResponse xmlns="http://tempuri.org/"><DownloadStockBranchResult>
      <StockBranch><StockBranchID>s1</StockBranchID><ArtikelID>a</ArtikelID><Lagerbestand>3</Lagerbestand><Reserviert>0</Reserviert><Bestellt>0</Bestellt><Filialname>Oldenburg</Filialname></StockBranch>
    </DownloadStockBranchResult></DownloadStockBranchResponse>`)
    await expect(clientFor(body).downloadStockBranch()).rejects.toThrow(
      /StockBranch s1: field MengeVerfuegbar is missing/
    )
  })

  it("fails on a non-numeric quantity", async () => {
    const body = envelope(`<DownloadStockBranchResponse xmlns="http://tempuri.org/"><DownloadStockBranchResult>
      <StockBranch><StockBranchID>s1</StockBranchID><Lagerbestand>x</Lagerbestand><Reserviert>0</Reserviert><Bestellt>0</Bestellt><MengeVerfuegbar>1</MengeVerfuegbar></StockBranch>
    </DownloadStockBranchResult></DownloadStockBranchResponse>`)
    await expect(clientFor(body).downloadStockBranch()).rejects.toThrow(/Lagerbestand is not a number/)
  })
})

describe("readBodyCapped", () => {
  it("aborts a streamed body above the limit", async () => {
    const big = new Response(new Uint8Array(2048))
    await expect(readBodyCapped(big, 1024)).rejects.toBeInstanceOf(TridataTransportError)
  })

  it("rejects early on a too-large content-length", async () => {
    const res = new Response("x", { headers: { "content-length": "999999" } })
    await expect(readBodyCapped(res, 1024)).rejects.toThrow(/exceeds/)
  })

  it("returns the text under the limit", async () => {
    await expect(readBodyCapped(new Response("hällo"), 1024)).resolves.toBe("hällo")
  })
})

describe("scrubError", () => {
  it("masks emails, phone numbers and the configured GUID", () => {
    process.env.TRIDATA_IDENTIFY_GUID = "secret-guid-1234"
    const out = scrubError(
      "bad customer erika@example.com tel 015775004744 / +49 441 1234567 guid secret-guid-1234 order 1000042 at 2026-11-03T10:00:00"
    )
    delete process.env.TRIDATA_IDENTIFY_GUID
    expect(out).not.toContain("erika@example.com")
    expect(out).not.toContain("015775004744")
    expect(out).not.toContain("441 1234567")
    expect(out).not.toContain("secret-guid-1234")
    // Order numbers and timestamps stay readable.
    expect(out).toContain("1000042")
    expect(out).toContain("2026-11-03T10:00:00")
  })
})

describe("production safety", () => {
  const base = { TRIDATA_IDENTIFY_GUID: "real-guid" } as NodeJS.ProcessEnv

  it("accepts http and the mock GUID outside production", () => {
    const config = getTridataConfig({
      TRIDATA_ENDPOINT_URL: "http://localhost:3001/soap",
      TRIDATA_IDENTIFY_GUID: MOCK_IDENTIFY_GUID,
    } as NodeJS.ProcessEnv)
    expect(isTridataConfigured(config)).toBe(true)
  })

  it("refuses the mock GUID or a non-https endpoint in production", () => {
    const mockGuid = getTridataConfig({
      NODE_ENV: "production",
      TRIDATA_ENDPOINT_URL: "https://tricon.example/soap",
      TRIDATA_IDENTIFY_GUID: MOCK_IDENTIFY_GUID,
    } as NodeJS.ProcessEnv)
    expect(isTridataConfigured(mockGuid)).toBe(false)
    expect(mockGuid.unsafeReason).toMatch(/mock default GUID/)

    const http = getTridataConfig({
      ...base,
      NODE_ENV: "production",
      TRIDATA_ENDPOINT_URL: "http://tricon.example/soap",
    } as NodeJS.ProcessEnv)
    expect(isTridataConfigured(http)).toBe(false)

    const https = getTridataConfig({
      ...base,
      NODE_ENV: "production",
      TRIDATA_ENDPOINT_URL: "https://tricon.example/soap",
    } as NodeJS.ProcessEnv)
    expect(isTridataConfigured(https)).toBe(true)
  })

  it("allows the test server override", () => {
    const config = getTridataConfig({
      NODE_ENV: "production",
      TRIDATA_ALLOW_INSECURE_ENDPOINT: "true",
      TRIDATA_ENDPOINT_URL: "http://127.0.0.1:3001/soap",
      TRIDATA_IDENTIFY_GUID: MOCK_IDENTIFY_GUID,
    } as NodeJS.ProcessEnv)
    expect(isTridataConfigured(config)).toBe(true)
  })

  it("parses offset, phone opt-in and retention with safe defaults", () => {
    expect(getTridataConfig({} as NodeJS.ProcessEnv)).toMatchObject({
      orderIdOffset: 0,
      sendPhone: false,
      syncLogRetentionDays: 30,
    })
    expect(
      getTridataConfig({
        TRIDATA_ORDER_ID_OFFSET: "1000000",
        TRIDATA_SEND_PHONE: "true",
        TRIDATA_SYNC_LOG_RETENTION_DAYS: "7",
      } as NodeJS.ProcessEnv)
    ).toMatchObject({ orderIdOffset: 1000000, sendPhone: true, syncLogRetentionDays: 7 })
    expect(getTridataConfig({ TRIDATA_ORDER_ID_OFFSET: "-5" } as NodeJS.ProcessEnv).orderIdOffset).toBe(0)
  })
})

describe("integration logger error output", () => {
  it("logs fault code and a scrubbed message only", async () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    const log = createIntegrationLogger(logger as never, "tridata")
    await expect(
      log.call("UploadOrder", {}, async () => {
        throw new TridataSoapFaultError("soap:Client", "Customer erika@example.com 0441 1234567 invalid")
      })
    ).rejects.toBeInstanceOf(TridataSoapFaultError)
    const line = String(logger.error.mock.calls[0][0])
    expect(line).toContain("soap:Client")
    expect(line).toMatch(/correlationId=tridata-/)
    expect(line).not.toContain("erika@example.com")
    expect(line).not.toContain("1234567")
  })
})
