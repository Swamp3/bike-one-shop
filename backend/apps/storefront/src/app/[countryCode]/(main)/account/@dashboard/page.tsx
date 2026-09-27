import { redirect } from "next/navigation"

/**
 * `/account` has no dedicated overview panel in `wireframes/mein-konto.html`
 * — "Bestellungen" is the landing tab, so redirect there rather than
 * keeping the old starter's generic profile-completion/addresses-count
 * dashboard (removed, see PLAN.md Task 11).
 */
export default async function AccountIndexPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/account/orders`)
}
