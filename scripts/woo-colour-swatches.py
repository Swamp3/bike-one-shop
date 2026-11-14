#!/usr/bin/env python3
"""Suggest a swatch colour (hex) for every product colour in the WooCommerce export.

Reads the variation photos from scripts/wp-export.sh's output and samples the frame
area (the middle of the bike, between the wheels) for its dominant colour.
The result is a suggestion, not a fact: multi-colour and fade paint jobs need a
human check. Review the contact sheet (--sheet) before trusting the values.

  python3 scripts/woo-colour-swatches.py [EXPORT_DIR] [--sheet out.png]

Writes backend/apps/backend/src/scripts/data/woo-colour-swatches.json:
  { "<woo product id>": { "<Farbe value>": "#rrggbb", ... }, ... }
Needs Pillow (with AVIF support, Pillow >= 11.2).
"""
import json
import os
import re
import sys
from collections import Counter

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "backend/apps/backend/src/scripts/data/woo-colour-swatches.json")

# Checked by eye on the contact sheet (2026-11-13): the sampler picked a logo,
# decal or shadow instead of the frame. Keyed by Woo product id, then colour name.
OVERRIDES = {
    "3048": {"Schwarz": "#161616"},  # Ridley Kanzo Alu Equipped: lime decal won
    "3287": {"Deep Orange": "#d4561c"},  # Specialized Diverge Carbon Sport: shadow won
    "2434": {"Gloss White": "#f2f2f2"},  # Specialized Tarmac SL9: blue logo won
    "2798": {"Black Grey Glossy": "#3a3a3a"},  # Wilier Turbine SLR: grey highlight won
}


def load_ndjson(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def hsv(p):
    r, g, b = (c / 255 for c in p[:3])
    mx, mn = max(r, g, b), min(r, g, b)
    return (0 if mx == 0 else (mx - mn) / mx), mx


def average(pixels):
    return "#%02x%02x%02x" % tuple(round(sum(p[i] for p in pixels) / len(pixels)) for i in range(3))


def dominant(pixels):
    buckets = Counter((p[0] // 24, p[1] // 24, p[2] // 24) for p in pixels)
    top = buckets.most_common(1)[0][0]
    return average([p for p in pixels if (p[0] // 24, p[1] // 24, p[2] // 24) == top])


def frame_colour(path):
    im = Image.open(path).convert("RGBA")
    im.thumbnail((300, 300))
    w, h = im.size
    px = im.load()
    transparent = any(px[x, y][3] < 128 for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)))
    bgc = px[1, 1]  # opaque images: white or a flat off-white studio background
    if transparent:
        is_bg = lambda p: p[3] < 128
    else:
        is_bg = lambda p: p[3] < 128 or sum(abs(p[i] - bgc[i]) for i in range(3)) < 24
    pts = [(x, y) for y in range(h) for x in range(w) if not is_bg(px[x, y])]
    if not pts:
        return None
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    bw, bh = x1 - x0, y1 - y0
    # top tube / down tube / seat tube: between the wheels (each ~40% of the width),
    # above the bottom bracket and chainring
    box = [(x, y) for y in range(int(y0 + 0.18 * bh), int(y0 + 0.50 * bh) + 1)
           for x in range(int(x0 + 0.42 * bw), int(x0 + 0.58 * bw) + 1)]
    ink = [px[x, y] for x, y in box if not is_bg(px[x, y])]
    # white frame on a white background: the tubes vanish into the background
    if not transparent and len(ink) < 0.08 * len(box):
        return "#f2f2f2"
    if not ink:
        return None
    chroma = [p for p in ink if hsv(p)[0] >= 0.30 and hsv(p)[1] >= 0.18]
    if len(chroma) >= 0.15 * len(ink):
        return dominant(chroma)
    # neutral frame: the largest of light / mid / dark wins
    light = [p for p in ink if min(p[:3]) > 200]
    dark = [p for p in ink if max(p[:3]) < 85]
    mid = [p for p in ink if p not in light and p not in dark]
    group = max(light, mid, dark, key=len)
    return average(group)


def main():
    args = [a for a in sys.argv[1:]]
    sheet = None
    if "--sheet" in args:
        i = args.index("--sheet")
        sheet = args[i + 1]
        del args[i:i + 2]
    export = os.path.expanduser(args[0] if args else "~/bikeone-wp-export")
    products = {p["id"]: p for p in load_ndjson(os.path.join(export, "products.ndjson")) if p.get("status") == "publish"}
    variations = load_ndjson(os.path.join(export, "variations.ndjson"))

    result, rows = {}, []
    for v in sorted(variations, key=lambda v: v["variation_id"]):
        pid = v["parent_id"]
        if pid not in products:
            continue
        colour = next((a["option"] for a in v.get("attributes", []) if a["name"] == "Farbe"), None)
        src = (v.get("image") or {}).get("src")
        if not colour or not src or colour in result.get(str(pid), {}):
            continue
        path = os.path.join(export, "media", re.sub(r"^https?://[^/]+/", "", src))
        if not os.path.isfile(path):
            print("missing image:", path, file=sys.stderr)
            continue
        hex_ = frame_colour(path)
        if hex_:
            result.setdefault(str(pid), {})[colour] = hex_
            rows.append((products[pid]["name"], colour, hex_, path))

    for pid, colours in OVERRIDES.items():
        for colour, hex_ in colours.items():
            if colour in result.get(pid, {}):
                result[pid][colour] = hex_
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")
    print(f"{len(rows)} colours for {len(result)} products -> {OUT}")

    if sheet:
        cw, ch = 240, 190
        cols = 6
        img = Image.new("RGB", (cols * cw, ((len(rows) + cols - 1) // cols) * ch), "white")
        d = ImageDraw.Draw(img)
        for i, (name, colour, hex_, path) in enumerate(rows):
            x, y = (i % cols) * cw, (i // cols) * ch
            t = Image.open(path).convert("RGBA")
            t.thumbnail((cw - 10, ch - 50))
            img.paste(t, (x + 5, y + 5), t)
            d.ellipse((x + 6, y + ch - 40, x + 30, y + ch - 16), fill=hex_, outline="#888")
            d.text((x + 36, y + ch - 42), name[:30], fill="black")
            d.text((x + 36, y + ch - 28), f"{colour[:28]} {hex_}", fill="#444")
        img.save(sheet)
        print("contact sheet:", sheet)


if __name__ == "__main__":
    main()
