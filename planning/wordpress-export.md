# Exporting the existing WordPress site (images, content, logo)

How to download all data from the old WordPress site and bring the useful parts into this repo.

## Quick start: use the script

All steps below are bundled in `scripts/wp-export.sh` (needs `curl` and `jq`; no SFTP required). Output goes to `~/bikeone-wp-export/` (override with `WP_EXPORT_DIR`).

```bash
export WP_URL=https://SITE.de
WP_USER=YOUR_WP_LOGIN WP_APP_PASSWORD='xxxx xxxx xxxx xxxx' scripts/wp-export.sh media     # media.ndjson + media/ + logo candidates
WC_KEY=ck_xxx WC_SECRET=cs_xxx scripts/wp-export.sh products                        # product-images.json (slug/sku -> images)
```

The script refuses non-https URLs, pauses 1 s between requests, skips files it already downloaded, and hides the credentials from `ps`. The manual commands below do the same thing step by step.

## Safety: the export must not change the live site

Everything below only reads from WordPress. The only writes are two revocable credentials you create yourself:

- the Application Password (a row on your WP user)
- the WooCommerce REST key (a row in the WooCommerce keys table)

Rules:

- Use `https://` only. Basic auth over http sends the password in clear text.
- Only `GET` requests and downloads. Never run `rsync` with `--delete` or with source and destination swapped: that would overwrite the live `uploads/` folder. Keep the remote as the first argument and do the `-n` dry run first. A read-only SFTP/SSH user is even safer.
- Keep `sleep 1` between requests. Security plugins (Wordfence etc.) can block your IP for fast bursts, and the shared host should not feel it. Run the export outside peak shop hours.
- Do not install backup/migration plugins (UpdraftPlus, All-in-One WP Migration) on the live site just for this. They change the site, and the backup run itself can load the server. Prefer Tools -> Export and the REST API. If you need a full backup, use the hosting provider's backup or a staging copy.
- Do not edit or delete anything in WP admin during the export. Do not run bulk media "optimize"/"regenerate" actions.
- Revoke the Application Password and the REST key once the export is done.
- `curl -u user:pass` shows the password in the local process list while it runs. Acceptable on your own machine, not on a shared server.

## 1. Download

### Option A: SFTP/SSH access (not available right now, kept for later)

If you have hosting access in addition to the WP admin login, copy the uploads folder. It contains the full media library with originals.

```bash
rsync -avzn user@host:/path/to/wp-content/uploads/ ~/bikeone-wp-export/uploads/
# -n = dry run. Check the file list, then run again without the n.
```

### Option B: WP admin login only (REST API)

1. In WP admin go to Users -> Profile -> Application Passwords. Create one and copy it.
2. Download all media plus metadata:

```bash
export WP=https://SITE.de WPUSER=YOUR_WP_LOGIN WPPASS='xxxx xxxx xxxx xxxx'
mkdir -p ~/bikeone-wp-export/media && cd ~/bikeone-wp-export
for p in $(seq 1 200); do
  curl -sf -u "$WPUSER:$WPPASS" "$WP/wp-json/wp/v2/media?per_page=100&page=$p" -o page.json || break
  jq -c '.[]' page.json >> media.ndjson
  sleep 1
done
rm -f page.json
jq -r '.source_url' media.ndjson | while read -r u; do f="media/${u#*://*/}"; [ -f "$f" ] || { curl -sSf --create-dirs -o "$f" "$u"; sleep 1; }; done
```

Notes:

- `media.ndjson` keeps title, alt text, caption and the parent post of every image. Use it to map images to products.
- `source_url` is the original file, not the resized `-300x200` variants.
- The loop ends at the first page past the end (HTTP 400, so `curl -f` fails and `break` runs).
- Some security plugins block the REST API (401/403). Then use option A or the plugins below.

### Other content

| What                     | How                                                     |
| ------------------------ | ------------------------------------------------------- |
| Pages and posts          | Tools -> Export -> All content (WXR XML)                |
| WooCommerce products     | WooCommerce -> Products -> Export (CSV with image URLs) |
| Full backup (DB + files) | UpdraftPlus or All-in-One WP Migration                  |

## 2. Find the logo

- Check Appearance -> Customize -> Site Identity.
- Or search the media dump: `jq -r 'select(.source_url|test("logo";"i")) | .source_url' media.ndjson`
- Prefer SVG. If only raster exists, take the largest PNG.

## 3. Link products to images

