// Self-check for src/lib/util/product-search.ts: `node scripts/check-product-search.mjs` (Node >= 22.18 strips the types).
import assert from "node:assert/strict"
import { matchesQuery } from "../src/lib/util/product-search.ts"

const bike = {
  title: "Cervélo Caledonia",
  collection: { title: "Cervélo" },
  categories: [{ name: "Rennräder" }],
  options: [
    { title: "Schaltung", values: [{ value: "SRAM Force" }, { value: "Shimano 105" }] },
    { title: "Farbe", values: [{ value: "Schwarz" }] },
  ],
  tags: [{ value: "Straße" }],
}

assert.equal(matchesQuery(bike, "Cervelo"), true, "accent-free input")
assert.equal(matchesQuery(bike, "cervélo"), true, "accented input")
assert.equal(matchesQuery(bike, "CERVELO"), true, "case")
assert.equal(matchesQuery(bike, "rennrader"), true, "umlaut in category")
assert.equal(matchesQuery(bike, "strasse"), true, "ß as ss in tag")
assert.equal(matchesQuery(bike, "Straße"), true, "ß in query")
assert.equal(matchesQuery(bike, "sram force"), true, "several words")
assert.equal(matchesQuery(bike, "  sram   caledonia "), true, "extra spaces, words from different fields")
assert.equal(matchesQuery(bike, "sram dura"), false, "every word must match")
assert.equal(matchesQuery(bike, "schwarz"), false, "Farbe is not searched")
assert.equal(matchesQuery(bike, "rennrad"), true, "substring of Rennräder")
assert.equal(matchesQuery(bike, ""), true, "empty query")
assert.equal(matchesQuery(bike, "   "), true, "blank query")
assert.equal(matchesQuery({ title: "Factor Ostro" }, "factor"), true, "missing relations")
assert.equal(matchesQuery({ title: "Factor Ostro" }, "xyz"), false)

console.log("product-search: ok")
