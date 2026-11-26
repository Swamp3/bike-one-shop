// WCAG 2.x contrast math and the design tokens of src/styles/tokens.css.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './dist.mjs';

const channel = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const rgb = (hex) => { const h = hex.replace('#', ''); const f = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); };
export const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
export const ratio = (a, b) => { const [hi, lo] = [luminance(typeof a === 'string' ? rgb(a) : a), luminance(typeof b === 'string' ? rgb(b) : b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
/** Colour `fg` with alpha 0..1 laid over opaque `bg`. */
export const over = (fg, alpha, bg) => fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)));

/** { '--ink': '#212529', ... } from tokens.css (colour tokens only). */
export function tokens() {
  const css = fs.readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8');
  return Object.fromEntries([...css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map((m) => [m[1], m[2]]));
}
