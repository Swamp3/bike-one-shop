import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import { visibleTopLevel } from "@lib/util/category-tree"
import CartButton from "@modules/layout/components/cart-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MobileMenu from "@modules/layout/components/mobile-menu"
import NavSearch from "@modules/layout/components/nav-search"
import StorePicker from "@modules/layout/components/store-picker"

export default async function Nav() {
  const categories = await listCategories().catch(() => null)
  const topLevelCategories = categories ? visibleTopLevel(categories) : null

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
              className="h-5 w-auto md:h-7"
            />
          </LocalizedClientLink>
          <div className="ml-auto flex items-center justify-end gap-1.5 md:min-w-0 md:flex-1 md:gap-2">
            {/* Desktop only: search bar sits in the right-hand cluster, left of the icons. */}
            <div className="hidden min-w-0 max-w-[360px] flex-1 md:block">
              <NavSearch variant="bar" />
            </div>
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
              className="hidden h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-bo-header-line bg-bo-header-surface text-bo-header-text md:flex"
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
          {/* No overflow-x scroll here: it would clip the dropdown panels. */}
          <ul className="m-0 flex list-none justify-center gap-0 px-4 py-2">
            {topLevelCategories.map((c) => (
              // Dropdown opens on hover and keyboard focus via CSS only, so the nav stays a server component.
              <li key={c.id} className="group relative mx-[22px]">
                <LocalizedClientLink
                  href={`/categories/${c.handle}`}
                  className="block whitespace-nowrap border-b-2 border-transparent py-1.5 font-heading text-[13px] font-medium uppercase tracking-wide text-bo-ink-muted hover:border-bo-accent hover:text-bo-ink group-focus-within:border-bo-accent group-focus-within:text-bo-ink group-hover:border-bo-accent group-hover:text-bo-ink"
                >
                  {c.name}
                </LocalizedClientLink>
                {!!c.category_children.length && (
                  <div className="absolute left-1/2 top-full z-10 hidden -translate-x-1/2 pt-2 group-focus-within:block group-hover:block">
                    <ul className="m-0 min-w-[220px] list-none rounded-lg border border-bo-line bg-bo-surface py-1.5 shadow-lg">
                      {c.category_children.map((child) => (
                        <li key={child.id}>
                          <LocalizedClientLink
                            href={`/categories/${child.handle}`}
                            className="block whitespace-nowrap px-4 py-2 text-[13.5px] text-bo-ink-muted hover:bg-bo-surface-2 hover:text-bo-ink focus-visible:bg-bo-surface-2 focus-visible:text-bo-ink"
                          >
                            {child.name}
                          </LocalizedClientLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
