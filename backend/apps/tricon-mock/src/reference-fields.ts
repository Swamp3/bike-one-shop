/**
 * Record field lists (name + type) extracted from
 * planning/3-Architecture_Tech_Stack/tricon-interface-reference.html
 * (window.__TRICON_DATA__). Download records are emitted with all of these
 * fields, in this order; upload records are parsed against them.
 */
export type FieldType =
  | "guid"
  | "string"
  | "double"
  | "decimal"
  | "int"
  | "boolean"
  | "dateTime"

export type FieldList = readonly (readonly [string, FieldType])[]

export const ARTIKEL_FIELDS: FieldList = [
  ["ArtikelID", "guid"],
  ["ArtikelNummer", "string"],
  ["EAN", "string"],
  ["ArtikelName", "string"],
  ["ArtikelBeschreibung", "string"],
  ["MehrwertSteuerSatz", "string"],
  ["QuantityUnitCode", "string"],
  ["Gewicht", "double"],
  ["Hersteller", "string"],
  ["Warengruppe", "string"],
  ["VKBrutto", "decimal"],
  ["VKNetto", "decimal"],
  ["UVP", "decimal"],
  ["CreateDate", "dateTime"],
  ["LastChange", "dateTime"],
  ["HerstellerEAN", "string"],
  ["Kurzbeschreibung", "string"],
  ["Position", "int"],
  ["Preisgruppe", "guid"],
  ["MetaTitel", "string"],
  ["MetaBeschreibung", "string"],
  ["MetaKeywords", "string"],
  ["Veroeffentlichungsdatum", "dateTime"],
  ["MindestBestellmenge", "double"],
  ["MaximalBestellmenge", "double"],
  ["KostenloseLiefung", "boolean"],
  ["TopArtikel", "boolean"],
  ["OnSale", "boolean"],
  ["Kategorien", "string"],
  ["ArtikelKlassifizierung1", "string"],
  ["ArtikelKlassifizierung2", "string"],
  ["ArtikelKlassifizierung3", "string"],
  ["EKNettoAvg", "decimal"],
  ["EKBruttoAvg", "decimal"],
  ["LetzterEKNetto", "decimal"],
  ["LetzterEKBrutto", "decimal"],
  ["HinterlegterEKNettoAvg", "decimal"],
  ["HinterlegterEKBruttoAvg", "decimal"],
  ["GrFa", "boolean"],
  ["Matchcode", "string"],
  ["Bezeichnung2", "string"],
  ["Bezeichnung3", "string"],
  ["Rabattsperre", "boolean"],
  ["Modelljahr", "string"],
  ["Rahmennummerpflichtig", "boolean"],
  ["IStatus", "boolean"],
  ["Seriennummer", "boolean"],
  ["Fedas", "int"],
  ["Herstellernummer", "string"],
  ["Bidex", "int"],
  ["I_VKnetto", "decimal"],
  ["I_VKbrutto", "decimal"],
  ["Versandkostenaufschlag", "decimal"],
  ["I_RotstiftpreisNetto", "decimal"],
  ["I_RotstiftpreisBrutto", "decimal"],
  ["I_IstOnlineAktiv", "boolean"],
  ["I_NeuerArtikel", "boolean"],
  ["I_NurAbholung", "boolean"],
  ["I_TextBezeichnung1", "string"],
  ["I_TextBezeichnung2", "string"],
  ["I_TextBezeichnung3", "string"],
  ["I_Beschreibung1", "string"],
  ["I_Beschreibung2", "string"],
  ["I_Beschreibung3", "string"],
  ["I_Beschreibung", "string"],
]

export const GRFA_KOMBI_FIELDS: FieldList = [
  ["ArtikelGrFaKombiID", "guid"],
  ["Artikel", "guid"],
  ["Groesse", "guid"],
  ["Farbe", "guid"],
  ["Artikelnummer", "string"],
  ["EAN", "string"],
  ["CreateDate", "dateTime"],
  ["LastChange", "dateTime"],
  ["Barcode", "string"],
  ["FarbeBezeichnung", "string"],
  ["GroesseBezeichnung", "string"],
]

export const STOCK_BRANCH_FIELDS: FieldList = [
  ["StockBranchID", "guid"],
  ["ArtikelID", "guid"],
  ["Artikelbezeichnung", "string"],
  ["Artikelnummer", "string"],
  ["Bestellt", "double"],
  ["Reserviert", "double"],
  ["Lagerbestand", "double"],
  ["MengeVerfuegbar", "double"],
  ["Filialname", "string"],
  ["LastChange", "dateTime"],
]

