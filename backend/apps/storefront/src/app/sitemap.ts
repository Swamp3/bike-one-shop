import { MetadataRoute } from "next"

import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { listRegions } from "@lib/data/regions"
import { getBaseURL } from "@lib/util/env"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseURL()
  const regions = await listRegions()

  const [{ collections }, categories] = await Promise.all([
    listCollections({ fields: "handle" }),
    listCategories().catch(() => []),
  ])

  const entries: MetadataRoute.Sitemap = []

  for (const region of regions ?? []) {
    const countryCodes = (region.countries
      ?.map((c) => c.iso_2)
      .filter(Boolean) ?? []) as string[]

    if (!countryCodes.length) {
      continue
    }

    const { response } = await listProducts({
      regionId: region.id,
      queryParams: { limit: 1000, fields: "handle,updated_at" },
    })

    for (const countryCode of countryCodes) {
      entries.push(
        { url: `${base}/${countryCode}`, changeFrequency: "daily", priority: 1 },
        {
          url: `${base}/${countryCode}/store`,
          changeFrequency: "daily",
          priority: 0.8,
        }
      )

      for (const product of response.products) {
        if (!product.handle) {
          continue
        }
        entries.push({
          url: `${base}/${countryCode}/products/${product.handle}`,
          lastModified: product.updated_at
            ? new Date(product.updated_at)
            : undefined,
          changeFrequency: "weekly",
          priority: 0.7,
        })
      }

      for (const collection of collections) {
        if (!collection.handle) {
          continue
        }
        entries.push({
          url: `${base}/${countryCode}/collections/${collection.handle}`,
          changeFrequency: "weekly",
          priority: 0.6,
        })
      }

      for (const category of categories ?? []) {
        if (!category.handle) {
          continue
        }
        entries.push({
          url: `${base}/${countryCode}/categories/${category.handle}`,
          changeFrequency: "weekly",
          priority: 0.6,
        })
      }
    }
  }

  return entries
}
