// Record one decision: state.mjs (.conversion/state.json) and a row at the end of docs/plan.md. usage: node dec.mjs '<json>'
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const W = '/Users/timo.alts/dev/bike-one-shop/website';
const d = JSON.parse(process.argv[2]);
const id = execFileSync('node', ['scripts/state.mjs', '--dir', '.', 'decision', JSON.stringify(d)], { cwd: W, encoding: 'utf8' }).trim();
const state = JSON.parse(fs.readFileSync(`${W}/.conversion/state.json`, 'utf8'));
const row = state.decisions.find((x) => x.id === id) ?? state.decisions.at(-1);
const cell = (s) => String(s).replace(/\|/g, '\\|');
const file = `${W}/docs/plan.md`;
let text = fs.readFileSync(file, 'utf8');
if (!text.endsWith('\n')) text += '\n';
text += `| ${row.id} | ${row.date} | ${cell(row.topic)} | ${cell(row.choice)} | ${cell(row.default)} | ${cell(row.reason)} | ${cell(row.costIfWrong)} |\n`;
fs.writeFileSync(file, text);
console.log(row.id);
