import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import TrustStrip from "@modules/home/components/trust-strip"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Bike One — Fahrräder & Beratung in Oldenburg und Osnabrück",
  description:
    "40+ Marken, persönliche Beratung und Click & Collect an zwei Standorten in Niedersachsen.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  return (
    <>
      <Hero />
      <TrustStrip />
      <FeaturedProducts region={region} />
    </>
  )
}
