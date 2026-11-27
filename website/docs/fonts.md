# Fonts

Roboto 400 and 700 and Roboto Condensed 700, self-hosted woff2, no request to a third party (decision d54, d68, d81).

| File | Content | Bytes |
| --- | --- | --- |
| `src/assets/fonts/roboto-de-400.woff2`, `roboto-de-700.woff2`, `roboto-condensed-de-700.woff2` | German-only subset of the `latin` files of `@fontsource` | 14,004, 14,292, 14,268 (the `latin` files: 21,884, 22,240, 21,128) |
| `@fontsource/roboto/files/roboto-latin-ext-{400,700}-normal.woff2`, `@fontsource/roboto-condensed/files/roboto-condensed-latin-ext-700-normal.woff2` | untouched; fetched only when a character of the latin-ext range is on the page (today only the "Ư" typos of the Datenschutz) | 15 KB each, on demand |

The subset keeps U+0020 to U+007E, no-break space, section and copyright signs, guillemets, degree and middle dot, the umlauts, ss and
e-acute (Cervélo), en and em dash, the typographic quotes (single and double, low and high), bullet, ellipsis, the single right guillemet of the breadcrumbs (a CSS `content`), euro, trademark and the minus
sign. `fonts.css` names exactly these ranges in `unicode-range`, so a character outside them takes the next face or the fallback font.
The `size` check fails when a page shows a character that the old `latin` file covered and the subset does not.

## Re-making the files

`pyftsubset` (fontTools) and `brotli` are a one-off tool, not a dependency of the repository. In a throwaway folder:

```
python3 -m venv /tmp/fonts-venv && /tmp/fonts-venv/bin/pip install fonttools brotli
U="U+0020-007E,U+00A0,U+00A7,U+00A9,U+00AB,U+00B0,U+00B7,U+00BB,U+00C4,U+00D6,U+00DC,U+00DF,U+00E4,U+00F6,U+00FC,U+00E9,U+2013,U+2014,U+2018-201E,U+2022,U+2026,U+203A,U+20AC,U+2122,U+2212"
F=node_modules/@fontsource
for pair in "roboto/files/roboto-latin-400-normal:roboto-de-400" "roboto/files/roboto-latin-700-normal:roboto-de-700" "roboto-condensed/files/roboto-condensed-latin-700-normal:roboto-condensed-de-700"; do
  /tmp/fonts-venv/bin/pyftsubset "$F/${pair%%:*}.woff2" --unicodes="$U" --flavor=woff2 --layout-features='*' --output-file="src/assets/fonts/${pair##*:}.woff2"
done
```

Kerning and every other layout feature are kept (`--layout-features='*'`); only glyphs go. Measured with fontTools 4.60.2.
