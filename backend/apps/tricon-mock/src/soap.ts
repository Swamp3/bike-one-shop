import { timingSafeEqual } from "node:crypto"
import {
  ADRESS_FIELDS,
  ARTIKEL_FIELDS,
  CUSTOMER_EXT_FIELDS,
  GRFA_KOMBI_FIELDS,
  ORDER_FIELDS,
  ORDER_ITEMS_FIELDS,
  ORDER_STATE_FIELDS,
  STOCK_BRANCH_FIELDS,
  STOCK_BY_ARTIKEL_FIELDS,
  STOCK_COLOR_SIZE_BRANCH_FIELDS,
  type FieldList,
} from "./reference-fields.ts"
import { deterministicGuid, round2 } from "./seed-data.ts"
import {
  LOCAL_BRANCH,
  formatDateTime,
  mengeVerfuegbar,
  parseDateTime,
  type Artikel,
  type GrFaKombi,
  type Order,
  type StockBranchRow,
  type StockColorSizeBranchRow,
  type StockQuantities,
  type Store,
} from "./state.ts"
import {
  SoapFault,
  TEMPURI_NS,
  asArray,
  child,
  envelope,
  faultXml,
  isObject,
  parseEnvelope,
  readRecord,
  recordXml,
  text,
  type SoapVersion,
  type XmlObject,
} from "./xml.ts"

export const DEFAULT_GUID = "00000000-0000-0000-0000-000000000001"

type Result =
  | { kind: "list"; recordName: string; fields: FieldList; records: Record<string, unknown>[] }
  | { kind: "single"; fields: FieldList; record: Record<string, unknown> }
  | { kind: "bool"; value: boolean }

type Handler = (store: Store, params: XmlObject, rawXml: string) => Result

export type FunctionSpec = {
  params: [string, string][]
  handler: Handler
  /** For the WSDL: name + fields of the result record, or "boolean". */
  result: { recordName?: string; fields?: FieldList; single?: boolean; boolean?: boolean }
}

// ---------------------------------------------------------------------------
// Record builders

function artikelRecord(a: Artikel): Record<string, unknown> {
  const netto = round2(a.I_VKbrutto / 1.19)
  return {
    ...a.extra,
    ArtikelID: a.ArtikelID,
    ArtikelNummer: a.ArtikelNummer,
    ArtikelName: a.ArtikelName,
    MehrwertSteuerSatz: a.MehrwertSteuerSatz,
    VKBrutto: a.I_VKbrutto,
    VKNetto: netto,
    I_VKbrutto: a.I_VKbrutto,
    I_VKnetto: netto,
    CreateDate: a.CreateDate,
    LastChange: a.LastChange,
    GrFa: a.GrFa,
    Matchcode: a.Matchcode,
    I_IstOnlineAktiv: a.I_IstOnlineAktiv,
  }
}

function kombiRecord(k: GrFaKombi): Record<string, unknown> {
  return {
    ArtikelGrFaKombiID: k.ArtikelGrFaKombiID,
    Artikel: k.Artikel,
    Groesse: k.Groesse,
    Farbe: k.Farbe,
    Artikelnummer: k.Artikelnummer,
    EAN: k.EAN,
    CreateDate: k.CreateDate,
    LastChange: k.LastChange,
    Barcode: k.Barcode,
    FarbeBezeichnung: k.FarbeBezeichnung,
    GroesseBezeichnung: k.GroesseBezeichnung,
  }
}

function quantities(row: StockQuantities) {
  return {
    Bestellt: row.Bestellt,
    Reserviert: row.Reserviert,
    Lagerbestand: row.Lagerbestand,
    MengeVerfuegbar: mengeVerfuegbar(row),
    LastChange: row.LastChange,
  }
}

function stockBranchRecord(store: Store, row: StockBranchRow): Record<string, unknown> {
  const a = store.findArtikel(row.ArtikelID)
  return {
    StockBranchID: row.StockBranchID,
    ArtikelID: row.ArtikelID,
    Artikelbezeichnung: a?.ArtikelName ?? "",
    Artikelnummer: a?.ArtikelNummer ?? "",
    Filialname: row.Filialname,
    ...quantities(row),
  }
}

