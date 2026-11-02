/**
 * TriCon/Tridata SOAP client.
 *
 * Implements the 12 functions in
 * planning/3-Architecture_Tech_Stack/tricon-mock-contract.md against
 * TRIDATA_ENDPOINT_URL (the mock in dev, the real TriCon endpoint once
 * TriData grants access). Envelope building/parsing lives in ./soap.ts.
 *
 * Every call goes through `createIntegrationLogger(logger, "tridata")`, so
 * `[tridata]` log lines carry the same correlation id that callers store in
 * TridataSyncLog rows (returned as `correlationId` on success, attached to
 * the thrown TridataError on failure). The IdentifyGuid is never logged and
 * customer data from UploadOrder is never put into log meta.
 */
import type { Logger } from "@medusajs/framework/types"
import {
  createIntegrationLogger,
  IntegrationLogger,
  IntegrationLogMeta,
} from "../integration-logger"
import { getTridataConfig, isTridataConfigured, TridataConfig } from "./config"
import {
  asText,
  extractBoolean,
  extractList,
  extractRecord,
  formatTridataDateTime,
  ParsedXml,
  ParsedXmlObject,
  requireNumber,
  SoapObject,
  soapCall,
  toBoolean,
  toNumber,
  TridataError,
  TridataNotConfiguredError,
  TridataResponseError,
} from "./soap"
import type {
  TridataArtikel,
  TridataCallResult,
  TridataGrFaKombi,
  TridataOrderStateResult,
  TridataStockBranch,
  TridataStockByArtikel,
  TridataStockColorSizeBranch,
  TridataUploadOrderTO,
} from "./types"

export type TridataFunctionName =
  | "DownloadArtikelAll"
  | "DownloadArtikel"
  | "DownloadGrFaKombi"
  | "DownloadStockBranch"
  | "DownloadStockBranchDelta"
  | "DownloadStockColorSizeBranch"
  | "DownloadStockColorSizeBranchDelta"
  | "DownloadStockByArtikel"
  | "UploadOrder"
  | "UploadOrderChangeBezahlt"
  | "UploadOrderChangeStorno"
  | "DownloadOrderStateByOrder"

export type TridataClientConfig = Pick<
  TridataConfig,
  "endpointUrl" | "identifyGuid" | "namespace" | "timeoutMs" | "unsafeReason"
> & {
  fetchImpl?: typeof fetch
}

function mapArtikel(raw: ParsedXmlObject): TridataArtikel {
  return {
    ArtikelID: asText(raw.ArtikelID).toLowerCase(),
    ArtikelNummer: asText(raw.ArtikelNummer),
    ArtikelName: asText(raw.ArtikelName),
    Matchcode: asText(raw.Matchcode),
    EAN: asText(raw.EAN),
    GrFa: toBoolean(raw.GrFa),
    I_VKbrutto: toNumber(raw.I_VKbrutto),
    MehrwertSteuerSatz: asText(raw.MehrwertSteuerSatz),
    I_IstOnlineAktiv: toBoolean(raw.I_IstOnlineAktiv),
    LastChange: asText(raw.LastChange),
    raw,
  }
}

function mapKombi(raw: ParsedXmlObject): TridataGrFaKombi {
  return {
    ArtikelGrFaKombiID: asText(raw.ArtikelGrFaKombiID).toLowerCase(),
    Artikel: asText(raw.Artikel).toLowerCase(),
    Artikelnummer: asText(raw.Artikelnummer),
    EAN: asText(raw.EAN),
    Barcode: asText(raw.Barcode),
    FarbeBezeichnung: asText(raw.FarbeBezeichnung),
    GroesseBezeichnung: asText(raw.GroesseBezeichnung),
    LastChange: asText(raw.LastChange),
    raw,
  }
}

