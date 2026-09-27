import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type Crumb = { label: string; href?: string }

const PlpBreadcrumb = ({ items }: { items: Crumb[] }) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2.5 text-[12.5px] text-bo-ink-muted md:px-6">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-bo-ink-faint">/</span>}
          {item.href ? (
            <LocalizedClientLink
              href={item.href}
              className="hover:text-bo-accent hover:underline"
            >
              {item.label}
            </LocalizedClientLink>
          ) : (
            <span className="font-semibold text-bo-ink">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

export default PlpBreadcrumb
