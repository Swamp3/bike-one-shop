/**
 * SOAP 1.1 envelope building and response parsing for TriCon.
 *
 * Wire shape: planning/3-Architecture_Tech_Stack/tricon-mock-contract.md.
 * The namespace and wrapper element names (`<Fn>`, `<FnResponse>`,
 * `<FnResult>`) are our assumption of a typical .NET ASMX service; the real
 * WSDL may differ, so every envelope detail lives in this one file.
 *
 * XML hardening (XXE): any response containing a DOCTYPE is rejected before
 * parsing, and the parser runs with entity processing disabled. Only the five
 * predefined XML entities and numeric character references are decoded, by
 * hand, after parsing.
 */
import { XMLParser } from "fast-xml-parser"

export const TRIDATA_DEFAULT_NAMESPACE = "http://tempuri.org/"
const SOAP_ENV_NS = "http://schemas.xmlsoap.org/soap/envelope/"

export type SoapScalar = string | number | boolean | Date
export type SoapValue =
  | SoapScalar
  | null
  | undefined
  | SoapObject
  | SoapValue[]
export interface SoapObject {
  [key: string]: SoapValue
}

// --- Errors ------------------------------------------------------------------

/** Base class for every TriCon client error; carries the call's correlation id once known. */
export class TridataError extends Error {
  correlationId?: string
  durationMs?: number

  constructor(message: string) {
    super(message)
    this.name = "TridataError"
  }
}

/** The server answered with a SOAP fault (TriCon rejected the call). */
export class TridataSoapFaultError extends TridataError {
  constructor(
    readonly faultCode: string,
    readonly faultString: string,
    readonly httpStatus?: number
  ) {
    super(`SOAP fault ${faultCode}: ${faultString}`)
    this.name = "TridataSoapFaultError"
  }
}

/** Network failure, timeout, or a non-SOAP HTTP error response. */
export class TridataTransportError extends TridataError {
  constructor(message: string, readonly httpStatus?: number) {
    super(message)
    this.name = "TridataTransportError"
  }
}

/** The response was not a SOAP envelope we understand (or was rejected for safety). */
export class TridataResponseError extends TridataError {
  constructor(message: string) {
    super(message)
    this.name = "TridataResponseError"
  }
}

export class TridataNotConfiguredError extends TridataError {
  constructor() {
    super(
      "TridataClient is not configured: set TRIDATA_ENDPOINT_URL (or TRIDATA_WSDL_URL) and TRIDATA_IDENTIFY_GUID"
    )
    this.name = "TridataNotConfiguredError"
  }
}

// --- Value formatting --------------------------------------------------------

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

const pad = (n: number) => String(n).padStart(2, "0")

/** `YYYY-MM-DDTHH:mm:ss`, UTC, no suffix (contract "Value formats"). */
export function formatTridataDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  )
}

const TRIDATA_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,7})?(Z|[+-]\d{2}:?\d{2})?$/i

/**
 * Parses a TriCon dateTime: `YYYY-MM-DDTHH:mm:ss`, optional fraction and
 * optional `Z`/offset; without an offset it is UTC (contract). Returns null
 * for empty or malformed input.
 */
export function parseTridataDateTime(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null
  }
  const match = TRIDATA_DATETIME.exec(value.trim())
  if (!match) {
    return null
  }
  const [, y, mo, d, h, mi, sec, fraction, zone] = match
  const ms = fraction ? Math.floor(Number(fraction) * 1000) : 0
  let time = Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec, ms)
  if (zone && zone.toUpperCase() !== "Z") {
    const sign = zone.startsWith("-") ? -1 : 1
    const digits = zone.slice(1).replace(":", "")
    time -= sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4))) * 60_000
  }
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatScalar(value: SoapScalar): string {
  if (value instanceof Date) {
    return formatTridataDateTime(value)
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TridataError(`Cannot serialize non-finite number ${value}`)
    }
    // Plain `.` decimal separator, no exponent for the magnitudes we send.
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
  }
  return escapeXml(value)
}

/**
 * Serializes one element. Arrays become repeated elements of the same name,
 * null/undefined are omitted entirely, nested objects keep insertion order.
 */
export function serializeElement(
  name: string,
  value: SoapValue,
  indent = ""
): string {
  if (value === null || value === undefined) {
    return ""
  }
  if (Array.isArray(value)) {
    return value.map((entry) => serializeElement(name, entry, indent)).join("")
  }
  if (typeof value === "object" && !(value instanceof Date)) {
    const children = Object.entries(value)
      .map(([key, child]) => serializeElement(key, child, indent + "  "))
      .join("")
    return children
      ? `${indent}<${name}>\n${children}${indent}</${name}>\n`
      : `${indent}<${name}/>\n`
  }
  return `${indent}<${name}>${formatScalar(value)}</${name}>\n`
}

