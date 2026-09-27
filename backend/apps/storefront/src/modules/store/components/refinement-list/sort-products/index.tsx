"use client"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: string) => void
  "data-testid"?: string
}

const sortOptions: { value: SortOptions; label: string }[] = [
  { value: "created_at", label: "Neuheiten" },
  { value: "price_asc", label: "Preis aufsteigend" },
  { value: "price_desc", label: "Preis absteigend" },
]

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  return (
    <div className="flex items-center gap-2 text-[13px] text-bo-ink-muted">
      <label htmlFor="sortSelect">Sortieren:</label>
      <select
        id="sortSelect"
        data-testid={dataTestId}
        value={sortBy}
        onChange={(e) => setQueryParams("sortBy", e.target.value)}
        className="cursor-pointer rounded-[7px] border border-bo-line bg-bo-surface px-2.5 py-2 text-[13px] text-bo-ink"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default SortProducts
