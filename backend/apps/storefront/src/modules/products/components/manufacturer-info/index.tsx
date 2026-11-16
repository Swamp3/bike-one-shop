"use client"

import { HttpTypes } from "@medusajs/types"

import { useProductOptionsContext } from "@modules/products/components/product-options-context"

const text = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : undefined

/**
 * GPSR block: manufacturer, product identifier, safety information.
 * Data contract: brand = Medusa collection, manufacturer data in
 * `collection.metadata` (manufacturer_name, manufacturer_address,
 * manufacturer_email), warnings in `product.metadata.safety_info`.
 * Only fields that exist are rendered; nothing is invented.
 * shortcut: no manufacturer data is entered yet (TODO.md), so only model and
 * SKU show today; fill it in the Medusa admin per collection before go-live.
 */
export default function ManufacturerInfo({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const { options } = useProductOptionsContext()
  const variant = product.variants?.find(
    (v) =>
      !!v.options?.length &&
      v.options.every((o) => !o.option_id || options[o.option_id] === o.value)
  )

  const meta = product.collection?.metadata
  const name = text(meta?.manufacturer_name)
  const address = text(meta?.manufacturer_address)
  const email = text(meta?.manufacturer_email)
  const safety = text(product.metadata?.safety_info)

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Modell", value: product.title },
  ]
  if (variant?.sku) rows.push({ label: "Artikelnummer (SKU)", value: variant.sku })
  if (name) rows.push({ label: "Hersteller", value: name })
  if (address) {
    rows.push({
      label: "Anschrift",
      value: <span className="whitespace-pre-line">{address}</span>,
    })
  }
  if (email) {
    rows.push({
      label: "Kontakt",
      value: (
        <a href={`mailto:${email}`} className="underline underline-offset-2">
          {email}
        </a>
      ),
    })
  }

  return (
    <section className="px-4 py-7 md:px-6 md:py-9" data-testid="manufacturer-info">
      <h2 className="m-0 mb-4 font-heading text-[20px] font-semibold">
        Herstellerinformationen
      </h2>
      <table className="w-full border-collapse text-[13.5px]">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-bo-line last:border-b-0">
              <th className="w-[42%] py-2.5 pr-3 text-left align-top font-mono text-[11.5px] font-semibold uppercase tracking-wide text-bo-ink-faint">
                {row.label}
              </th>
              <td className="py-2.5 text-bo-ink">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {safety && (
        <div className="mt-4 max-w-[70ch]">
          <h3 className="m-0 mb-1 font-heading text-[14px] font-semibold">
            Sicherheitshinweise
          </h3>
          <p className="m-0 whitespace-pre-line text-[13.5px] leading-relaxed text-bo-ink-muted">
            {safety}
          </p>
        </div>
      )}
    </section>
  )
}
