import { buildSeedState, loadCatalog } from "./seed-data.ts"
import {
  ORDER_STATES,
  UI_ORDER_STATES,
  formatDateTime,
  type OrderState,
  type Store,
} from "./state.ts"

/** Error with an HTTP status, raised by actions on bad input. */
export class ActionError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Input = Record<string, unknown>

function str(value: unknown): string {
  if (value === undefined || value === null) {
    return ""
  }
  return String(value).trim()
}

/** Parses an optional non-negative number ("" / missing = undefined). Accepts "," as decimal separator. */
function optionalNumber(value: unknown, name: string): number | undefined {
  const raw = str(value).replace(",", ".")
  if (raw === "") {
    return undefined
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ActionError(400, `${name} must be a non-negative number`)
  }
  return parsed
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value
  }
  const raw = str(value).toLowerCase()
  if (raw === "") {
    return undefined
  }
  return raw === "true" || raw === "1" || raw === "on"
}

export function updateItem(store: Store, id: string, input: Input) {
  const artikel = store.findArtikel(id)
  if (!artikel) {
    throw new ActionError(404, `Artikel ${id} not found`)
  }
  const price = optionalNumber(input.I_VKbrutto ?? input.price, "I_VKbrutto")
  let online = optionalBoolean(input.I_IstOnlineAktiv ?? input.online)
  if (str(input.toggleOnline) === "1" || input.toggleOnline === true) {
    online = !artikel.I_IstOnlineAktiv
  }
  if (price !== undefined) {
    artikel.I_VKbrutto = Math.round(price * 100) / 100
  }
  if (online !== undefined) {
    artikel.I_IstOnlineAktiv = online
  }
  if (price !== undefined || online !== undefined) {
    artikel.LastChange = formatDateTime()
    store.save()
  }
  return artikel
}

export function updateStock(store: Store, rowId: string, input: Input) {
  const row = store.findStockRow(rowId)
  if (!row) {
    throw new ActionError(404, `Stock row ${rowId} not found`)
  }
  const quick = str(input.action)
  if (quick === "set0") {
    row.Lagerbestand = 0
    row.Reserviert = 0
    row.Bestellt = 0
    row.MengeVerfuegbarOverride = null
  } else if (quick === "onorder") {
    row.Lagerbestand = 0
    row.Reserviert = 0
    row.Bestellt = 2
    row.MengeVerfuegbarOverride = null
  } else if (quick === "" || quick === "save") {
    const lagerbestand = optionalNumber(input.Lagerbestand, "Lagerbestand")
    const reserviert = optionalNumber(input.Reserviert, "Reserviert")
    const bestellt = optionalNumber(input.Bestellt, "Bestellt")
    if (lagerbestand !== undefined) {
      row.Lagerbestand = lagerbestand
    }
    if (reserviert !== undefined) {
      row.Reserviert = reserviert
    }
    if (bestellt !== undefined) {
      row.Bestellt = bestellt
    }
    // Empty override field = automatic MengeVerfuegbar. JSON clients may send null explicitly.
    if ("MengeVerfuegbarOverride" in input || "MengeVerfuegbar" in input) {
      const override = optionalNumber(
        input.MengeVerfuegbarOverride ?? input.MengeVerfuegbar,
        "MengeVerfuegbarOverride"
      )
      row.MengeVerfuegbarOverride = override ?? null
    }
  } else {
    throw new ActionError(400, `Unknown stock action ${quick}`)
  }
  row.LastChange = formatDateTime()
  store.save()
  return row
}

export function setOrderState(store: Store, id: number, input: Input) {
  const order = store.findOrder(id)
  if (!order) {
    throw new ActionError(404, `Order ${id} not found`)
  }
  const state = str(input.state) as OrderState
  if (!ORDER_STATES.includes(state) || !UI_ORDER_STATES.includes(state)) {
    throw new ActionError(400, `State must be one of ${UI_ORDER_STATES.join(", ")}`)
  }
  order.state = state
  order.stateHistory.push({ at: formatDateTime(), state, source: "ui", note: str(input.note) || undefined })
  store.save()
  return order
}

export function updateSettings(store: Store, input: Input) {
  const failNextN = optionalNumber(input.failNextN, "failNextN")
  const delayMs = optionalNumber(input.delayMs, "delayMs")
  if (failNextN !== undefined) {
    store.state.settings.failNextN = Math.floor(failNextN)
  }
  if (delayMs !== undefined) {
    store.state.settings.delayMs = Math.min(Math.floor(delayMs), 120000)
  }
  store.save()
  return store.state.settings
}

/** Rebuilds catalog + stock from the seed file, wipes orders and the request log. */
export function resetToSeed(store: Store, catalogPath: string) {
  store.replace(buildSeedState(loadCatalog(catalogPath)))
  return { seededAt: store.state.seededAt }
}