export const STOCK_COLOR_SIZE_BRANCH_FIELDS: FieldList = [
  ["StockColorSizeBranchID", "guid"],
  ["ArtikelID", "guid"],
  ["Artikelbezeichnung", "string"],
  ["Artikelnummer", "string"],
  ["Bestellt", "double"],
  ["Reserviert", "double"],
  ["Lagerbestand", "double"],
  ["MengeVerfuegbar", "double"],
  ["Color", "string"],
  ["Size", "string"],
  ["Filialname", "string"],
  ["ArtikelGrFaKombinationenID", "guid"],
  ["LastChange", "dateTime"],
  ["Barcode", "string"],
]

export const STOCK_BY_ARTIKEL_FIELDS: FieldList = [
  ["StockID", "guid"],
  ["ArtikelID", "guid"],
  ["Artikelbezeichnung", "string"],
  ["Artikelnummer", "string"],
  ["BestelltGesamt", "double"],
  ["BestelltLokaleFiliale", "double"],
  ["ReserviertGesamt", "double"],
  ["ReserviertLokaleFiliale", "double"],
  ["LagerbestandGesamt", "double"],
  ["LagerbestandLokaleFiliale", "double"],
  ["MengeVerfuegbarGesamt", "double"],
  ["MengeVerfuegbarLokaleFiliale", "double"],
]

export const ORDER_STATE_FIELDS: FieldList = [
  ["WebShopOrderID", "int"],
  ["OrderState", "string"],
]

export const ORDER_FIELDS: FieldList = [
  ["WebShopOrderID", "int"],
  ["Kundennummer", "int"],
  ["Payment", "string"],
  ["Bezahlt", "boolean"],
  ["Referenztext", "string"],
  ["Comment", "string"],
  ["OrderCompletedDate", "dateTime"],
  ["OrderImportData", "dateTime"],
  ["ShippingCost", "decimal"],
  ["DeliveryTerm", "string"],
  ["Filialname", "string"],
  ["ausgeglichenAm", "dateTime"],
  ["VKOrderID", "guid"],
  ["OrderImportDate", "dateTime"],
]

export const CUSTOMER_EXT_FIELDS: FieldList = [
  ["Kundennummer", "int"],
  ["Extern_ID", "string"],
  ["Anrede", "string"],
  ["Kundenname", "string"],
  ["Name2", "string"],
  ["Firmenkunde", "boolean"],
  ["Mehrwertsteuercode", "string"],
  ["Telefon", "string"],
  ["TelefonMobil", "string"],
  ["Fax", "string"],
  ["Email", "string"],
  ["Geburtsdatum", "dateTime"],
  ["UstID", "string"],
  ["Mailingsperre", "boolean"],
  ["UserID", "string"],
  ["UserPassword", "string"],
  ["Strasse", "string"],
  ["Ort", "string"],
  ["Land", "string"],
  ["Postleitzahl", "string"],
  ["Adresszusatz", "string"],
  ["IsOneTimeCustomer", "boolean"],
  ["LastChange", "dateTime"],
]

export const ADRESS_FIELDS: FieldList = [
  ["Kundennummer", "int"],
  ["AdressID", "guid"],
  ["Name", "string"],
  ["Name2", "string"],
  ["Strasse", "string"],
  ["Ort", "string"],
  ["Land", "string"],
  ["Postleitzahl", "string"],
  ["Telefonnummer", "string"],
  ["Beschreibung", "string"],
  ["Anrede", "string"],
]

export const ORDER_ITEMS_FIELDS: FieldList = [
  ["Provision", "decimal"],
  ["Discount", "decimal"],
  ["LinItemID", "string"],
  ["WebshopArtikelnummer", "string"],
  ["Artikelnummer", "string"],
  ["Bezeichnung", "string"],
  ["VKBrutto", "decimal"],
  ["MwStBetrag", "decimal"],
  ["MwStProzent", "decimal"],
  ["SummeVKBrutto", "decimal"],
  ["Quantity", "double"],
  ["QuantityUnit", "string"],
  ["ArtikelGrFaKombiID", "guid"],
  ["ArtikelID", "guid"],
  ["Positionsnummer", "int"],
  ["EAN", "string"],
  ["Barcode", "string"],
]