export type BuildEnvelopeOptions = {
  namespace?: string
}

/**
 * Builds the request envelope. `params` are the operation's child elements in
 * order; the caller decides where IdentifyGuid goes (first, per contract).
 */
export function buildSoapEnvelope(
  functionName: string,
  params: SoapObject,
  options: BuildEnvelopeOptions = {}
): string {
  const namespace = options.namespace ?? TRIDATA_DEFAULT_NAMESPACE
  const body = Object.entries(params)
    .map(([key, value]) => serializeElement(key, value, "      "))
    .join("")
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<soap:Envelope xmlns:soap="${SOAP_ENV_NS}">\n` +
    `  <soap:Body>\n` +
    `    <${functionName} xmlns="${escapeXml(namespace)}">\n` +
    body +
    `    </${functionName}>\n` +
    `  </soap:Body>\n` +
    `</soap:Envelope>\n`
  )
}

export function soapActionHeader(
  functionName: string,
  namespace = TRIDATA_DEFAULT_NAMESPACE
): string {
  const base = namespace.endsWith("/") ? namespace : `${namespace}/`
  return `"${base}${functionName}"`
}

// --- Parsing -----------------------------------------------------------------

const PREDEFINED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
}

/** Decodes only the predefined XML entities and numeric character references. */
export function decodeXmlEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g,
    (match, entity: string) => {
      if (entity.startsWith("#x")) {
        return safeFromCodePoint(parseInt(entity.slice(2), 16), match)
      }
      if (entity.startsWith("#")) {
        return safeFromCodePoint(parseInt(entity.slice(1), 10), match)
      }
      return PREDEFINED_ENTITIES[entity] ?? match
    }
  )
}

function safeFromCodePoint(codePoint: number, fallback: string): string {
  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return fallback
  }
}

const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  // Entity/DTD processing off (XXE); predefined entities decoded by hand below.
  processEntities: false,
  htmlEntities: false,
  // Keep every value a string: GUIDs, article numbers with leading zeros etc.
  // must not be coerced to numbers. Callers convert explicitly.
  parseTagValue: false,
  trimValues: true,
  tagValueProcessor: (_name: string, value: string) => decodeXmlEntities(value),
})

export type ParsedXml = string | ParsedXmlObject | ParsedXml[]
export interface ParsedXmlObject {
  [key: string]: ParsedXml
}

function isObject(value: unknown): value is ParsedXmlObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseXml(xml: string): ParsedXmlObject {
  if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml)) {
    throw new TridataResponseError(
      "Rejected SOAP response containing a DOCTYPE/ENTITY declaration"
    )
  }
  let parsed: unknown
  try {
    parsed = parser.parse(xml)
  } catch (e) {
    throw new TridataResponseError(
      `Malformed XML in SOAP response: ${(e as Error).message}`
    )
  }
  if (!isObject(parsed)) {
    throw new TridataResponseError("Empty SOAP response")
  }
  return parsed
}

/** Extracts a SOAP fault from a parsed envelope, if present. */
function findFault(body: ParsedXmlObject): { code: string; message: string } | null {
  const fault = body.Fault
  if (fault === undefined) {
    return null
  }
  const faultObj = isObject(fault) ? fault : {}
  // SOAP 1.1 (faultcode/faultstring) with a SOAP 1.2 (Code/Reason) fallback.
  const code =
    asText(faultObj.faultcode) ||
    asText(isObject(faultObj.Code) ? faultObj.Code.Value : undefined) ||
    "unknown"
  const message =
    asText(faultObj.faultstring) ||
    asText(isObject(faultObj.Reason) ? faultObj.Reason.Text : undefined) ||
    "unknown fault"
  return { code, message }
}

/**
 * Parses a response envelope and returns the content of `<FnResult>`:
 * a string for scalar results (`true`), an object for record results, `""`
 * for an empty result element, or `undefined` when `<FnResult>` is absent.
 * Throws TridataSoapFaultError for faults, TridataResponseError otherwise.
 */
export function parseSoapResponse(
  functionName: string,
  xml: string,
  httpStatus?: number
): ParsedXml | undefined {
  const doc = parseXml(xml)
  const envelope = doc.Envelope
  if (!isObject(envelope)) {
    throw new TridataResponseError("Response is not a SOAP envelope")
  }
  const body = envelope.Body
  if (!isObject(body)) {
    if (body === "") {
      throw new TridataResponseError("SOAP body is empty")
    }
    throw new TridataResponseError("SOAP envelope has no Body")
  }
  const fault = findFault(body)
  if (fault) {
    throw new TridataSoapFaultError(fault.code, fault.message, httpStatus)
  }
  const response = body[`${functionName}Response`]
  if (response === undefined) {
    throw new TridataResponseError(
      `SOAP body has no ${functionName}Response element`
    )
  }
  if (!isObject(response)) {
    return response === "" ? undefined : response
  }
  return response[`${functionName}Result`]
}

// --- Result helpers ------------------------------------------------------------

export function asText(value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return ""
}

/** Normalizes the repeated record elements under a list result to an array. */
export function extractList(
  result: ParsedXml | undefined,
  recordName: string
): ParsedXmlObject[] {
  if (!isObject(result)) {
    return []
  }
  const value = result[recordName]
  if (value === undefined) {
    return []
  }
  const entries = Array.isArray(value) ? value : [value]
  return entries.map((entry) => (isObject(entry) ? entry : {}))
}

/** For single-record results: the record's fields sit directly in `<FnResult>`. */
export function extractRecord(result: ParsedXml | undefined): ParsedXmlObject {
  return isObject(result) ? result : {}
}

export function extractBoolean(result: ParsedXml | undefined): boolean {
  return asText(result).trim().toLowerCase() === "true"
}

/**
 * Strict numeric field: throws TridataResponseError when the element is
 * missing, empty or not a number. Used for stock quantities, where writing
 * 0 for a missing value would silently zero out stock.
 */
export function requireNumber(
  record: ParsedXmlObject,
  field: string,
  context: string
): number {
  const text = asText(record[field]).trim()
  const parsed = text ? Number(text) : NaN
  if (!Number.isFinite(parsed)) {
    throw new TridataResponseError(
      `${context}: field ${field} is ${text ? `not a number (${JSON.stringify(text.slice(0, 40))})` : "missing"}`
    )
  }
  return parsed
}

export function toNumber(value: unknown): number {
  const text = asText(value).trim()
  if (!text) {
    return 0
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : 0
}

export function toBoolean(value: unknown): boolean {
  const text = asText(value).trim().toLowerCase()
  return text === "true" || text === "1"
}

// --- Transport -----------------------------------------------------------------

/** Responses above this are aborted (a full catalog is a few MB at most). */
export const MAX_RESPONSE_BYTES = 20 * 1024 * 1024

/** Reads the body as UTF-8, aborting the request once it exceeds `maxBytes`. */
export async function readBodyCapped(
  response: Response,
  maxBytes: number,
  controller?: AbortController
): Promise<string> {
  const tooLarge = () => {
    controller?.abort()
    return new TridataTransportError(
      `TriCon response exceeds ${Math.round(maxBytes / 1024 / 1024)} MB limit`,
      response.status
    )
  }
  const declared = Number(response.headers?.get?.("content-length"))
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw tooLarge()
  }
  const reader = response.body?.getReader?.()
  if (!reader) {
    const text = await response.text()
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw tooLarge()
    }
    return text
  }
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw tooLarge()
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString("utf8")
}

export type SoapCallOptions = {
  endpointUrl: string
  functionName: string
  params: SoapObject
  namespace?: string
  timeoutMs?: number
  maxResponseBytes?: number
  fetchImpl?: typeof fetch
}

/** Performs one SOAP call and returns the parsed `<FnResult>` content. */
export async function soapCall(
  options: SoapCallOptions
): Promise<ParsedXml | undefined> {
  const namespace = options.namespace ?? TRIDATA_DEFAULT_NAMESPACE
  const fetchImpl = options.fetchImpl ?? fetch
  const envelope = buildSoapEnvelope(options.functionName, options.params, {
    namespace,
  })
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? 15000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let status: number
  let text: string
  const maxBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES
  try {
    const response = await fetchImpl(options.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: soapActionHeader(options.functionName, namespace),
      },
      body: envelope,
      signal: controller.signal,
    })
    status = response.status
    text = await readBodyCapped(response, maxBytes, controller)
  } catch (e) {
    const err = e as Error
    if (err instanceof TridataError) {
      throw err
    }
    if (err.name === "AbortError") {
      throw new TridataTransportError(
        `TriCon request timed out after ${timeoutMs}ms`
      )
    }
    throw new TridataTransportError(`TriCon request failed: ${err.message}`)
  } finally {
    clearTimeout(timer)
  }

  const looksLikeSoap = /<(\w+:)?Envelope[\s>]/.test(text)
  if (status >= 400 && !looksLikeSoap) {
    throw new TridataTransportError(
      `TriCon responded with HTTP ${status}`,
      status
    )
  }
  return parseSoapResponse(options.functionName, text, status)
}
