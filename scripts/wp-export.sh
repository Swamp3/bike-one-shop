#!/usr/bin/env bash
# Read-only export of the old WordPress/WooCommerce site: media and product->image links, via throttled curl.
# Docs: planning/wordpress-export.md. Needs: bash, curl, jq.
#
#   WP_URL=https://shop.example.de WP_USER=YOUR_WP_LOGIN WP_APP_PASSWORD='xxxx xxxx xxxx xxxx' \
#     scripts/wp-export.sh media
#   WP_URL=... WC_KEY=ck_xxx WC_SECRET=cs_xxx scripts/wp-export.sh products
#
# Output goes to $WP_EXPORT_DIR (default ~/bikeone-wp-export), outside the repo on purpose:
# it is big and may contain personal data. Only GET requests / downloads; nothing is written to the site.
set -euo pipefail

OUT="${WP_EXPORT_DIR:-$HOME/bikeone-wp-export}"
SLEEP="${WP_EXPORT_SLEEP:-1}" # pause between requests so security plugins don't block the IP
awk -v s="$SLEEP" 'BEGIN { exit !(s + 0 >= 1) }' || SLEEP=1 # never faster than 1 request/second

die() { echo "error: $*" >&2; exit 1; }
need() { [ -n "${!1:-}" ] || die "$1 is not set"; }
command -v curl >/dev/null || die "curl missing"
command -v jq >/dev/null || die "jq missing"

wp_base() {
  need WP_URL
  # Basic auth over plain http would leak the password. http only for local testing.
  case "$WP_URL" in https://*|http://localhost*|http://127.0.0.1*) ;; *) die "WP_URL must start with https://" ;; esac
  echo "${WP_URL%/}"
}

# fetch_all <url-with-query> <out.ndjson> <user:password>  -> one JSON object per line, all pages
fetch_all() {
  local url="$1" out="$2" auth="$3" page=1 pages=1 hdr body
  : > "$out"
  hdr="$(mktemp)"; body="$(mktemp)"
  while [ "$page" -le "$pages" ]; do
    # credentials via curl config on a pipe: not visible in `ps`
    curl -sSf --config <(printf 'user = "%s"\n' "$auth") -D "$hdr" -o "$body" "$url&page=$page"
    pages="$(awk -F': ' 'tolower($1)=="x-wp-totalpages"{gsub(/\r/,"",$2); print $2}' "$hdr")"
    pages="${pages:-1}"
    jq -c '.[]' "$body" >> "$out"
    echo "  page $page/$pages" >&2
    page=$((page + 1))
    sleep "$SLEEP"
  done
  rm -f "$hdr" "$body"
}

cmd_media() {
  local base; base="$(wp_base)"; need WP_USER; need WP_APP_PASSWORD
  mkdir -p "$OUT/media"
  echo "Fetching media list..."
  fetch_all "$base/wp-json/wp/v2/media?per_page=100" "$OUT/media.ndjson" "$WP_USER:$WP_APP_PASSWORD"
  echo "Downloading originals (existing files are skipped)..."
  local url path n=0
  while IFS= read -r url; do
    path="${url#*://*/}" # strip scheme + host
    case "$path" in *..*|/*) echo "  skip suspicious path: $path" >&2; continue ;; esac
    if [ ! -f "$OUT/media/$path" ]; then
      curl -sSf --create-dirs -o "$OUT/media/$path" "$url" || echo "  failed: $url" >&2
      sleep "$SLEEP"
    fi
    n=$((n + 1))
  done < <(jq -r '.source_url' "$OUT/media.ndjson")
  echo "Done: $n files -> $OUT/media (list with metadata: $OUT/media.ndjson)"
  echo "Logo candidates:"
  jq -r 'select(.source_url | test("logo"; "i")) | .source_url' "$OUT/media.ndjson"
}

cmd_products() {
  local base; base="$(wp_base)"; need WC_KEY; need WC_SECRET
  mkdir -p "$OUT"
  local auth="$WC_KEY:$WC_SECRET"
  echo "Fetching products..."
  fetch_all "$base/wp-json/wc/v3/products?per_page=100&_fields=id,sku,slug,name,status,type,parent_id,images,categories,tags,attributes,default_attributes,price,regular_price,sale_price,stock_status,short_description,brands" \
    "$OUT/products.ndjson" "$auth"
  echo "Fetching variations..."
  : > "$OUT/variations.ndjson"
  local id
  for id in $(jq -r 'select(.type == "variable") | .id' "$OUT/products.ndjson"); do
    fetch_all "$base/wp-json/wc/v3/products/$id/variations?per_page=100&_fields=id,sku,status,image,attributes,price,regular_price,sale_price,stock_status" \
      "$OUT/variations.tmp" "$auth"
    jq -c --argjson pid "$id" '{variation_id: .id, parent_id: $pid} + del(.id)' "$OUT/variations.tmp" >> "$OUT/variations.ndjson"
  done
  rm -f "$OUT/variations.tmp"
  # file = path under media/ (same layout as `media` writes)
  jq -s '[.[] | {slug, sku, images: [.images[] | {src, alt, file: (.src | sub("^https?://[^/]+/"; ""))}]}]' \
    "$OUT/products.ndjson" > "$OUT/product-images.json"
  echo "Done: $(jq length "$OUT/product-images.json") products -> $OUT/product-images.json"
  echo "Without images: $(jq '[.[] | select(.images | length == 0)] | length' "$OUT/product-images.json")"
}

case "${1:-}" in
  media) cmd_media ;;
  products) cmd_products ;;
  *) sed -n '2,9p' "$0"; exit 1 ;;
esac
