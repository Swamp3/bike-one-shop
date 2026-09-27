import LocalizedClientLink from "@modules/common/components/localized-client-link"

const EmptyCartMessage = () => {
  return (
    <div
      className="flex flex-col items-center px-4 py-14 text-center text-bo-ink-muted"
      data-testid="empty-cart-message"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mb-3 h-10 w-10 text-bo-ink-faint"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <p className="m-0 mb-4">Dein Warenkorb ist leer.</p>
      <LocalizedClientLink
        href="/store"
        className="rounded border-[1.5px] border-bo-line-strong px-5 py-3 text-[14.5px] font-semibold hover:border-bo-ink"
      >
        Weiter einkaufen
      </LocalizedClientLink>
    </div>
  )
}

export default EmptyCartMessage
