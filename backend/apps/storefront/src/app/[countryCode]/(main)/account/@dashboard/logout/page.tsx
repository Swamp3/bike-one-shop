import { Metadata } from "next"

import LogoutPanel from "@modules/account/components/logout-panel"

export const metadata: Metadata = {
  title: "Abmelden",
  description: "Vom BIKE ONE Konto abmelden.",
}

export default function LogoutPage() {
  return (
    <div className="w-full" data-testid="logout-page-wrapper">
      <h2 className="m-0 mb-3.5 font-heading text-[19px] font-semibold">
        Abmelden
      </h2>
      <LogoutPanel />
    </div>
  )
}