function stockCsbRecord(store: Store, row: StockColorSizeBranchRow): Record<string, unknown> {
  const a = store.findArtikel(row.ArtikelID)
  const k = store.findKombi(row.ArtikelGrFaKombinationenID)
  return {
    StockColorSizeBranchID: row.StockColorSizeBranchID,
    ArtikelID: row.ArtikelID,
    Artikelbezeichnung: a?.ArtikelName ?? "",
    Artikelnummer: a?.ArtikelNummer ?? "",
    Color: k?.FarbeBezeichnung ?? "",
    Size: k?.GroesseBezeichnung ?? "",
    Filialname: row.Filialname,
    ArtikelGrFaKombinationenID: row.ArtikelGrFaKombinationenID,
    Barcode: k?.Barcode ?? "",
    ...quantities(row),
  }
}

// ---------------------------------------------------------------------------
// Params

function param(params: XmlObject, name: string, required = true): string {
  const value = text(child(params, name)).trim()
  if (required && !value) {
    throw new SoapFault("Client", `Missing parameter ${name}`)
  }
  return value
}

function dateParam(params: XmlObject, name: string): number {
  const raw = param(params, name)
  const ms = parseDateTime(raw)
  if (ms === null) {
    throw new SoapFault("Client", `Invalid dateTime for ${name}: ${raw}`)
  }
  return ms
}

function intParam(params: XmlObject, name: string): number {
  const raw = param(params, name)
  if (!/^-?\d+$/.test(raw)) {
    throw new SoapFault("Client", `Invalid int for ${name}: ${raw}`)
  }
  return Number(raw)
}

/**
 * Delta semantics: rows with LastChange >= the given time. Inclusive because
 * timestamps have second resolution; a duplicate on the next sync is harmless,
 * a missed change is not.
 */
function changedSince(lastChange: string, since: number) {
  const ms = parseDateTime(lastChange)
  return ms !== null && ms >= since
}

function requireOrder(store: Store, id: number): Order {
  const order = store.findOrder(id)
  if (!order) {
    throw new SoapFault("Client", `Order ${id} not found`)
  }
  return order
}

// ---------------------------------------------------------------------------
// Functions

const list = (
  recordName: string,
  fields: FieldList,
  records: Record<string, unknown>[]
): Result => ({ kind: "list", recordName, fields, records })

