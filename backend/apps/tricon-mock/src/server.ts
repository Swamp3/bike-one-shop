import { buildApp } from "./app.ts"
import { catalogPath, statePath } from "./paths.ts"
import { exposedHosts, startupProblems } from "./startup-checks.ts"

const port = Number(process.env.TRICON_MOCK_PORT || 3001)
const host = process.env.TRICON_MOCK_HOST || "127.0.0.1"
const uiUser = process.env.TRICON_MOCK_UI_USER || undefined
const uiPassword = process.env.TRICON_MOCK_UI_PASSWORD || undefined
const guid = process.env.TRICON_MOCK_GUID?.trim() || undefined
const allowedHosts = (process.env.TRICON_MOCK_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)

const problems = startupProblems({ host, allowedHosts, uiUser, uiPassword, guid })
if (problems.length) {
  const exposed = exposedHosts({ host, allowedHosts }).join(", ")
  console.error(`[tricon-mock] Refusing to start, reachable beyond loopback (${exposed}):\n  - ${problems.join("\n  - ")}`)
  process.exit(1)
}

const { app } = buildApp({
  statePath: statePath(),
  catalogPath: catalogPath(),
  guid,
  uiUser,
  uiPassword,
  port,
  allowedHosts,
  logger: process.env.TRICON_MOCK_LOG === "1",
})

try {
  await app.listen({ port, host })
  console.log(`[tricon-mock] SOAP: http://${host}:${port}/soap  UI: http://${host}:${port}/  state: ${statePath()}`)
} catch (error) {
  console.error(error)
  process.exit(1)
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    app.close().then(() => process.exit(0))
  })
}
