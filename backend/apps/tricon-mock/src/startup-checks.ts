import { DEFAULT_GUID } from "./soap.ts"

export type StartupConfig = {
  host: string
  allowedHosts: string[]
  uiUser?: string
  uiPassword?: string
  guid?: string
}

const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "[::1]"])

function hostname(entry: string): string {
  try {
    return new URL(`http://${entry.trim().toLowerCase()}`).hostname
  } catch {
    return entry.trim().toLowerCase()
  }
}

/** Hosts that make the mock reachable beyond this machine: the bind address or a proxied Host. */
export function exposedHosts(config: StartupConfig): string[] {
  const exposed: string[] = []
  if (!LOOPBACK.has(config.host.trim().toLowerCase())) {
    exposed.push(`bind address ${config.host}`)
  }
  for (const entry of config.allowedHosts) {
    if (!LOOPBACK.has(hostname(entry))) {
      exposed.push(`allowed host ${entry}`)
    }
  }
  return exposed
}

/**
 * Problems that must stop the server. Loopback-only (make dev) is exempt; as
 * soon as the mock is bound off loopback or reachable through a proxied
 * hostname, basic auth and a non-default IdentifyGuid are required.
 */
export function startupProblems(config: StartupConfig): string[] {
  if (exposedHosts(config).length === 0) {
    return []
  }
  const problems: string[] = []
  if (!(config.uiUser && config.uiPassword)) {
    problems.push("TRICON_MOCK_UI_USER and TRICON_MOCK_UI_PASSWORD must be set (e.g. password from `openssl rand -hex 24`)")
  }
  const guid = config.guid?.trim().toLowerCase()
  if (!guid || guid === DEFAULT_GUID) {
    problems.push("TRICON_MOCK_GUID must be set to a non-default GUID (e.g. from `uuidgen | tr A-Z a-z`)")
  }
  return problems
}
