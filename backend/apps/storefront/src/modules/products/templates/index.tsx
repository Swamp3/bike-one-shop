import { Suspense } from "react"
import { notFound } from "next/navigation"

import { HttpTypes } from "@medusajs/types"
import { getBaseURL } from "@lib/util/env"
import BikeOneGallery from "@modules/products/components/bikeone-gallery"
import BikeOneSpecTable from "@modules/products/components/bikeone-spec-table"
import ProductActions from "@modules/products/components/product-actions"
import RelatedProducts from "@modules/products/components/related-products"
import PlpBreadcrumb from "@modules/store/components/plp-breadcrumb"

import ProductActionsWrapper from "./product-actions-wrapper"
import { buildProductJsonLd } from "./product-json-ld"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
}

const ProductTemplate = ({
  product,
  region,
  countryCode,
}: ProductTemplateProps) => {
  if (!product || !product.id) {
    return notFound()
  }

  const productUrl = `${getBaseURL()}/${countryCode}/products/${product.handle}`
  const productJsonLd = buildProductJsonLd(product, productUrl)

  return (
    <div className="pb-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <PlpBreadcrumb
        items={[
          { label: "Start", href: "/" },
          { label: "Fahrräder", href: "/store" },
          ...(product.categories?.[0]
            ? [
                {
                  label: product.categories[0].name,
                  href: `/categories/${product.categories[0].handle}`,
                },
              ]
            : []),
          { label: product.title },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-6 px-4 md:grid-cols-2 md:gap-12 md:px-6">
        <BikeOneGallery title={product.title} />

        <div className="flex flex-col gap-3.5">
          {product.collection?.title && (
            <div className="font-mono text-[11px] uppercase tracking-wide text-bo-ink-faint">
              {product.collection.title}
            </div>
          )}
          <h1 className="m-0 font-heading text-[28px] font-semibold md:text-[32px]">
            {product.title}
          </h1>

          <div className="flex items-center gap-2 text-[13.5px]">
            <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-bo-ok" />
            <span className="font-semibold">Verfügbar</span>
            <span className="text-bo-ink-muted">
              — ab Lager, Click &amp; Collect in Oldenburg oder Osnabrück
            </span>
          </div>

          <Suspense
            fallback={
              <ProductActions disabled product={product} region={region} />
            }
          >
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>

          <div className="flex items-start gap-2 pt-1 text-[12px] text-bo-ink-muted">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mt-[1px] h-3.5 w-3.5 shrink-0 text-bo-ink-faint"
            >
              <rect x="1" y="3" width="15" height="13" rx="1" />
              <path d="M16 8h4l3 3v5h-7z" />
              <circle cx="5.5" cy="18.5" r="2" />
              <circle cx="18.5" cy="18.5" r="2" />
            </svg>
            <span>
              Versand per Spedition (Fahrrad vormontiert &amp; fahrfertig
              eingestellt) — oder online reservieren und in einem unserer
              Stores abholen.
            </span>
          </div>

          <div className="mt-1 flex flex-col gap-2 border-t border-bo-line pt-3">
            <div className="flex items-center gap-2 text-[12.5px] text-bo-ink-muted">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 shrink-0 text-bo-accent"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
              Bikefitting vor Ort — Oldenburg &amp; Osnabrück
            </div>
            <div className="flex items-center gap-2 text-[12.5px] text-bo-ink-muted">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 shrink-0 text-bo-accent"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
              30 Tage Rückgabe, unkompliziert im Store
            </div>
          </div>
        </div>
      </div>

      <section className="px-4 py-7 md:px-6 md:py-9">
        <h2 className="m-0 mb-4 font-heading text-[20px] font-semibold">
          Technische Daten
        </h2>
        <BikeOneSpecTable product={product} />
      </section>

      {product.description && (
        <section className="px-4 py-7 md:px-6 md:py-9">
          <h2 className="m-0 mb-4 font-heading text-[20px] font-semibold">
            Produktbeschreibung
          </h2>
          <p className="max-w-[70ch] whitespace-pre-line text-[15px] leading-relaxed text-bo-ink-muted">
            {product.description}
          </p>
        </section>
      )}

      <section className="px-4 py-7 md:px-6 md:py-9">
        <h2 className="m-0 mb-4 font-heading text-[20px] font-semibold">
          Versand &amp; Rückgabe
        </h2>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {[
            {
              title: "Versand per Spedition",
              body: "Lieferzeit 3–5 Werktage, Fahrrad vormontiert und fahrfertig eingestellt. Versandkosten werden im Warenkorb berechnet.",
            },
            {
              title: "Click & Collect",
              body: "Online reservieren, abholbereit in Oldenburg oder Osnabrück. Zahlung wahlweise online oder direkt im Store.",
            },
            {
              title: "Rückgabe im Store",
              body: "30 Tage Rückgaberecht, unkompliziert an beiden Standorten — ohne Versandetikett, ohne Rückfragen.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[10px] border border-bo-line bg-bo-surface p-3.5"
            >
              <h3 className="m-0 mb-1 font-heading text-[14px] font-semibold">
                {item.title}
              </h3>
              <p className="m-0 text-[12.5px] leading-relaxed text-bo-ink-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-7 md:px-6 md:py-9">
        <h2 className="m-0 mb-4 font-heading text-[20px] font-semibold">
          Das könnte dir auch gefallen
        </h2>
        <Suspense fallback={null}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </section>
    </div>
  )
}

export default ProductTemplate
