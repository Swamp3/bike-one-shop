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
            className="shrink-0 font-heading text-xl font-bold uppercase italic leading-none tracking-wide"
            data-testid="nav-store-link"
          >
            BIKE<span className="text-bo-accent">•</span>ONE
          </LocalizedClientLink>
          {/* Desktop only: search bar shares the top row with the logo instead of a stacked full-width row below. */}
          <div className="hidden min-w-0 max-w-[480px] flex-1 md:block">
            <NavSearch variant="bar" />
          </div>
          <div className="ml-auto flex items-center gap-2">
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
