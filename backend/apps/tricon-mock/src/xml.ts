import { XMLParser } from "fast-xml-parser"
import type { FieldList, FieldType } from "./reference-fields.ts"

export const SOAP11_NS = "http://schemas.xmlsoap.org/soap/envelope/"
export const SOAP12_NS = "http://www.w3.org/2003/05/soap-envelope"
export const TEMPURI_NS = "http://tempuri.org/"
export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000"

export type SoapVersion = "1.1" | "1.2"

/** Parsed XML node: text content or nested children (repeated elements become arrays). */
export type XmlNode = string | XmlObject | XmlNode[]
export type XmlObject = { [key: string]: XmlNode }

export class SoapFault extends Error {
  code: "Client" | "Server"

  constructor(code: "Client" | "Server", message: string) {
    super(message)
    this.code = code
  }
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
}

/**
 * Decodes only the five predefined XML entities and numeric character
 * references. Entity processing in the parser is off (XXE hardening), so this
 * is the single place text gets unescaped. Anything else (e.g. `&xxe;`) is
 * left as literal text.
 */
export function decodeXmlText(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, ref: string) => {
    if (ref.startsWith("#x") || ref.startsWith("#X")) {
      const code = Number.parseInt(ref.slice(2), 16)
      return isValidCodePoint(code) ? String.fromCodePoint(code) : match
    }
    if (ref.startsWith("#")) {
      const code = Number.parseInt(ref.slice(1), 10)
      return isValidCodePoint(code) ? String.fromCodePoint(code) : match
    }
    return XML_ENTITIES[ref] ?? match
  })
}

function isValidCodePoint(code: number) {
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff
}

// Characters not allowed in XML 1.0 documents.
const INVALID_XML_CHARS = /[^\u0009\u000a\u000d -퟿-�\u{10000}-\u{10ffff}]/gu

export function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(INVALID_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  processEntities: false,
  htmlEntities: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
  tagValueProcessor: (_name: string, value: string) => decodeXmlText(value),
})

export type ParsedEnvelope = {
  version: SoapVersion
  operation: string
  body: XmlObject
}

/**
 * Parses a SOAP envelope and returns the Body's first child element. DTDs are
 * rejected outright; the parser additionally runs with entity processing off.
 */
export function parseEnvelope(raw: string): ParsedEnvelope {
  if (/<!DOCTYPE/i.test(raw) || /<!ENTITY/i.test(raw)) {
    throw new SoapFault("Client", "DTD is not allowed")
  }

  let doc: XmlObject
  try {
    doc = parser.parse(raw, true) as XmlObject
  } catch (error) {
    throw new SoapFault("Client", `Malformed XML: ${(error as Error).message}`)
  }

  const envelope = doc.Envelope
  if (!isObject(envelope)) {
    throw new SoapFault("Client", "Missing SOAP Envelope")
  }
  const body = envelope.Body
  if (!isObject(body)) {
    throw new SoapFault("Client", "Missing SOAP Body")
  }

  const operation = Object.keys(body)[0]
  if (!operation) {
    throw new SoapFault("Client", "Empty SOAP Body")
  }

  const opNode = body[operation]
  return {
    version: raw.includes(SOAP12_NS) ? "1.2" : "1.1",
    operation,
    body: isObject(opNode) ? opNode : {},
  }
}

export function isObject(node: unknown): node is XmlObject {
  return typeof node === "object" && node !== null && !Array.isArray(node)
}

/** Case-insensitive child lookup (TriData's own casing is inconsistent). */
export function child(node: XmlNode | undefined, name: string): XmlNode | undefined {
  if (!isObject(node)) {
    return undefined
  }
  if (name in node) {
    return node[name]
  }
  const lower = name.toLowerCase()
  const key = Object.keys(node).find((k) => k.toLowerCase() === lower)
  return key === undefined ? undefined : node[key]
}

export function text(node: XmlNode | undefined): string {
  if (typeof node === "string") {
    return node
  }
  if (Array.isArray(node)) {
    return text(node[0])
  }
  return ""
}

export function asArray(node: XmlNode | undefined): XmlNode[] {
  if (node === undefined || node === "") {
    return []
  }
  return Array.isArray(node) ? node : [node]
}

/** Reads every field of a reference data format from an uploaded record. */
export function readRecord(node: XmlNode | undefined, fields: FieldList): Record<string, string> {
  const record: Record<string, string> = {}
  for (const [name] of fields) {
    record[name] = text(child(node, name))
  }
  return record
}

export function formatValue(type: FieldType, value: unknown): string {
  if (value === undefined || value === null || value === "") {
    switch (type) {
      case "double":
      case "decimal":
      case "int":
        return "0"
      case "boolean":
        return "false"
      case "guid":
        return EMPTY_GUID
      default:
        return ""
    }
  }
  switch (type) {
    case "boolean":
      return value === true || value === "true" ? "true" : "false"
    case "decimal":
      return typeof value === "number" ? value.toFixed(2) : String(value)
    case "double":
    case "int":
      return typeof value === "number" ? String(value) : String(value)
    default:
      return String(value)
  }
}

/** Serialises a record with every field of the list, in reference order. */
export function recordXml(
  fields: FieldList,
  values: Record<string, unknown>,
  indent: string
): string {
  return fields
    .map(([name, type]) => {
      const value = formatValue(type, values[name])
      return value === ""
        ? `${indent}<${name} />`
        : `${indent}<${name}>${escapeXml(value)}</${name}>`
    })
    .join("\n")
}

export function envelope(version: SoapVersion, bodyXml: string): string {
  const ns = version === "1.2" ? SOAP12_NS : SOAP11_NS
  return [
    "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
    `<soap:Envelope xmlns:soap="${ns}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">`,
    "  <soap:Body>",
    bodyXml,
    "  </soap:Body>",
    "</soap:Envelope>",
    "",
  ].join("\n")
}

export function faultXml(version: SoapVersion, fault: SoapFault): string {
  if (version === "1.2") {
    const code = fault.code === "Client" ? "soap:Sender" : "soap:Receiver"
    return envelope(
      version,
      [
        "    <soap:Fault>",
        `      <soap:Code><soap:Value>${code}</soap:Value></soap:Code>`,
        `      <soap:Reason><soap:Text xml:lang="en">${escapeXml(fault.message)}</soap:Text></soap:Reason>`,
        "    </soap:Fault>",
      ].join("\n")
    )
  }
  return envelope(
    version,
    [
      "    <soap:Fault>",
      `      <faultcode>soap:${fault.code}</faultcode>`,
      `      <faultstring>${escapeXml(fault.message)}</faultstring>`,
      "    </soap:Fault>",
    ].join("\n")
  )
}
