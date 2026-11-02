import assert from "node:assert/strict"
import { mkdtempSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, describe, it } from "node:test"
import { XMLParser } from "fast-xml-parser"
import { buildApp } from "../src/app.ts"
import { DEFAULT_CATALOG_PATH } from "../src/paths.ts"
import {
  ARTIKEL_FIELDS,
  GRFA_KOMBI_FIELDS,
  ORDER_STATE_FIELDS,
  STOCK_BRANCH_FIELDS,
  STOCK_BY_ARTIKEL_FIELDS,
  STOCK_COLOR_SIZE_BRANCH_FIELDS,
  type FieldList,
} from "../src/reference-fields.ts"
import { deterministicGuid, ean13CheckDigit } from "../src/seed-data.ts"
import { startupProblems } from "../src/startup-checks.ts"
import { formatDateTime } from "../src/state.ts"
import { parseEnvelope } from "../src/xml.ts"

const GUID = "00000000-0000-0000-0000-000000000001"
const tmpRoot = mkdtempSync(path.join(tmpdir(), "tricon-mock-test-"))
let counter = 0
// light-my-request sends `Host: localhost:80` by default.
const ALLOWED_HOSTS = ["localhost:80"]
const ORIGIN = { origin: "http://localhost" }

const responseParser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  processEntities: false,
  isArray: (_name, jpath) =>
    /Result\.(Artikel|ArtikelGrFaKombi|StockBranch|StockColorSizeBranch)$/.test(jpath),
})

function freshApp() {
  counter++
  return buildApp({
    statePath: path.join(tmpRoot, `state-${counter}.json`),
    catalogPath: DEFAULT_CATALOG_PATH,
    allowedHosts: ALLOWED_HOSTS,
    sleep: async () => {},
  })
}

function envelopeFor(fn: string, inner: string, guid = GUID) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${fn} xmlns="http://tempuri.org/">
      <IdentifyGuid>${guid}</IdentifyGuid>
      ${inner}
    </${fn}>
  </soap:Body>
</soap:Envelope>`
}

type App = ReturnType<typeof freshApp>

async function call(ctx: App, fn: string, inner = "", guid = GUID) {
  const res = await ctx.app.inject({
    method: "POST",
    url: "/soap",
    headers: { "content-type": "text/xml; charset=utf-8", soapaction: `"http://tempuri.org/${fn}"` },
    payload: envelopeFor(fn, inner, guid),
  })
  const doc = responseParser.parse(res.body)
  const body = doc.Envelope.Body
  return { status: res.statusCode, raw: res.body, body, result: body[`${fn}Response`]?.[`${fn}Result`] }
}

function recordsOf(result: unknown, name: string): Record<string, string>[] {
  if (result === "" || result === undefined) {
    return []
  }
  return ((result as Record<string, unknown>)[name] ?? []) as Record<string, string>[]
}

function assertShape(record: Record<string, string>, fields: FieldList) {
  assert.deepEqual(Object.keys(record), fields.map(([name]) => name))
}

function orderXml(id: number, extraItems = "") {
  return `<TO>
  <Customer>
    <Kundenname>Erika Mustermann &amp; Co</Kundenname>
    <UserID>erika@example.com</UserID>
    <Email>erika@example.com</Email>
    <Mehrwertsteuercode>Inland</Mehrwertsteuercode>
    <Mailingsperre>true</Mailingsperre>
    <Strasse>Teststr. 1</Strasse><Ort>Oldenburg</Ort><Land>DE</Land><Postleitzahl>26122</Postleitzahl>
    <IsOneTimeCustomer>true</IsOneTimeCustomer>
  </Customer>
  <Order>
    <WebShopOrderID>${id}</WebShopOrderID>
    <Payment>SumUp</Payment>
    <Bezahlt>false</Bezahlt>
    <OrderCompletedDate>2026-11-03T10:00:00</OrderCompletedDate>
    <ShippingCost>0.00</ShippingCost>
    <DeliveryTerm>Abholung</DeliveryTerm>
    <Filialname>Oldenburg</Filialname>
    <Comment>&lt;script&gt;alert(1)&lt;/script&gt;</Comment>
  </Order>
  <OrderItemsList>
    <OrderItemsObj>
      <Positionsnummer>1</Positionsnummer>
      <WebshopArtikelnummer>MICHE-WHEELSET-STD</WebshopArtikelnummer>
      <Bezeichnung>Miche Wheelset</Bezeichnung>
      <VKBrutto>400.00</VKBrutto><SummeVKBrutto>400.00</SummeVKBrutto><Quantity>1</Quantity>
    </OrderItemsObj>
    ${extraItems}
  </OrderItemsList>