The media library alone does not say which image belongs to which product. WooCommerce does: each product (and each variation) lists its images. Export that as a manifest, keyed by SKU and slug.

1. In WooCommerce -> Settings -> Advanced -> REST API create a read-only key (consumer key + secret).
2. Export products and variations:

```bash
export WP=https://SITE.de CK=ck_xxx CS=cs_xxx
cd ~/bikeone-wp-export
F='id,sku,slug,name,status,type,parent_id,images,categories,tags,attributes,default_attributes,price,regular_price,sale_price,stock_status,short_description,brands'
: > products.ndjson
for p in $(seq 1 200); do
  curl -sf -u "$CK:$CS" "$WP/wp-json/wc/v3/products?per_page=100&page=$p&_fields=$F" -o page.json || break
  jq -c '.[]' page.json >> products.ndjson
  sleep 1
done
# variations (variable products only)
for id in $(jq -r 'select(.type=="variable") | .id' products.ndjson); do
  curl -sf -u "$CK:$CS" "$WP/wp-json/wc/v3/products/$id/variations?per_page=100&_fields=id,sku,status,image,attributes,price,regular_price,sale_price,stock_status" \
    | jq -c --argjson pid "$id" '.[] | {variation_id:.id, parent_id:$pid} + del(.id)' >> variations.ndjson
  sleep 1
done
rm -f page.json
```

What you get:

- `products.ndjson`: per product `slug`, `sku`, and `images[]` with `id`, `src`, `alt`, `name`. The first image is the featured image (thumbnail), the rest is the gallery.
- `variations.ndjson`: per variation `sku` and its own `image` (for example the colour variant).
- `images[].id` is the attachment ID, the same `id` as in `media.ndjson`. `images[].src` equals `source_url`, so it points at the file already downloaded into `media/`.

Build a flat manifest to feed the import:

```bash
jq -s '[.[] | {slug, sku, images: [.images[] | {src, alt, file: (.src | sub("^https?://[^/]+/"; ""))}]}]' \
  products.ndjson > product-images.json
```

`file` is the path under `media/`.

### Matching to Medusa products

| WooCommerce       | Medusa           | Note                                                                                               |
| ----------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| product `slug`    | product `handle` | keeps URLs stable, makes SEO redirects trivial                                                     |
| variation `id`    | variant `metadata.woo_variation_id` | **not SKU**: the current shop uses placeholder SKUs (`1234-1-…`) and variations share the parent's SKU |
| `images[0]`       | `thumbnail`      |                                                                                                    |
| all `images[]`    | `images[]`       | order preserved                                                                                    |
| variation `image` | variant image    | only if the installed Medusa version supports variant-image links, otherwise keep at product level |

If the Medusa products are created from the same WooCommerce export (CSV or API), set `handle = slug` and store the Woo variation id in `variant.metadata.woo_variation_id` at creation. Then matching needs no fuzzy logic. Real SKUs/article numbers come from the ERP (TriCon), not from WooCommerce. If the products already exist in Medusa, match by handle, and write unmatched ones to a report instead of guessing.

### Importing

1. Upload files through Medusa's file module (`uploadFilesWorkflow`) or the admin, so the products get real Medusa file URLs, not links to the old WordPress site. The old site goes away.
2. Update each matched product with `thumbnail` and `images: [{ url }]` (same shape as in `seed-demo-products.ts`).
3. Run it as a script in `backend/apps/backend/src/scripts/`, like the seed script: idempotent, skip products that already have images, and print unmatched slugs/SKUs at the end.

## 4. Put it into this repo

Keep the raw dump **outside** the repo. It is large, and the WXR and user exports contain personal data (GDPR). Only copy curated files in.

| Asset                | Destination                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo                 | `backend/apps/storefront/public/images/logo.svg`, then use it in `backend/apps/storefront/src/modules/layout/templates/nav/index.tsx` via `next/image`                                          |
| Favicon              | replace `backend/apps/storefront/public/favicon.ico`                                                                                                                                            |
| Generic site imagery | `backend/apps/storefront/public/images/`                                                                                                                                                        |
| Product photos       | `example-product-images/` (same place as the current seed photos), then map to products in `backend/apps/backend/src/scripts/seed-demo-products.ts` using `media.ndjson` or the WooCommerce CSV |

Product images should end up in Medusa (file module, admin upload or seed script), not in `public/`.

## 5. Before using

- Brand and product photos usually belong to manufacturers. Confirm you may reuse them.
- Do not commit the Application Password. Revoke it after the export.
- Do not commit user/customer exports.