export const FUNCTIONS: Record<string, FunctionSpec> = {
  DownloadArtikelAll: {
    params: [],
    result: { recordName: "Artikel", fields: ARTIKEL_FIELDS },
    handler: (store) =>
      list(
        "Artikel",
        ARTIKEL_FIELDS,
        store.state.artikel.filter((a) => a.I_IstOnlineAktiv).map(artikelRecord)
      ),
  },
  DownloadArtikel: {
    params: [["LastChange", "dateTime"]],
    result: { recordName: "Artikel", fields: ARTIKEL_FIELDS },
    handler: (store, params) => {
      const since = dateParam(params, "LastChange")
      return list(
        "Artikel",
        ARTIKEL_FIELDS,
        store.state.artikel.filter((a) => changedSince(a.LastChange, since)).map(artikelRecord)
      )
    },
  },
  DownloadGrFaKombi: {
    params: [],
    result: { recordName: "ArtikelGrFaKombi", fields: GRFA_KOMBI_FIELDS },
    handler: (store) =>
      list("ArtikelGrFaKombi", GRFA_KOMBI_FIELDS, store.state.grfaKombi.map(kombiRecord)),
  },
  DownloadStockBranch: {
    params: [],
    result: { recordName: "StockBranch", fields: STOCK_BRANCH_FIELDS },
    handler: (store) =>
      list(
        "StockBranch",
        STOCK_BRANCH_FIELDS,
        store.state.stockBranch.map((r) => stockBranchRecord(store, r))
      ),
  },
  DownloadStockBranchDelta: {
    params: [["LastChange", "dateTime"]],
    result: { recordName: "StockBranch", fields: STOCK_BRANCH_FIELDS },
    handler: (store, params) => {
      const since = dateParam(params, "LastChange")
      return list(
        "StockBranch",
        STOCK_BRANCH_FIELDS,
        store.state.stockBranch
          .filter((r) => changedSince(r.LastChange, since))
          .map((r) => stockBranchRecord(store, r))
      )
    },
  },
  DownloadStockColorSizeBranch: {
    params: [],
    result: { recordName: "StockColorSizeBranch", fields: STOCK_COLOR_SIZE_BRANCH_FIELDS },
    handler: (store) =>
      list(
        "StockColorSizeBranch",
        STOCK_COLOR_SIZE_BRANCH_FIELDS,
        store.state.stockColorSizeBranch.map((r) => stockCsbRecord(store, r))
      ),
  },
  DownloadStockColorSizeBranchDelta: {
    params: [["LastChange", "dateTime"]],
    result: { recordName: "StockColorSizeBranch", fields: STOCK_COLOR_SIZE_BRANCH_FIELDS },
    handler: (store, params) => {
      const since = dateParam(params, "LastChange")
      return list(
        "StockColorSizeBranch",
        STOCK_COLOR_SIZE_BRANCH_FIELDS,
        store.state.stockColorSizeBranch
          .filter((r) => changedSince(r.LastChange, since))
          .map((r) => stockCsbRecord(store, r))
      )
    },
  },
  DownloadStockByArtikel: {
    params: [["Artikelnummer", "string"]],
    result: { fields: STOCK_BY_ARTIKEL_FIELDS, single: true },
    handler: (store, params) => {
      const nummer = param(params, "Artikelnummer")
      const upper = nummer.toUpperCase()
      const kombi = store.state.grfaKombi.find((k) => k.Artikelnummer.toUpperCase() === upper)
      const artikel = kombi
        ? store.findArtikel(kombi.Artikel)
        : store.state.artikel.find(
          (a) =>
            a.ArtikelNummer.toUpperCase() === upper ||
            (!a.GrFa && a.Matchcode.toUpperCase() === upper)
        )
      if (!artikel) {
        throw new SoapFault("Client", `Artikel ${nummer} not found`)
      }

      let rows: (StockQuantities & { Filialname: string })[]
      if (kombi) {
        rows = store.state.stockColorSizeBranch.filter(
          (r) => r.ArtikelGrFaKombinationenID === kombi.ArtikelGrFaKombiID
        )
      } else if (artikel.GrFa) {
        rows = store.state.stockColorSizeBranch.filter((r) => r.ArtikelID === artikel.ArtikelID)
      } else {
        rows = store.state.stockBranch.filter((r) => r.ArtikelID === artikel.ArtikelID)
      }

      const sum = (pick: (r: StockQuantities) => number, local: boolean) =>
        rows
          .filter((r) => !local || r.Filialname === LOCAL_BRANCH)
          .reduce((total, r) => total + pick(r), 0)

      const label = kombi
        ? [artikel.ArtikelName, kombi.FarbeBezeichnung, kombi.GroesseBezeichnung]
          .filter(Boolean)
          .join(" ")
        : artikel.ArtikelName

      return {
        kind: "single",
        fields: STOCK_BY_ARTIKEL_FIELDS,
        record: {
          StockID: deterministicGuid(`stock:${kombi?.ArtikelGrFaKombiID ?? artikel.ArtikelID}`),
          ArtikelID: artikel.ArtikelID,
          Artikelbezeichnung: label,
          Artikelnummer: kombi ? kombi.Artikelnummer : artikel.ArtikelNummer,
          BestelltGesamt: sum((r) => r.Bestellt, false),
          BestelltLokaleFiliale: sum((r) => r.Bestellt, true),
          ReserviertGesamt: sum((r) => r.Reserviert, false),
          ReserviertLokaleFiliale: sum((r) => r.Reserviert, true),
          LagerbestandGesamt: sum((r) => r.Lagerbestand, false),
          LagerbestandLokaleFiliale: sum((r) => r.Lagerbestand, true),
          MengeVerfuegbarGesamt: sum(mengeVerfuegbar, false),
          MengeVerfuegbarLokaleFiliale: sum(mengeVerfuegbar, true),
        },
      }
    },
  },
  UploadOrder: {
    params: [["TO", "TO"]],
    result: { boolean: true },
    handler: (store, params, rawXml) => {
      const to = child(params, "TO")
      if (!isObject(to)) {
        throw new SoapFault("Client", "Missing parameter TO")
      }
      const orderNode = child(to, "Order")
      const customerNode = child(to, "Customer")
      if (!isObject(orderNode)) {
        throw new SoapFault("Client", "Missing TO/Order")
      }
      if (!isObject(customerNode)) {
        throw new SoapFault("Client", "Missing TO/Customer")
      }

      const header = readRecord(orderNode, ORDER_FIELDS)
      const idRaw = header.WebShopOrderID.trim()
      if (!/^\d+$/.test(idRaw)) {
        throw new SoapFault("Client", `Invalid or missing Order.WebShopOrderID: ${idRaw}`)
      }
      const id = Number(idRaw)
      if (store.findOrder(id)) {
        throw new SoapFault("Client", `WebShopOrderID ${id} already exists`)
      }

      const customer = readRecord(customerNode, CUSTOMER_EXT_FIELDS)
      if (!customer.Kundenname.trim()) {
        throw new SoapFault("Client", "Customer.Kundenname is mandatory")
      }
      const deliverNode = child(to, "DeliverAdress")
      const deliverAdress = isObject(deliverNode) ? readRecord(deliverNode, ADRESS_FIELDS) : null
      const items = asArray(child(child(to, "OrderItemsList"), "OrderItemsObj"))
        .filter(isObject)
        .map((node) => readRecord(node, ORDER_ITEMS_FIELDS))

      const now = formatDateTime()
      header.OrderImportDate = now
      const paid = header.Bezahlt.trim().toLowerCase() === "true"
      store.state.orders.push({
        WebShopOrderID: id,
        header,
        customer,
        deliverAdress,
        items,
        rawRequestXml: rawXml,
        state: "Neu",
        stateHistory: [{ at: now, state: "Neu", source: "UploadOrder" }],
        paid,
        ausgeglichenAm: header.ausgeglichenAm,
        createdAt: now,
      })
      store.save()
      return { kind: "bool", value: true }
    },
  },
  UploadOrderChangeBezahlt: {
    params: [
      ["Auftragsnummer", "int"],
      ["Bezahlt", "boolean"],
      ["AusgeglichenAm", "dateTime"],
    ],
    result: { boolean: true },
    handler: (store, params) => {
      const order = requireOrder(store, intParam(params, "Auftragsnummer"))
      const paid = param(params, "Bezahlt").toLowerCase() === "true"
      const ausgeglichenAm = param(params, "AusgeglichenAm", paid)
      order.paid = paid
      order.ausgeglichenAm = paid ? ausgeglichenAm : ""
      order.stateHistory.push({
        at: formatDateTime(),
        state: order.state,
        source: "UploadOrderChangeBezahlt",
        note: paid ? `Bezahlt=true, AusgeglichenAm=${ausgeglichenAm}` : "Bezahlt=false",
      })
      store.save()
      return { kind: "bool", value: true }
    },
  },
  UploadOrderChangeStorno: {
    params: [["WebShopOrderID", "int"]],
    result: { boolean: true },
    handler: (store, params) => {
      const order = requireOrder(store, intParam(params, "WebShopOrderID"))
      if (order.state !== "StorniertExtern") {
        order.state = "StorniertExtern"
        order.stateHistory.push({
          at: formatDateTime(),
          state: "StorniertExtern",
          source: "UploadOrderChangeStorno",
        })
        store.save()
      }
      return { kind: "bool", value: true }
    },
  },
  DownloadOrderStateByOrder: {
    params: [["WebshopOrderID", "int"]],
    result: { fields: ORDER_STATE_FIELDS, single: true },
    handler: (store, params) => {
      const order = requireOrder(store, intParam(params, "WebshopOrderID"))
      return {
        kind: "single",
        fields: ORDER_STATE_FIELDS,
        record: { WebShopOrderID: order.WebShopOrderID, OrderState: order.state },
      }
    },
  },
}