function mapStockBranch(raw: ParsedXmlObject, recordName = "StockBranch"): TridataStockBranch {
  const id =
    asText(raw.StockBranchID) || asText(raw.StockColorSizeBranchID) || asText(raw.ArtikelID)
  // A missing quantity must fail the call (and with it the run), never become 0.
  const context = `${recordName} ${id || "(no id)"}`
  return {
    ArtikelID: asText(raw.ArtikelID).toLowerCase(),
    Artikelnummer: asText(raw.Artikelnummer),
    Lagerbestand: requireNumber(raw, "Lagerbestand", context),
    Reserviert: requireNumber(raw, "Reserviert", context),
    Bestellt: requireNumber(raw, "Bestellt", context),
    MengeVerfuegbar: requireNumber(raw, "MengeVerfuegbar", context),
    Filialname: asText(raw.Filialname),
    LastChange: asText(raw.LastChange),
    raw,
  }
}

function mapStockColorSizeBranch(
  raw: ParsedXmlObject
): TridataStockColorSizeBranch {
  return {
    ...mapStockBranch(raw, "StockColorSizeBranch"),
    ArtikelGrFaKombinationenID: asText(
      raw.ArtikelGrFaKombinationenID
    ).toLowerCase(),
    Color: asText(raw.Color),
    Size: asText(raw.Size),
    Barcode: asText(raw.Barcode),
  }
}

function requireTrue(functionName: string, result: ParsedXml | undefined) {
  if (!extractBoolean(result)) {
    throw new TridataResponseError(
      `${functionName} returned ${JSON.stringify(asText(result)) || "no result"} instead of true`
    )
  }
  return true as const
}

export class TridataClient {
  private readonly log: IntegrationLogger
  private readonly config: TridataClientConfig

  constructor(logger: Logger, config: TridataClientConfig = getTridataConfig()) {
    this.log = createIntegrationLogger(logger, "tridata")
    this.config = config
  }

  get isConfigured(): boolean {
    return isTridataConfigured(this.config)
  }

  /**
   * Runs one SOAP call through the integration logger. `meta` is logged, so
   * it must never contain the GUID or customer data.
   */
  private async invoke<T>(
    functionName: TridataFunctionName,
    params: SoapObject,
    meta: IntegrationLogMeta,
    map: (result: ParsedXml | undefined) => T
  ): Promise<TridataCallResult<T>> {
    if (!this.isConfigured) {
      throw new TridataNotConfiguredError()
    }
    let correlationId = ""
    const startedAt = Date.now()
    try {
      const data = await this.log.call(functionName, meta, async (ctx) => {
        correlationId = ctx.correlationId
        const result = await soapCall({
          endpointUrl: this.config.endpointUrl!,
          functionName,
          params: { IdentifyGuid: this.config.identifyGuid!, ...params },
          namespace: this.config.namespace,
          timeoutMs: this.config.timeoutMs,
          fetchImpl: this.config.fetchImpl,
        })
        return map(result)
      })
      return { data, correlationId, durationMs: Date.now() - startedAt }
    } catch (e) {
      const error =
        e instanceof TridataError
          ? e
          : new TridataError(e instanceof Error ? e.message : String(e))
      error.correlationId = correlationId || undefined
      error.durationMs = Date.now() - startedAt
      throw error
    }
  }

  // --- Catalog -----------------------------------------------------------------

  async downloadArtikelAll() {
    return this.invoke("DownloadArtikelAll", {}, {}, (r) =>
      extractList(r, "Artikel").map(mapArtikel)
    )
  }

  async downloadArtikel(lastChange: Date | string) {
    const value =
      lastChange instanceof Date ? formatTridataDateTime(lastChange) : lastChange
    return this.invoke(
      "DownloadArtikel",
      { LastChange: value },
      { lastChange: value },
      (r) => extractList(r, "Artikel").map(mapArtikel)
    )
  }

  async downloadGrFaKombi() {
    return this.invoke("DownloadGrFaKombi", {}, {}, (r) =>
      extractList(r, "ArtikelGrFaKombi").map(mapKombi)
    )
  }

