import React from "react"

import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"
import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  if (!customer) {
    return <div data-testid="account-page">{children}</div>
  }

  return (
    <div className="pb-12" data-testid="account-page">
      <PlpBreadcrumb items={[{ label: "Start", href: "/" }, { label: "Mein Konto" }]} />

      <div className="px-4 pb-4 pt-3.5 md:px-6">
        <p className="m-0 mb-0.5 text-[13px] text-bo-ink-faint">
          Hallo, {customer.first_name} 👋
        </p>
        <h1 className="m-0 font-heading text-[26px] font-semibold leading-tight md:text-[30px]">
          Mein Konto
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 px-4 md:grid-cols-[230px_1fr] md:gap-8 md:px-6">
        <AccountNav customer={customer} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}

export default AccountLayout
