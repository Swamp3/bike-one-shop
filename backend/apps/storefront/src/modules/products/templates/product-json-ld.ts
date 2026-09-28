import { HttpTypes } from "@medusajs/types"

type VariantWithPrice = HttpTypes.StoreProductVariant & {
  calculated_price?: {
    calculated_amount: number
    currency_code: string
  }
  inventory_quantity?: number
}

export type ProductOfferJsonLd = {
  "@type": "Offer"
  url: string
  priceCurrency: string
  price: string
  availability: "https://schema.org/InStock" | "https://schema.org/OutOfStock"
}

export type ProductJsonLd = {
  "@context": "https://schema.org"
  "@type": "Product"
  name: string
  description?: string
  image?: string[]
  url: string
  offers?: ProductOfferJsonLd[]
}

export function buildProductJsonLd(
  product: HttpTypes.StoreProduct,
  url: string
): ProductJsonLd {
  const variants = (product.variants ?? []) as VariantWithPrice[]

  const offers: ProductOfferJsonLd[] = variants
    .filter((variant) => !!variant.calculated_price)
    .map((variant) => ({
      "@type": "Offer",
      url,
      priceCurrency: variant.calculated_price!.currency_code.toUpperCase(),
      price: variant.calculated_price!.calculated_amount.toFixed(2),
      availability:
        variant.inventory_quantity && variant.inventory_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    }))

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(product.description ? { description: product.description } : {}),
    ...(product.images?.length
      ? { image: product.images.map((image) => image.url) }
      : {}),
    url,
    ...(offers.length ? { offers } : {}),
  }
}
