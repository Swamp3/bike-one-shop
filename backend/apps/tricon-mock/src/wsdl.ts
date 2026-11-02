import {
  ADRESS_FIELDS,
  CUSTOMER_EXT_FIELDS,
  ORDER_FIELDS,
  ORDER_ITEMS_FIELDS,
  type FieldList,
  type FieldType,
} from "./reference-fields.ts"
import { FUNCTIONS } from "./soap.ts"
import { TEMPURI_NS, escapeXml } from "./xml.ts"

const XSD_TYPES: Record<FieldType | string, string> = {
  guid: "tns:guid",
  string: "s:string",
  double: "s:double",
  decimal: "s:decimal",
  int: "s:int",
  boolean: "s:boolean",
  dateTime: "s:dateTime",
  TO: "tns:TO",
}

function sequence(fields: FieldList | [string, string][], indent: string) {
  return fields
    .map(([name, type]) => {
      const xsd = XSD_TYPES[type] ?? "s:string"
      return `${indent}<s:element minOccurs="0" maxOccurs="1" name="${name}" type="${xsd}" />`
    })
    .join("\n")
}

function complexType(name: string, fields: FieldList | [string, string][]) {
  return [
    `      <s:complexType name="${name}">`,
    "        <s:sequence>",
    sequence(fields, "          "),
    "        </s:sequence>",
    "      </s:complexType>",
  ].join("\n")
}

/**
 * Builds the WSDL (SOAP 1.1, document/literal, ASMX-style) for the functions
 * the mock implements. Informational only: the shop client does not read it.
 */
export function buildWsdl(endpointUrl: string): string {
  const types: string[] = [
    "      <s:simpleType name=\"guid\">",
    "        <s:restriction base=\"s:string\">",
    "          <s:pattern value=\"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\" />",
    "        </s:restriction>",
    "      </s:simpleType>",
    complexType("Order", ORDER_FIELDS),
    complexType("CustomerExt", CUSTOMER_EXT_FIELDS),
    complexType("Adress", ADRESS_FIELDS),
    complexType("OrderItems", ORDER_ITEMS_FIELDS),
    [
      "      <s:complexType name=\"ArrayOfOrderItems\">",
      "        <s:sequence>",
      "          <s:element minOccurs=\"0\" maxOccurs=\"unbounded\" name=\"OrderItemsObj\" type=\"tns:OrderItems\" />",
      "        </s:sequence>",
      "      </s:complexType>",
      "      <s:complexType name=\"TO\">",
      "        <s:sequence>",
      "          <s:element minOccurs=\"0\" maxOccurs=\"1\" name=\"DeliverAdress\" type=\"tns:Adress\" />",
      "          <s:element minOccurs=\"1\" maxOccurs=\"1\" name=\"Customer\" type=\"tns:CustomerExt\" />",
      "          <s:element minOccurs=\"1\" maxOccurs=\"1\" name=\"Order\" type=\"tns:Order\" />",
      "          <s:element minOccurs=\"0\" maxOccurs=\"1\" name=\"OrderItemsList\" type=\"tns:ArrayOfOrderItems\" />",
      "        </s:sequence>",
      "      </s:complexType>",
    ].join("\n"),
  ]
  const recordTypes = new Set<string>()
  const messages: string[] = []
  const portOps: string[] = []
  const bindingOps: string[] = []

  for (const [fn, spec] of Object.entries(FUNCTIONS)) {
    const params: [string, string][] = [["IdentifyGuid", "guid"], ...spec.params]
    types.push(
      [
        `      <s:element name="${fn}">`,
        "        <s:complexType>",
        "          <s:sequence>",
        sequence(params, "            "),
        "          </s:sequence>",
        "        </s:complexType>",
        "      </s:element>",
      ].join("\n")
    )

    let resultType: string
    const { result } = spec
    if (result.boolean) {
      resultType = "s:boolean"
    } else if (result.single) {
      resultType = `tns:${fn}Record`
      types.push(complexType(`${fn}Record`, result.fields ?? []))
    } else {
      const recordName = result.recordName ?? "Record"
      if (!recordTypes.has(recordName)) {
        recordTypes.add(recordName)
        types.push(complexType(recordName, result.fields ?? []))
        types.push(
          [
            `      <s:complexType name="ArrayOf${recordName}">`,
            "        <s:sequence>",
            `          <s:element minOccurs="0" maxOccurs="unbounded" name="${recordName}" type="tns:${recordName}" />`,
            "        </s:sequence>",
            "      </s:complexType>",
          ].join("\n")
        )
      }
      resultType = `tns:ArrayOf${recordName}`
    }
    types.push(
      [
        `      <s:element name="${fn}Response">`,
        "        <s:complexType>",
        "          <s:sequence>",
        `            <s:element minOccurs="0" maxOccurs="1" name="${fn}Result" type="${resultType}" />`,
        "          </s:sequence>",
        "        </s:complexType>",
        "      </s:element>",
      ].join("\n")
    )

    messages.push(
      `  <wsdl:message name="${fn}SoapIn"><wsdl:part name="parameters" element="tns:${fn}" /></wsdl:message>`,
      `  <wsdl:message name="${fn}SoapOut"><wsdl:part name="parameters" element="tns:${fn}Response" /></wsdl:message>`
    )
    portOps.push(
      [
        `    <wsdl:operation name="${fn}">`,
        `      <wsdl:input message="tns:${fn}SoapIn" />`,
        `      <wsdl:output message="tns:${fn}SoapOut" />`,
        "    </wsdl:operation>",
      ].join("\n")
    )
    bindingOps.push(
      [
        `    <wsdl:operation name="${fn}">`,
        `      <soap:operation soapAction="${TEMPURI_NS}${fn}" style="document" />`,
        "      <wsdl:input><soap:body use=\"literal\" /></wsdl:input>",
        "      <wsdl:output><soap:body use=\"literal\" /></wsdl:output>",
        "    </wsdl:operation>",
      ].join("\n")
    )
  }

  return [
    "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
    "<!-- TriCon mock WSDL (hand-assembled from the interface reference). Envelope details are an assumption of a typical ASMX service. -->",
    `<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/" xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/" xmlns:s="http://www.w3.org/2001/XMLSchema" xmlns:tns="${TEMPURI_NS}" targetNamespace="${TEMPURI_NS}">`,
    "  <wsdl:types>",
    `    <s:schema elementFormDefault="qualified" targetNamespace="${TEMPURI_NS}">`,
    types.join("\n"),
    "    </s:schema>",
    "  </wsdl:types>",
    messages.join("\n"),
    "  <wsdl:portType name=\"TriConMockSoap\">",
    portOps.join("\n"),
    "  </wsdl:portType>",
    "  <wsdl:binding name=\"TriConMockSoap\" type=\"tns:TriConMockSoap\">",
    "    <soap:binding transport=\"http://schemas.xmlsoap.org/soap/http\" />",
    bindingOps.join("\n"),
    "  </wsdl:binding>",
    "  <wsdl:service name=\"TriConMock\">",
    "    <wsdl:port name=\"TriConMockSoap\" binding=\"tns:TriConMockSoap\">",
    `      <soap:address location="${escapeXml(endpointUrl)}" />`,
    "    </wsdl:port>",
    "  </wsdl:service>",
    "</wsdl:definitions>",
    "",
  ].join("\n")
}
