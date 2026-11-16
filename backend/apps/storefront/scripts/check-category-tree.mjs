// Self-check for src/lib/util/category-tree.ts: `node scripts/check-category-tree.mjs` (Node >= 22.18 strips the types).
import assert from "node:assert/strict"
import {
  ancestorChain,
  descendantIds,
  hasProducts,
  visibleTopLevel,
} from "../src/lib/util/category-tree.ts"

const cat = (id, parent, rank, products = 0) => ({
  id,
  name: id,
  handle: id,
  parent_category_id: parent,
  rank,
  products: Array.from({ length: products }, (_, i) => ({ id: `${id}-p${i}` })),
})

const all = [
  cat("zubehoer", null, 2),
  cat("fahrraeder", null, 0),
  cat("komponenten", null, 1),
  cat("gravel", "fahrraeder", 1, 3),
  cat("renn", "fahrraeder", 0, 2),
  cat("mtb", "fahrraeder", 2),
  cat("laufraeder", "komponenten", 0),
  cat("deep", "laufraeder", 0, 1),
]
const byId = (id) => all.find((c) => c.id === id)

assert.deepEqual(descendantIds(byId("fahrraeder"), all), ["fahrraeder", "renn", "gravel", "mtb"])
assert.deepEqual(descendantIds(byId("komponenten"), all), ["komponenten", "laufraeder", "deep"])
assert.deepEqual(descendantIds(byId("mtb"), all), ["mtb"])

assert.equal(hasProducts(byId("zubehoer"), all), false)
assert.equal(hasProducts(byId("mtb"), all), false)
assert.equal(hasProducts(byId("komponenten"), all), true, "products two levels down count")

const top = visibleTopLevel(all)
assert.deepEqual(top.map((c) => c.id), ["fahrraeder", "komponenten"])
assert.deepEqual(top[0].category_children.map((c) => c.id), ["renn", "gravel"])
assert.deepEqual(top[1].category_children.map((c) => c.id), ["laufraeder"])

assert.deepEqual(ancestorChain(byId("deep"), all).map((c) => c.id), ["komponenten", "laufraeder", "deep"])

console.log("category-tree: all checks passed")
