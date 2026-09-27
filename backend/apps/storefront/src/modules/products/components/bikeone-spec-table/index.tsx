import { HttpTypes } from "@medusajs/types"

/**
 * Only real, seeded fields — no fabricated frame/fork/groupset/wheel specs.
 * Most of Medusa's spec-shaped fields (material, origin_country,
 * dimensions) aren't populated on today's seed data, so those rows are
 * left out rather than shown as "–". Detailed technical specs are real
 * catalog data that will come from the TriCon/Tridata sync (see PLAN.md),
 * not something to invent here.
 */
const BikeOneSpecTable = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const frameSizes = Array.from(
    new Set(
      (product.options ?? [])
        .find((o) => o.title === "Frame Size")
        ?.values?.map((v) => v.value) ?? []
    )
  )

  const rows: { label: string; value: string }[] = []

  if (product.collection?.title) {
    rows.push({ label: "Marke", value: product.collection.title })
  }
  if (frameSizes.length) {
    rows.push({ label: "Rahmengrößen", value: frameSizes.join(" / ") })
  }
  if (product.weight) {
    rows.push({
      label: "Gewicht",
      value: `ca. ${(product.weight / 1000).toLocaleString("de-DE", {
        maximumFractionDigits: 1,
      })} kg`,
    })
  }
  if (product.material) {
    rows.push({ label: "Material", value: product.material })
  }

  if (!rows.length) return null

  return (
    <div className="overflow-x-auto">
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
    </div>
  )
}

export default BikeOneSpecTable
