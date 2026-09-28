import { Metadata } from "next"

import { notFound } from "next/navigation"
import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import AddressBook from "@modules/account/components/address-book"
import PersonalDataCard from "@modules/account/components/personal-data-card"

export const metadata: Metadata = {
  title: "Meine Daten",
  description: "Persönliche Daten und Adressbuch.",
  robots: { index: false, follow: false },
}

export default async function Profile(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <h2 className="m-0 mb-3.5 font-heading text-[19px] font-semibold">
        Meine Daten
      </h2>
      <PersonalDataCard customer={customer} />
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
