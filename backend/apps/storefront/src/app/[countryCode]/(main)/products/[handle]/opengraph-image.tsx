import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import sharp from "sharp"

import { listProducts } from "@lib/data/products"

export const alt = "BikeOne"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Product photos can be AVIF/WebP (Woo import), which the renderer can't draw, so re-encode to PNG.
const loadPhoto = async (url: string) => {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(630, 630, { fit: "contain", background: "#ffffff" })
      .png()
      .toBuffer()
    return `data:image/png;base64,${png.toString("base64")}`
  } catch {
    return null
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ countryCode: string; handle: string }>
}) {
  const { countryCode, handle } = await params
  const product = await listProducts({
    countryCode,
    queryParams: { handle, fields: "title,thumbnail,*images" },
  })
    .then(({ response }) => response.products[0])
    .catch(() => undefined)

  const photoUrl = product?.thumbnail ?? product?.images?.[0]?.url
  const photo = photoUrl ? await loadPhoto(photoUrl) : null

  const logoSvg = await readFile(
    path.join(process.cwd(), "public/images/logo/bikeone-logo-white.svg")
  )
  const logo = `data:image/svg+xml;base64,${logoSvg.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#121212",
          color: "#ffffff",
        }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} width={630} height={630} alt="" />
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
          }}
        >
          <div
            style={{
              fontSize: photo ? 54 : 72,
              fontWeight: 700,
              lineHeight: 1.15,
              display: "flex",
            }}
          >
            {product?.title ?? "BikeOne"}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={300} height={48} alt="BikeOne" />
        </div>
      </div>
    ),
    size
  )
}