</TO>`
}

after(() => rmSync(tmpRoot, { recursive: true, force: true }))

describe("envelope parsing", () => {
  it("returns the Body's first child and its params, with prefixes stripped", () => {
    const parsed = parseEnvelope(`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><t:DownloadArtikel xmlns:t="http://tempuri.org/"><t:IdentifyGuid>abc</t:IdentifyGuid><t:LastChange>2026-01-01T00:00:00</t:LastChange></t:DownloadArtikel></s:Body></s:Envelope>`)
    assert.equal(parsed.version, "1.1")
    assert.equal(parsed.operation, "DownloadArtikel")
    assert.equal(parsed.body.IdentifyGuid, "abc")
    assert.equal(parsed.body.LastChange, "2026-01-01T00:00:00")
  })

  it("decodes standard XML entities", () => {
    const parsed = parseEnvelope(envelopeFor("X", "<A>M&amp;M &lt;b&gt; &#252;</A>"))
    assert.equal(parsed.body.A, "M&M <b> ü")
  })

  it("accepts SOAP 1.2 with application/soap+xml", async () => {
    const ctx = freshApp()
    const res = await ctx.app.inject({
      method: "POST",
      url: "/soap",
      headers: { "content-type": "application/soap+xml; charset=utf-8" },
      payload: `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><DownloadGrFaKombi xmlns="http://tempuri.org/"><IdentifyGuid>${GUID}</IdentifyGuid></DownloadGrFaKombi></soap:Body></soap:Envelope>`,
    })
    assert.equal(res.statusCode, 200)
    assert.match(res.headers["content-type"] as string, /application\/soap\+xml/)
    assert.match(res.body, /<DownloadGrFaKombiResult>/)
  })

  it("serves a WSDL", async () => {
    const ctx = freshApp()
    const res = await ctx.app.inject({ method: "GET", url: "/soap?wsdl" })
    assert.equal(res.statusCode, 200)
    assert.match(res.body, /wsdl:definitions/)
    assert.match(res.body, /name="DownloadStockColorSizeBranchDelta"/)
  })
})

describe("faults", () => {
  it("rejects a wrong IdentifyGuid", async () => {
    const ctx = freshApp()
    const res = await call(ctx, "DownloadArtikelAll", "", "11111111-1111-1111-1111-111111111111")
    assert.equal(res.status, 500)
    assert.equal(res.body.Fault.faultcode, "soap:Client")
    assert.equal(res.body.Fault.faultstring, "Invalid IdentifyGuid")
    const log = ctx.store.state.requestLog.at(-1)
    assert.equal(log?.guidOk, false)
    assert.equal(log?.httpStatus, 500)
  })

  it("rejects a missing IdentifyGuid", async () => {
    const ctx = freshApp()
    const res = await call(ctx, "DownloadArtikelAll", "", "")
    assert.equal(res.body.Fault.faultstring, "Invalid IdentifyGuid")
  })

  it("returns NotImplementedInMock for unmocked functions", async () => {
    const ctx = freshApp()
    const res = await call(ctx, "DownloadRechnungen")
    assert.equal(res.status, 500)
    assert.equal(res.body.Fault.faultstring, "NotImplementedInMock: DownloadRechnungen")
  })

  it("injects failures and delays as configured", async () => {
    const ctx = freshApp()
    ctx.store.state.settings.failNextN = 2
    assert.equal((await call(ctx, "DownloadGrFaKombi")).body.Fault.faultcode, "soap:Server")
    assert.equal((await call(ctx, "DownloadGrFaKombi")).body.Fault.faultstring, "Injected failure")
    assert.equal((await call(ctx, "DownloadGrFaKombi")).status, 200)
  })

  it("does not expand external entities (XXE)", async () => {
    const ctx = freshApp()
    const payload = `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
