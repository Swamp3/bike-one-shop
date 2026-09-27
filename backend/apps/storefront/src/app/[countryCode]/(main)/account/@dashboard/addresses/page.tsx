import { redirect } from "next/navigation"

/**
 * The address book now lives on the "Meine Daten" tab
 * (`wireframes/mein-konto.html` has one combined panel, not a separate
 * addresses page) — redirect rather than leaving this route 404ing for
 * anyone with an old bookmark/link.
 */
export default async function AddressesRedirect(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/account/profile`)
}