// ---------------------------------------------------------------------------
// Dispatch

function resultXml(fn: string, result: Result): string {
  const open = `    <${fn}Response xmlns="${TEMPURI_NS}">`
  const close = `    </${fn}Response>`
  const tag = `${fn}Result`
  let inner: string
  if (result.kind === "bool") {
    inner = `      <${tag}>${result.value ? "true" : "false"}</${tag}>`
  } else if (result.kind === "single") {
    inner = `      <${tag}>\n${recordXml(result.fields, result.record, "        ")}\n      </${tag}>`
  } else if (result.records.length === 0) {
    inner = `      <${tag} />`
  } else {
    const records = result.records
      .map(
        (r) =>
          `        <${result.recordName}>\n${recordXml(result.fields, r, "          ")}\n        </${result.recordName}>`
      )
      .join("\n")
    inner = `      <${tag}>\n${records}\n      </${tag}>`
  }
  return [open, inner, close].join("\n")
}

/** Per-entry cap for stored XML (request log, order raw XML). */
export const STORED_XML_LIMIT = 256 * 1024
const UNAUTHENTICATED_BODY_LIMIT = 2 * 1024

const IDENTIFY_GUID_ELEMENT = /(<(?:[\w.-]+:)?IdentifyGuid\b[^>]*?(?<!\/)>)[\s\S]*?(<\/(?:[\w.-]+:)?IdentifyGuid\s*>)/gi

