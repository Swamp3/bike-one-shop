"use client"

import { clx } from "@modules/common/components/ui"
import { useParams, usePathname } from "next/navigation"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const PackageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
    <rect x="3" y="7" width="18" height="14" rx="2" />
    <path d="M8 7V5a4 4 0 0 1 8 0v2" />
  </svg>
)
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
)
const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
)
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

const TABS = [
  { href: "/account/orders", label: "Bestellungen", icon: PackageIcon },
  { href: "/account/profile", label: "Meine Daten", icon: UserIcon },
  { href: "/account/payment", label: "Zahlungsmethoden", icon: CardIcon },
]

const AccountNav = ({
  customer: _customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const route = pathname?.split(countryCode)[1] || ""

  return (
    <div
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-bo-line px-4 pb-3.5 [scrollbar-width:none] md:sticky md:top-6 md:mx-0 md:flex-col md:overflow-visible md:border-b-0 md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      {TABS.map((tab) => {
        const active = route.startsWith(tab.href)
        return (
          <LocalizedClientLink
            key={tab.href}
            href={tab.href}
            className={clx(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-bo-line px-3.5 py-2.5 text-[13px] font-semibold text-bo-ink-muted md:rounded-lg md:border-transparent md:px-3 md:py-2.5",
              active && "border-bo-ink bg-bo-ink text-bo-bg md:border-bo-line md:bg-bo-surface-2 md:text-bo-ink"
            )}
          >
            <tab.icon />
            {tab.label}
          </LocalizedClientLink>
        )
      })}
      <LocalizedClientLink
        href="/account/logout"
        className={clx(
          "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-bo-accent bg-[color-mix(in_srgb,var(--bo-accent)_6%,var(--bo-surface))] px-3.5 py-2.5 text-[13px] font-semibold text-bo-accent md:mt-3 md:rounded-none md:border-0 md:border-t md:border-bo-line md:bg-transparent md:px-3 md:pb-0 md:pt-4",
          route.startsWith("/account/logout") && "bg-bo-accent text-bo-accent-ink md:bg-transparent md:text-bo-accent"
        )}
      >
        <LogoutIcon />
        Abmelden
      </LocalizedClientLink>
    </div>
  )
}

export default AccountNav