  // --- Stock -------------------------------------------------------------------

  /** Full list when `lastChange` is omitted, otherwise the Delta variant. */
  async downloadStockBranch(lastChange?: string | null) {
    if (lastChange) {
      return this.invoke(
        "DownloadStockBranchDelta",
        { LastChange: lastChange },
        { lastChange },
        (r) => extractList(r, "StockBranch").map((r) => mapStockBranch(r))
      )
    }
    return this.invoke("DownloadStockBranch", {}, {}, (r) =>
      extractList(r, "StockBranch").map((r) => mapStockBranch(r))
    )
  }

  /** Full list when `lastChange` is omitted, otherwise the Delta variant. */
  async downloadStockColorSizeBranch(lastChange?: string | null) {
    if (lastChange) {
      return this.invoke(
        "DownloadStockColorSizeBranchDelta",
        { LastChange: lastChange },
        { lastChange },
        (r) =>
          extractList(r, "StockColorSizeBranch").map(mapStockColorSizeBranch)
      )
    }
    return this.invoke("DownloadStockColorSizeBranch", {}, {}, (r) =>
      extractList(r, "StockColorSizeBranch").map(mapStockColorSizeBranch)
    )
  }

  async downloadStockByArtikel(artikelnummer: string) {
    return this.invoke(
      "DownloadStockByArtikel",
      { Artikelnummer: artikelnummer },
      { artikelnummer },
      (r): TridataStockByArtikel => {
        const raw = extractRecord(r)
        return {
          ArtikelID: asText(raw.ArtikelID).toLowerCase(),
          Artikelnummer: asText(raw.Artikelnummer),
          LagerbestandGesamt: toNumber(raw.LagerbestandGesamt),
          ReserviertGesamt: toNumber(raw.ReserviertGesamt),
          BestelltGesamt: toNumber(raw.BestelltGesamt),
          MengeVerfuegbarGesamt: toNumber(raw.MengeVerfuegbarGesamt),
          MengeVerfuegbarLokaleFiliale: toNumber(
            raw.MengeVerfuegbarLokaleFiliale
          ),
          raw,
        }
      }
    )
  }

  // --- Orders ------------------------------------------------------------------

  async uploadOrder(to: TridataUploadOrderTO) {
    return this.invoke(
      "UploadOrder",
      { TO: to },
      {
        webShopOrderId: to.Order.WebShopOrderID,
        items: to.OrderItemsList.OrderItemsObj.length,
      },
      (r) => requireTrue("UploadOrder", r)
    )
  }

  async uploadOrderChangeBezahlt(params: {
    webShopOrderId: number
    bezahlt: boolean
    ausgeglichenAm: Date
  }) {
    return this.invoke(
      "UploadOrderChangeBezahlt",
      {
        Auftragsnummer: params.webShopOrderId,
        Bezahlt: params.bezahlt,
        AusgeglichenAm: params.ausgeglichenAm,
      },
      { webShopOrderId: params.webShopOrderId, bezahlt: params.bezahlt },
      (r) => requireTrue("UploadOrderChangeBezahlt", r)
    )
  }

  async uploadOrderChangeStorno(webShopOrderId: number) {
    return this.invoke(
      "UploadOrderChangeStorno",
      { WebShopOrderID: webShopOrderId },
      { webShopOrderId },
      (r) => requireTrue("UploadOrderChangeStorno", r)
    )
  }

  async downloadOrderStateByOrder(webShopOrderId: number) {
    return this.invoke(
      "DownloadOrderStateByOrder",
      // Lowercase "s" in WebshopOrderID, as in the reference.
      { WebshopOrderID: webShopOrderId },
      { webShopOrderId },
      (r): TridataOrderStateResult => {
        const raw = extractRecord(r)
        return {
          WebShopOrderID: toNumber(raw.WebShopOrderID),
          OrderState: asText(raw.OrderState),
        }
      }
    )
  }
}
