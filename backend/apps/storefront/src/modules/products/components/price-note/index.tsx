/**
 * PAngV note next to a price. Pass `href` on the product page to link
 * "Versand" to the shipping section; cards are links themselves, so they
 * render plain text (no nested anchors).
 */
export default function PriceNote({
  href,
  className = "",
}: {
  href?: string
  className?: string
}) {
  return (
    <span
      className={`block text-[12px] font-normal leading-[16px] text-bo-ink-muted ${className}`}
      data-testid="price-note"
    >
      inkl. MwSt., zzgl.{" "}
      {href ? (
        <a href={href} className="underline underline-offset-2 hover:text-bo-ink">
          Versand
        </a>
      ) : (
        "Versand"
      )}
    </span>
  )
}
