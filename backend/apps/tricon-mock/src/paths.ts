import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export const DEFAULT_STATE_PATH = path.join(root, "data", "state.json")
export const DEFAULT_CATALOG_PATH = path.join(root, "seed", "catalog.json")

export function statePath() {
  return process.env.TRICON_MOCK_STATE_FILE || DEFAULT_STATE_PATH
}

export function catalogPath() {
  return process.env.TRICON_MOCK_CATALOG_FILE || DEFAULT_CATALOG_PATH
}
