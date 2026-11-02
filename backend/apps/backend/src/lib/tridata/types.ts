/**
 * Typed TriCon records — only the fields the shop relies on (see
 * tricon-mock-contract.md, "Functions implemented by the mock"). Every
 * record also keeps the raw parsed element under `raw`.
 */
import type { ParsedXmlObject, SoapObject } from "./soap"

export type TridataArtikel = {
  ArtikelID: string
  ArtikelNummer: string
  ArtikelName: string
  Matchcode: string
  EAN: string
  GrFa: boolean
  I_VKbrutto: number
  MehrwertSteuerSatz: string
  I_IstOnlineAktiv: boolean
  LastChange: string
  raw: ParsedXmlObject
}

export type TridataGrFaKombi = {
  ArtikelGrFaKombiID: string
  /** ArtikelID of the parent item. */
  Artikel: string
  Artikelnummer: string
  EAN: string
  Barcode: string
  FarbeBezeichnung: string
  GroesseBezeichnung: string
  LastChange: string
  raw: ParsedXmlObject
}

export type TridataStockQuantities = {
  Lagerbestand: number
  Reserviert: number
  Bestellt: number
  MengeVerfuegbar: number
}

export type TridataStockBranch = TridataStockQuantities & {
  ArtikelID: string
  Artikelnummer: string
  Filialname: string
  LastChange: string
  raw: ParsedXmlObject
}

export type TridataStockColorSizeBranch = TridataStockBranch & {
  ArtikelGrFaKombinationenID: string
  Color: string
  Size: string
  Barcode: string
}

export type TridataStockByArtikel = {
  ArtikelID: string
  Artikelnummer: string
  LagerbestandGesamt: number
  ReserviertGesamt: number
  BestelltGesamt: number
  MengeVerfuegbarGesamt: number
  MengeVerfuegbarLokaleFiliale: number
  raw: ParsedXmlObject
}

export type TridataOrderState =
  | "Neu"
  | "InBearbeitung"
  | "Geliefert"
  | "Teilgeliefert"
  | "Abgelehnt"
  | "StorniertTriData"
  | "StorniertExtern"

export const TRIDATA_FINAL_ORDER_STATES: string[] = [
  "Geliefert",
  "Abgelehnt",
  "StorniertTriData",
  "StorniertExtern",
]

export type TridataOrderStateResult = {
  WebShopOrderID: number
  OrderState: string
}

// --- UploadOrder transport object (field names exactly as the reference) ----

export type TridataAdress = SoapObject & {
  Name: string
  Name2?: string
  Strasse?: string
  Ort?: string
  Land?: string
  Postleitzahl?: string
  Telefonnummer?: string
}

export type TridataCustomerExt = SoapObject & {
  Kundenname: string
  Name2?: string
  Mehrwertsteuercode: "Inland" | "Ausland" | "Ausland EU"
  Telefon?: string
  Email: string
  Mailingsperre: boolean
  UserID: string
  Strasse?: string
  Ort?: string
  Land?: string
  Postleitzahl?: string
  IsOneTimeCustomer: boolean
}

export type TridataOrderHeader = SoapObject & {
  ausgeglichenAm?: Date
  WebShopOrderID: number
  Payment: string
  Bezahlt: boolean
  Comment?: string
  OrderCompletedDate: Date
  ShippingCost?: number
  DeliveryTerm: string
  Filialname?: string
}

export type TridataOrderItem = SoapObject & {
  WebshopArtikelnummer: string
  Bezeichnung: string
  VKBrutto: number
  SummeVKBrutto: number
  Quantity: number
  ArtikelGrFaKombiID?: string
  ArtikelID: string
  Positionsnummer: number
  EAN?: string
}

export type TridataUploadOrderTO = SoapObject & {
  DeliverAdress?: TridataAdress
  Customer: TridataCustomerExt
  Order: TridataOrderHeader
  OrderItemsList: { OrderItemsObj: TridataOrderItem[] }
}

export type TridataCallResult<T> = {
  data: T
  correlationId: string
  durationMs: number
}
