import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Minimal checkout header, matching wireframes/warenkorb-checkout.html's
 * "fewer distractions from completing purchase" chrome — no category nav,
 * no search, no store picker. Just the logo, a security note and a way
 * back to the cart.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-bo-bg">
      <header className="sticky top-0 z-40 border-b border-bo-header-line bg-bo-header text-bo-header-text">
        <div className="content-container flex items-center gap-3 py-3">
          <LocalizedClientLink
            href="/"
            className="shrink-0 font-heading text-xl font-bold uppercase italic leading-none tracking-wide"
            data-testid="store-link"
          >
            BIKE<span className="text-bo-accent">•</span>ONE
          </LocalizedClientLink>
          <span className="ml-4 hidden items-center gap-1.5 text-[12px] text-bo-header-muted md:flex">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Sicher einkaufen — SSL-verschlüsselt
          </span>
          <LocalizedClientLink
            href="/cart"
            className="ml-auto flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-bo-header-line bg-bo-header-surface px-3 py-2 text-[13px] font-semibold text-bo-header-text hover:border-bo-header-muted"
            data-testid="back-to-cart-link"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span className="hidden sm:inline">Zurück zum Warenkorb</span>
            <span className="sm:hidden">Zurück</span>
          </LocalizedClientLink>
        </div>
      </header>
      <div data-testid="checkout-container">{children}</div>
    </div>
  )
}