/** Replaces the content of every IdentifyGuid element with `***`, so the secret is never stored. */
export function maskIdentifyGuid(xml: string): string {
  return xml.replace(IDENTIFY_GUID_ELEMENT, "$1***$2")
}

function truncate(value: string, limit: number) {
  return value.length > limit
    ? `${value.slice(0, limit)}\n<!-- truncated by tricon-mock: ${value.length - limit} more characters -->`
    : value
}

export function sanitizeStoredXml(xml: string) {
  return truncate(maskIdentifyGuid(xml), STORED_XML_LIMIT)
}

function guidMatches(expected: string, actual: string) {
  const a = Buffer.from(expected.trim().toLowerCase())
  const b = Buffer.from(actual.trim().toLowerCase())
  return a.length === b.length && timingSafeEqual(a, b)
}

export type SoapOutcome = {
  httpStatus: number
  contentType: string
  body: string
  fn: string
  guidOk: boolean
  fault: string | null
}

export type SoapOptions = { guid: string; sleep?: (ms: number) => Promise<void> }

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Handles one SOAP request end to end and writes the request log entry. */
export async function handleSoap(store: Store, raw: string, options: SoapOptions): Promise<SoapOutcome> {
  const started = Date.now()
  let version: SoapVersion = "1.1"
  let fn = "(unparsed)"
  let guidOk = false
  let outcome: Omit<SoapOutcome, "fn" | "guidOk">

  const contentTypeFor = (v: SoapVersion) =>
    v === "1.2" ? "application/soap+xml; charset=utf-8" : "text/xml; charset=utf-8"

  try {
    const parsed = parseEnvelope(raw)
    version = parsed.version
    fn = parsed.operation

    // GUID first: unauthenticated callers never consume injected failures or wait out the delay.
    guidOk = guidMatches(options.guid, text(child(parsed.body, "IdentifyGuid")))
    if (!guidOk) {
      throw new SoapFault("Client", "Invalid IdentifyGuid")
    }

    const { delayMs } = store.state.settings
    if (delayMs > 0) {
      await (options.sleep ?? defaultSleep)(delayMs)
    }
    if (store.state.settings.failNextN > 0) {
      store.state.settings.failNextN -= 1
      throw new SoapFault("Server", "Injected failure")
    }

    const spec = FUNCTIONS[fn]
    if (!spec) {
      throw new SoapFault("Client", `NotImplementedInMock: ${fn}`)
    }
    const result = spec.handler(store, parsed.body, sanitizeStoredXml(raw))
    outcome = {
      httpStatus: 200,
      contentType: contentTypeFor(version),
      body: envelope(version, resultXml(fn, result)),
      fault: null,
    }
  } catch (error) {
    const fault =
      error instanceof SoapFault ? error : new SoapFault("Server", `Internal error: ${(error as Error).message}`)
    outcome = {
      httpStatus: 500,
      contentType: contentTypeFor(version),
      body: faultXml(version, fault),
      fault: `soap:${fault.code}: ${fault.message}`,
    }
  }

  store.logRequest({
    time: formatDateTime(new Date(started)),
    function: fn,
    guidOk,
    durationMs: Date.now() - started,
    httpStatus: outcome.httpStatus,
    fault: outcome.fault,
    // Unauthenticated / unparseable requests: metadata plus the first 2 KB only.
    requestXml: guidOk ? sanitizeStoredXml(raw) : truncate(maskIdentifyGuid(raw), UNAUTHENTICATED_BODY_LIMIT),
    responseXml: truncate(outcome.body, STORED_XML_LIMIT),
  })

  return { ...outcome, fn, guidOk }
}
