import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"

export const BRANCHES = ["Oldenburg", "Osnabrück"] as const
export const LOCAL_BRANCH = "Oldenburg"

export const ORDER_STATES = [
  "Neu",
  "InBearbeitung",
  "Geliefert",
  "Teilgeliefert",
  "Abgelehnt",
  "StorniertTriData",
  "StorniertExtern",
] as const
export type OrderState = (typeof ORDER_STATES)[number]

/** States the mock UI may set (StorniertExtern only comes from the shop). */
export const UI_ORDER_STATES: OrderState[] = [
  "InBearbeitung",
  "Geliefert",
  "Teilgeliefert",
  "Abgelehnt",
  "StorniertTriData",
]

/**
 * An Artikel holds every reference field as a plain value map (`fields`) so
 * downloads emit the full record; the typed properties are the ones the mock
 * models and edits.
 */
export type Artikel = {
  ArtikelID: string
  ArtikelNummer: string
  ArtikelName: string
  Matchcode: string
  GrFa: boolean
  I_VKbrutto: number
  MehrwertSteuerSatz: string
  I_IstOnlineAktiv: boolean
  LastChange: string
  CreateDate: string
  /** Static extra fields (EAN, Hersteller, ArtikelBeschreibung, ...). */
  extra: Record<string, string | number | boolean>
  /** Shop reference, informational only. */
  source: { productId: string; handle: string; variantIds: string[] }
}

export type GrFaKombi = {
  ArtikelGrFaKombiID: string
  Artikel: string
  Groesse: string
  Farbe: string
  Artikelnummer: string
  EAN: string
  Barcode: string
  FarbeBezeichnung: string
  GroesseBezeichnung: string
  CreateDate: string
  LastChange: string
  source: { variantId: string }
}

export type StockQuantities = {
  Lagerbestand: number
  Reserviert: number
  Bestellt: number
  /** Manual MengeVerfuegbar; null = max(0, Lagerbestand - Reserviert). */
  MengeVerfuegbarOverride: number | null
  LastChange: string
}

export type StockBranchRow = StockQuantities & {
  StockBranchID: string
  ArtikelID: string
  Filialname: string
}

export type StockColorSizeBranchRow = StockQuantities & {
  StockColorSizeBranchID: string
  ArtikelID: string
  ArtikelGrFaKombinationenID: string
  Filialname: string
}

export type StateHistoryEntry = {
  at: string
  state: OrderState
  source: "UploadOrder" | "UploadOrderChangeStorno" | "UploadOrderChangeBezahlt" | "ui"
  note?: string
}

export type Order = {
  WebShopOrderID: number
  header: Record<string, string>
  customer: Record<string, string>
  deliverAdress: Record<string, string> | null
  items: Record<string, string>[]
  rawRequestXml: string
  state: OrderState
  stateHistory: StateHistoryEntry[]
  paid: boolean
  ausgeglichenAm: string
  createdAt: string
}

export type RequestLogEntry = {
  id: number
  time: string
  function: string
  guidOk: boolean
  durationMs: number
  httpStatus: number
  fault: string | null
  requestXml: string
  responseXml: string
}

export type Settings = {
  failNextN: number
  delayMs: number
}

export type MockState = {
  seededAt: string
  artikel: Artikel[]
  grfaKombi: GrFaKombi[]
  stockBranch: StockBranchRow[]
  stockColorSizeBranch: StockColorSizeBranchRow[]
  orders: Order[]
  requestLog: RequestLogEntry[]
  settings: Settings
  nextRequestId: number
}

export const REQUEST_LOG_CAP = 2000
/** Total stored request/response XML across the log (characters, roughly bytes). */
export const REQUEST_LOG_BYTE_CAP = 20 * 1024 * 1024

function entrySize(entry: RequestLogEntry) {
  return entry.requestXml.length + entry.responseXml.length
}

/** `YYYY-MM-DDTHH:mm:ss`, UTC, no suffix (see contract "Value formats"). */
export function formatDateTime(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19)
}

/**
 * Parses a contract dateTime. A trailing `Z`/offset is honoured; without one
 * the value is treated as UTC. Returns null when unparseable.
 */
export function parseDateTime(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed)
  const ms = Date.parse(hasZone ? trimmed : `${trimmed}Z`)
  return Number.isNaN(ms) ? null : ms
}

export function mengeVerfuegbar(row: StockQuantities): number {
  if (row.MengeVerfuegbarOverride !== null && row.MengeVerfuegbarOverride !== undefined) {
    return row.MengeVerfuegbarOverride
  }
  return Math.max(0, row.Lagerbestand - row.Reserviert)
}

export class Store {
  state: MockState
  readonly filePath: string

  constructor(filePath: string, initial: MockState) {
    this.filePath = filePath
    this.state = initial
  }

  /** Loads the state file, or seeds via `seed()` when there is none. */
  static open(filePath: string, seed: () => MockState): Store {
    const dir = path.dirname(filePath)
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    try {
      chmodSync(dir, 0o700)
    } catch {
      // Not our directory (e.g. a shared tmp dir in tests): leave its mode alone.
    }
    if (existsSync(filePath)) {
      chmodSync(filePath, 0o600)
      const state = JSON.parse(readFileSync(filePath, "utf8")) as MockState
      return new Store(filePath, state)
    }
    const store = new Store(filePath, seed())
    store.save()
    return store
  }

  /** Atomic write: temp file in the same directory, then rename. */
  save() {
    mkdirSync(path.dirname(this.filePath), { recursive: true, mode: 0o700 })
    const tmp = `${this.filePath}.${process.pid}.tmp`
    // State holds (test) customer data: owner-only. rename keeps the temp file's mode.
    writeFileSync(tmp, JSON.stringify(this.state), { mode: 0o600 })
    chmodSync(tmp, 0o600)
    renameSync(tmp, this.filePath)
  }

  replace(state: MockState) {
    this.state = state
    this.save()
  }

  logRequest(entry: Omit<RequestLogEntry, "id">) {
    const id = this.state.nextRequestId++
    this.state.requestLog.push({ id, ...entry })
    const log = this.state.requestLog
    const overflow = log.length - REQUEST_LOG_CAP
    if (overflow > 0) {
      log.splice(0, overflow)
    }
    let total = log.reduce((sum, e) => sum + entrySize(e), 0)
    let drop = 0
    while (total > REQUEST_LOG_BYTE_CAP && drop < log.length - 1) {
      total -= entrySize(log[drop])
      drop++
    }
    if (drop > 0) {
      log.splice(0, drop)
    }
    this.save()
  }

  findArtikel(id: string) {
    return this.state.artikel.find((a) => a.ArtikelID === id)
  }

  findKombi(id: string) {
    return this.state.grfaKombi.find((k) => k.ArtikelGrFaKombiID === id)
  }

  findOrder(webShopOrderId: number) {
    return this.state.orders.find((o) => o.WebShopOrderID === webShopOrderId)
  }

  findStockRow(id: string): StockBranchRow | StockColorSizeBranchRow | undefined {
    return (
      this.state.stockBranch.find((r) => r.StockBranchID === id) ??
      this.state.stockColorSizeBranch.find((r) => r.StockColorSizeBranchID === id)
    )
  }
}