<DownloadStockByArtikel xmlns="http://tempuri.org/"><IdentifyGuid>${GUID}</IdentifyGuid><Artikelnummer>&xxe;</Artikelnummer></DownloadStockByArtikel>
</soap:Body></soap:Envelope>`
    const res = await ctx.app.inject({ method: "POST", url: "/soap", headers: { "content-type": "text/xml" }, payload })
    assert.equal(res.statusCode, 500)
    assert.doesNotMatch(res.body, /root:/)
    assert.match(res.body, /DTD is not allowed/)
  })

  it("leaves undeclared entity references unexpanded", () => {
    const parsed = parseEnvelope(envelopeFor("X", "<A>&xxe;</A>"))
    assert.equal(parsed.body.A, "&xxe;")
  })
})

describe("download functions", () => {
  it("DownloadArtikelAll returns every reference Artikel field", async () => {
    const ctx = freshApp()
    const res = await call(ctx, "DownloadArtikelAll")
    const records = recordsOf(res.result, "Artikel")
    assert.equal(records.length, 7)
    for (const r of records) {
      assertShape(r, ARTIKEL_FIELDS)
    }
    const miche = records.find((r) => r.ArtikelNummer === "MICHE-WHEELSET")
    assert.ok(miche)
    assert.equal(miche.GrFa, "false")
    assert.equal(miche.Matchcode, "MICHE-WHEELSET-STD")
    assert.equal(miche.I_VKbrutto, "400.00")
    assert.equal(miche.I_VKnetto, "336.13")
    assert.equal(miche.MehrwertSteuerSatz, "19")
    assert.equal(miche.I_IstOnlineAktiv, "true")
    assert.equal(miche.ArtikelID, deterministicGuid("artikel:miche-wheelset"))
  })

  it("DownloadArtikelAll skips offline items", async () => {
    const ctx = freshApp()
    ctx.store.state.artikel[0].I_IstOnlineAktiv = false
    const records = recordsOf((await call(ctx, "DownloadArtikelAll")).result, "Artikel")
    assert.equal(records.length, 6)
  })

  it("DownloadGrFaKombi returns Kombis with SKU as Artikelnummer and valid EANs", async () => {
    const ctx = freshApp()
    const records = recordsOf((await call(ctx, "DownloadGrFaKombi")).result, "ArtikelGrFaKombi")
    assert.equal(records.length, 60)
    for (const r of records) {
      assertShape(r, GRFA_KOMBI_FIELDS)
      assert.match(r.EAN, /^\d{13}$/)
      assert.equal(Number(r.EAN[12]), ean13CheckDigit(r.EAN.slice(0, 12)))
    }
    const kombi = records.find((r) => r.Artikelnummer === "CERVELO-ASPERO5-L-BLK")
    assert.equal(kombi?.FarbeBezeichnung, "Schwarz")
    assert.equal(kombi?.GroesseBezeichnung, "L")
  })

  it("DownloadStockBranch returns non-GrFa items x branches", async () => {
    const ctx = freshApp()
    const records = recordsOf((await call(ctx, "DownloadStockBranch")).result, "StockBranch")
    assert.equal(records.length, 4)
    for (const r of records) {
      assertShape(r, STOCK_BRANCH_FIELDS)
    }
    assert.deepEqual(new Set(records.map((r) => r.Filialname)), new Set(["Oldenburg", "Osnabrück"]))
  })

  it("DownloadStockColorSizeBranch returns Kombis x branches", async () => {
    const ctx = freshApp()
    const records = recordsOf((await call(ctx, "DownloadStockColorSizeBranch")).result, "StockColorSizeBranch")
    assert.equal(records.length, 120)
    for (const r of records) {
      assertShape(r, STOCK_COLOR_SIZE_BRANCH_FIELDS)
      assert.equal(Number(r.MengeVerfuegbar), Math.max(0, Number(r.Lagerbestand) - Number(r.Reserviert)))
    }
  })

  it("DownloadStockByArtikel sums over branches for a Kombi SKU", async () => {
    const ctx = freshApp()
    const res = await call(ctx, "DownloadStockByArtikel", "<Artikelnummer>CERVELO-ASPERO5-L-BLK</Artikelnummer>")
    const record = res.result as Record<string, string>
    assertShape(record, STOCK_BY_ARTIKEL_FIELDS)
    const kombiId = deterministicGuid("kombi:CERVELO-ASPERO5-L-BLK")
    const rows = ctx.store.state.stockColorSizeBranch.filter((r) => r.ArtikelGrFaKombinationenID === kombiId)
    const total = rows.reduce((s, r) => s + Math.max(0, r.Lagerbestand - r.Reserviert), 0)
    assert.equal(Number(record.MengeVerfuegbarGesamt), total)
    const local = rows.find((r) => r.Filialname === "Oldenburg")!
    assert.equal(Number(record.LagerbestandLokaleFiliale), local.Lagerbestand)
  })

  it("DownloadStockByArtikel faults on unknown Artikelnummer", async () => {
    const ctx = freshApp()
    const res = await call(ctx, "DownloadStockByArtikel", "<Artikelnummer>NOPE</Artikelnummer>")
    assert.equal(res.body.Fault.faultstring, "Artikel NOPE not found")
  })
})

describe("delta filtering", () => {
  it("returns only rows changed since LastChange", async () => {
    const ctx = freshApp()
    const old = "2000-01-01T00:00:00"
    for (const r of ctx.store.state.stockColorSizeBranch) {
      r.LastChange = old
    }
    for (const a of ctx.store.state.artikel) {
      a.LastChange = old
    }
    for (const r of ctx.store.state.stockBranch) {
      r.LastChange = old
    }
    const since = formatDateTime(new Date(Date.now() - 1000))

    const empty = await call(ctx, "DownloadStockColorSizeBranchDelta", `<LastChange>${since}</LastChange>`)
    assert.equal(empty.status, 200)
    assert.match(empty.raw, /<DownloadStockColorSizeBranchDeltaResult \/>/)

    const row = ctx.store.state.stockColorSizeBranch[3]
    const res = await ctx.app.inject({
      method: "POST",
      url: `/api/stock/${row.StockColorSizeBranchID}`,
      headers: ORIGIN,
      payload: { action: "onorder" },
    })
    assert.equal(res.statusCode, 200)

    const delta = recordsOf(
      (await call(ctx, "DownloadStockColorSizeBranchDelta", `<LastChange>${since}</LastChange>`)).result,
      "StockColorSizeBranch"
    )
    assert.equal(delta.length, 1)
    assert.equal(delta[0].StockColorSizeBranchID, row.StockColorSizeBranchID)
    assert.equal(delta[0].Lagerbestand, "0")
    assert.equal(delta[0].Bestellt, "2")
    assert.equal(delta[0].MengeVerfuegbar, "0")

    assert.equal(recordsOf((await call(ctx, "DownloadStockBranchDelta", `<LastChange>${since}</LastChange>`)).result, "StockBranch").length, 0)

    const artikel = ctx.store.state.artikel[1]
    await ctx.app.inject({ method: "POST", url: `/api/items/${artikel.ArtikelID}`, headers: ORIGIN, payload: { I_VKbrutto: 1234.5, I_IstOnlineAktiv: false } })
    const items = recordsOf((await call(ctx, "DownloadArtikel", `<LastChange>${since}</LastChange>`)).result, "Artikel")
    assert.equal(items.length, 1)
    assert.equal(items[0].I_VKbrutto, "1234.50")
    assert.equal(items[0].I_IstOnlineAktiv, "false")
  })

  it("honours the MengeVerfuegbar override", async () => {
    const ctx = freshApp()
    const row = ctx.store.state.stockBranch[0]
    await ctx.app.inject({ method: "POST", url: `/api/stock/${row.StockBranchID}`, headers: ORIGIN, payload: { Lagerbestand: 5, Reserviert: 1, MengeVerfuegbarOverride: 2 } })
    const records = recordsOf((await call(ctx, "DownloadStockBranch")).result, "StockBranch")
    const rec = records.find((r) => r.StockBranchID === row.StockBranchID)
    assert.equal(rec?.MengeVerfuegbar, "2")
    await ctx.app.inject({ method: "POST", url: `/api/stock/${row.StockBranchID}`, headers: ORIGIN, payload: { MengeVerfuegbarOverride: "" } })
    assert.equal(ctx.store.state.stockBranch[0].MengeVerfuegbarOverride, null)
  })
})

describe("orders", () => {
  it("UploadOrder then DownloadOrderStateByOrder returns Neu", async () => {
    const ctx = freshApp()
    const up = await call(ctx, "UploadOrder", orderXml(1001))
    assert.equal(up.status, 200)
    assert.equal(up.result, "true")
    const order = ctx.store.findOrder(1001)
    assert.ok(order)
    assert.equal(order.customer.Kundenname, "Erika Mustermann & Co")
    assert.equal(order.items.length, 1)
    assert.equal(order.items[0].Positionsnummer, "1")
    assert.equal(order.header.Filialname, "Oldenburg")

    const state = await call(ctx, "DownloadOrderStateByOrder", "<WebshopOrderID>1001</WebshopOrderID>")
    assertShape(state.result as Record<string, string>, ORDER_STATE_FIELDS)
    assert.equal((state.result as Record<string, string>).OrderState, "Neu")
    assert.equal((state.result as Record<string, string>).WebShopOrderID, "1001")
  })

  it("rejects a duplicate WebShopOrderID", async () => {
    const ctx = freshApp()
    await call(ctx, "UploadOrder", orderXml(1002))
    const dup = await call(ctx, "UploadOrder", orderXml(1002))
    assert.equal(dup.status, 500)
    assert.equal(dup.body.Fault.faultstring, "WebShopOrderID 1002 already exists")
  })

  it("UploadOrderChangeStorno sets StorniertExtern", async () => {
    const ctx = freshApp()
    await call(ctx, "UploadOrder", orderXml(1003))
    const res = await call(ctx, "UploadOrderChangeStorno", "<WebShopOrderID>1003</WebShopOrderID>")
    assert.equal(res.result, "true")
    const state = await call(ctx, "DownloadOrderStateByOrder", "<WebshopOrderID>1003</WebshopOrderID>")
    assert.equal((state.result as Record<string, string>).OrderState, "StorniertExtern")
  })

  it("UploadOrderChangeBezahlt sets the paid flag", async () => {
    const ctx = freshApp()
    await call(ctx, "UploadOrder", orderXml(1004))
    const res = await call(ctx, "UploadOrderChangeBezahlt", "<Auftragsnummer>1004</Auftragsnummer><Bezahlt>true</Bezahlt><AusgeglichenAm>2026-11-03T10:05:00</AusgeglichenAm>")
    assert.equal(res.result, "true")
    const order = ctx.store.findOrder(1004)
    assert.equal(order?.paid, true)
    assert.equal(order?.ausgeglichenAm, "2026-11-03T10:05:00")
  })

  it("faults for unknown orders", async () => {
    const ctx = freshApp()
    const res = await call(ctx, "DownloadOrderStateByOrder", "<WebshopOrderID>9999</WebshopOrderID>")
    assert.equal(res.body.Fault.faultstring, "Order 9999 not found")
  })

  it("UI state change is reflected and HTML escapes customer data", async () => {
    const ctx = freshApp()
    await call(ctx, "UploadOrder", orderXml(1005))
    const set = await ctx.app.inject({ method: "POST", url: "/api/orders/1005/state", headers: ORIGIN, payload: { state: "InBearbeitung" } })
    assert.equal(set.statusCode, 200)
    const state = await call(ctx, "DownloadOrderStateByOrder", "<WebshopOrderID>1005</WebshopOrderID>")
    assert.equal((state.result as Record<string, string>).OrderState, "InBearbeitung")
    const page = await ctx.app.inject({ method: "GET", url: "/orders/1005" })
    assert.doesNotMatch(page.body, /<script>alert/)
    assert.match(page.body, /&lt;script&gt;alert/)
  })
})

describe("persistence and auth", () => {
  it("reopening keeps state and GUIDs are stable across reseeds", async () => {
    const ctx = freshApp()
    await call(ctx, "UploadOrder", orderXml(2001))
    const reopened = buildApp({ statePath: ctx.store.filePath, catalogPath: DEFAULT_CATALOG_PATH, allowedHosts: ALLOWED_HOSTS })
    assert.ok(reopened.store.findOrder(2001))
    const ids = ctx.store.state.grfaKombi.map((k) => k.ArtikelGrFaKombiID)
    await ctx.app.inject({ method: "POST", url: "/api/reset", headers: ORIGIN, payload: {} })
    assert.equal(ctx.store.state.orders.length, 0)
    assert.deepEqual(ctx.store.state.grfaKombi.map((k) => k.ArtikelGrFaKombiID), ids)
  })

  it("requires basic auth for UI/API but not /soap and /health", async () => {
    const { app } = buildApp({
      statePath: path.join(tmpRoot, "auth.json"),
      catalogPath: DEFAULT_CATALOG_PATH,
      allowedHosts: ALLOWED_HOSTS,
      uiUser: "dev",
      uiPassword: "secret",
    })
    assert.equal((await app.inject({ method: "GET", url: "/" })).statusCode, 401)
    assert.equal((await app.inject({ method: "GET", url: "/api/items" })).statusCode, 401)
    const auth = `Basic ${Buffer.from("dev:secret").toString("base64")}`
    assert.equal((await app.inject({ method: "GET", url: "/api/items", headers: { authorization: auth } })).statusCode, 200)
    assert.equal((await app.inject({ method: "GET", url: "/health" })).statusCode, 200)
    const soap = await app.inject({ method: "POST", url: "/soap", headers: { "content-type": "text/xml" }, payload: envelopeFor("DownloadGrFaKombi", "") })
    assert.equal(soap.statusCode, 200)
  })

  it("renders every UI page", async () => {
    const ctx = freshApp()
    await call(ctx, "UploadOrder", orderXml(3001))
    for (const url of ["/", "/items", "/stock?q=schwarz", "/orders", "/orders/3001", "/requests?fn=UploadOrder"]) {
      const res = await ctx.app.inject({ method: "GET", url })
      assert.equal(res.statusCode, 200, url)
      assert.match(res.headers["content-type"] as string, /text\/html/)
    }
  })
})

describe("csrf, origin and host checks", () => {
  function tokenFrom(html: string) {
    const match = /name="csrf" value="([0-9a-f]+)"/.exec(html)
    assert.ok(match, "form carries a csrf token")
    return match[1]
  }

  const form = { "content-type": "application/x-www-form-urlencoded" }

  it("accepts a form post with a valid token and redirects back", async () => {
    const ctx = freshApp()
    const token = tokenFrom((await ctx.app.inject({ method: "GET", url: "/stock" })).body)
    const row = ctx.store.state.stockBranch[0]
    const res = await ctx.app.inject({
      method: "POST",
      url: `/api/stock/${row.StockBranchID}`,
      headers: { ...form, ...ORIGIN },
      payload: `action=set0&csrf=${token}&redirect=%2Fstock%3Fq%3Dmiche`,
    })
    assert.equal(res.statusCode, 303)
    assert.equal(res.headers.location, "/stock?q=miche")
    assert.equal(ctx.store.state.stockBranch[0].Lagerbestand, 0)

    const open = await ctx.app.inject({
      method: "POST",
      url: `/api/stock/${row.StockBranchID}`,
      headers: { ...form, ...ORIGIN },
      payload: `action=set0&csrf=${token}&redirect=%2F%2Fevil.example`,
    })
    assert.equal(open.headers.location, "/stock")
  })

  it("accepts Referer when Origin is absent", async () => {
    const ctx = freshApp()
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/settings",
      headers: { referer: "http://localhost/" },
      payload: { delayMs: 5 },
    })
    assert.equal(res.statusCode, 200)
  })

  it("rejects form posts with a missing or wrong token", async () => {
    const ctx = freshApp()
    for (const payload of ["", "csrf=deadbeef"]) {
      const res = await ctx.app.inject({ method: "POST", url: "/api/reset", headers: { ...form, ...ORIGIN }, payload })
      assert.equal(res.statusCode, 403)
    }
    const plain = await ctx.app.inject({ method: "POST", url: "/api/reset", headers: { "content-type": "text/plain", ...ORIGIN }, payload: "x" })
    assert.equal(plain.statusCode, 403)
  })

  it("rejects Origin: null, missing origin and foreign origins", async () => {
    const ctx = freshApp()
    const token = tokenFrom((await ctx.app.inject({ method: "GET", url: "/" })).body)
    for (const headers of [{ origin: "null" }, {}, { origin: "https://evil.example" }, { referer: "https://evil.example/x" }]) {
      const res = await ctx.app.inject({ method: "POST", url: "/api/reset", headers: { ...form, ...headers }, payload: `csrf=${token}` })
      assert.equal(res.statusCode, 403, JSON.stringify(headers))
    }
  })

  it("rejects a foreign Host header (DNS rebinding) but not on /soap and /health", async () => {
    const ctx = freshApp()
    const evil = { host: "rebind.evil.example" }
    assert.equal((await ctx.app.inject({ method: "GET", url: "/", headers: evil })).statusCode, 421)
    assert.equal((await ctx.app.inject({ method: "GET", url: "/api/orders", headers: evil })).statusCode, 421)
    assert.equal((await ctx.app.inject({ method: "GET", url: "/health", headers: evil })).statusCode, 200)
    const soap = await ctx.app.inject({ method: "POST", url: "/soap", headers: { ...evil, "content-type": "text/xml" }, payload: envelopeFor("DownloadGrFaKombi", "") })
    assert.equal(soap.statusCode, 200)
  })

  it("sends a CSP without inline scripts", async () => {
    const ctx = freshApp()
    const res = await ctx.app.inject({ method: "GET", url: "/" })
    assert.match(res.headers["content-security-policy"] as string, /script-src 'self'/)
    assert.doesNotMatch(res.body, /onsubmit=|onchange=|onclick=/)
    assert.doesNotMatch(res.body, /<script>/)
    assert.equal((await ctx.app.inject({ method: "GET", url: "/ui.js" })).statusCode, 200)
  })
})

describe("request log hygiene", () => {
  it("checks the GUID before injected failures and truncates unauthenticated bodies", async () => {
    const ctx = freshApp()
    ctx.store.state.settings.failNextN = 1
    const bad = await call(ctx, "DownloadGrFaKombi", `<Pad>${"x".repeat(10000)}</Pad>`, "11111111-1111-1111-1111-111111111111")
    assert.equal(bad.body.Fault.faultstring, "Invalid IdentifyGuid")
    assert.equal(ctx.store.state.settings.failNextN, 1)
    const entry = ctx.store.state.requestLog.at(-1)!
    assert.ok(entry.requestXml.length < 2300)
    assert.doesNotMatch(entry.requestXml, /11111111-1111/)
    assert.equal((await call(ctx, "DownloadGrFaKombi")).body.Fault.faultstring, "Injected failure")
  })

  it("masks IdentifyGuid in the request log and stored orders", async () => {
    const ctx = freshApp()
    await call(ctx, "UploadOrder", orderXml(4001))
    for (const entry of ctx.store.state.requestLog) {
      assert.doesNotMatch(entry.requestXml, new RegExp(GUID))
      assert.match(entry.requestXml, /<IdentifyGuid>\*\*\*<\/IdentifyGuid>/)
    }
    assert.doesNotMatch(ctx.store.findOrder(4001)!.rawRequestXml, new RegExp(GUID))
  })

  it("writes the state file owner-only", async () => {
    const ctx = freshApp()
    await call(ctx, "DownloadGrFaKombi")
    assert.equal(statSync(ctx.store.filePath).mode & 0o777, 0o600)
  })
})

describe("startup checks", () => {
  const secure = { uiUser: "dev", uiPassword: "x".repeat(48), guid: "6f1c2a8e-3b4d-4c5e-9f60-718293a4b5c6" }

  it("exempts pure loopback (make dev)", () => {
    assert.deepEqual(startupProblems({ host: "127.0.0.1", allowedHosts: ["127.0.0.1:3001", "localhost:3001", "[::1]:3001"] }), [])
    assert.deepEqual(startupProblems({ host: "127.0.0.1", allowedHosts: [] }), [])
  })

  it("refuses a non-loopback bind without auth / with the default GUID", () => {
    assert.equal(startupProblems({ host: "0.0.0.0", allowedHosts: [] }).length, 2)
    assert.equal(startupProblems({ host: "0.0.0.0", allowedHosts: [], ...secure, guid: GUID }).length, 1)
    assert.deepEqual(startupProblems({ host: "0.0.0.0", allowedHosts: [], ...secure }), [])
  })

  it("refuses a proxied hostname in the allowlist while bound to loopback", () => {
    const proxied = { host: "127.0.0.1", allowedHosts: ["127.0.0.1:3001", "tricon-mock.test.example"] }
    assert.equal(startupProblems(proxied).length, 2)
    assert.match(startupProblems({ ...proxied, uiUser: "dev", uiPassword: "pw" })[0], /TRICON_MOCK_GUID/)
    assert.match(startupProblems({ ...proxied, guid: secure.guid })[0], /TRICON_MOCK_UI_USER/)
    assert.deepEqual(startupProblems({ ...proxied, ...secure }), [])
  })
})
