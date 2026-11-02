/**
 * Fixes the production build's `/404` prerender crash
 * ("Cannot read properties of null (reading 'useContext')").
 *
 * In this npm-workspaces monorepo the Medusa backend/admin needs React 18,
 * which npm hoists to the workspace root, while the storefront uses React 19
 * from its own node_modules. Next.js itself is nested in the storefront, but
 * its dependency `styled-jsx` gets hoisted to the root, so when Next renders
 * the pages-router error pages, styled-jsx requires the root React 18 while
 * the page renders with React 19 — two React copies, null hook dispatcher.
 *
 * npm can't be told to nest a single package, so before `next build` /
 * `next start` this copies styled-jsx into the storefront's node_modules
 * whenever the hoisted copy would resolve a different React than the
 * storefront's. Idempotent; no-op when resolution is already correct.
 */
const fs = require("fs")
const path = require("path")

const appDir = path.resolve(__dirname, "..")
const localTarget = path.join(appDir, "node_modules", "styled-jsx")

const resolveFrom = (request, from) =>
  require.resolve(request, { paths: [from] })

const nextDir = path.dirname(resolveFrom("next/package.json", appDir))
const styledJsxDir = path.dirname(resolveFrom("styled-jsx/package.json", nextDir))
const appReact = resolveFrom("react", appDir)
const styledJsxReact = resolveFrom("react", styledJsxDir)

if (appReact === styledJsxReact) {
  process.exit(0)
}

fs.rmSync(localTarget, { recursive: true, force: true })
fs.cpSync(styledJsxDir, localTarget, { recursive: true, dereference: true })
console.log(
  `[ensure-local-styled-jsx] copied styled-jsx into ${path.relative(
    appDir,
    localTarget
  )} so it uses the storefront's React (${path.relative(appDir, appReact)})`
)
