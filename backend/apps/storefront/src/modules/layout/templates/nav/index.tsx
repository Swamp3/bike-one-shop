import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import CartButton from "@modules/layout/components/cart-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MobileMenu from "@modules/layout/components/mobile-menu"
import NavSearch from "@modules/layout/components/nav-search"
import StorePicker from "@modules/layout/components/store-picker"

export default async function Nav() {
  const categories = await listCategories().catch(() => null)
  const topLevelCategories = categories?.filter((c) => !c.parent_category)

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      <header className="border-b border-bo-header-line bg-bo-header text-bo-header-text">
        <div className="relative flex items-center gap-2.5 px-4 py-2.5 md:gap-4 md:px-6 md:py-3">
          {/* Mobile only: mobile menu drawer trigger. Left untouched per scope. */}
          <MobileMenu categories={topLevelCategories ?? null} />
          <LocalizedClientLink
            href="/"
            className="shrink-0 leading-none"
            data-testid="nav-store-link"
          >
            <img
              src="/images/logo/bikeone-logo-white.svg"
              alt="BikeOne"
              width={1683}
              height={269}
              className="h-6 w-auto md:h-7"
            />
          </LocalizedClientLink>
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
            {/* Desktop only: search bar sits in the right-hand cluster, left of the icons. */}
            <div className="hidden min-w-0 max-w-[360px] flex-1 md:block">
              <NavSearch variant="bar" />
            </div>
            {/* TODO(mobile-layout): icon cluster (search/language/store/cart) should default to
                one item per row instead of a horizontal row on mobile — deferred to a later pass. */}
            <NavSearch variant="icon" />
            <div className="hidden items-center gap-1 rounded-lg border border-bo-header-line font-mono text-[11px] font-semibold md:flex">
              <span className="px-2.5 py-2 text-bo-header bg-bo-header-text">
                DE
              </span>
            </div>
            <StorePicker variant="compact" />
            <StorePicker variant="mobile" />
            <LocalizedClientLink
              href="/account"
              aria-label="Mein Konto"
              title="Mein Konto"
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-bo-header-line bg-bo-header-surface text-bo-header-text"
              data-testid="nav-account-link"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  href="/cart"
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-bo-header-line bg-bo-header-surface text-bo-header-text"
                >
                  0
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </div>
      </header>

      {topLevelCategories && topLevelCategories.length > 0 && (
        <nav className="hidden border-b border-bo-line bg-bo-surface md:block">
          <div className="no-scrollbar flex justify-center gap-0 overflow-x-auto px-4 py-2">
            {topLevelCategories.map((c) => (
              <LocalizedClientLink
                key={c.id}
                href={`/categories/${c.handle}`}
                className="mx-[22px] whitespace-nowrap border-b-2 border-transparent py-1.5 font-heading text-[13px] font-medium uppercase tracking-wide text-bo-ink-muted hover:border-bo-accent hover:text-bo-ink"
              >
                {c.name}
              </LocalizedClientLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
