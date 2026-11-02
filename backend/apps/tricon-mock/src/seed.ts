/**
 * Rebuilds the mock state from seed/catalog.json (same as "Reset to seed" in
 * the UI): items, Kombis and stock are regenerated with the same GUIDs,
 * orders and the request log are wiped.
 *
 *   npm run seed
 *
 * Stop the running mock first, or use the UI reset instead: a running server
 * keeps its in-memory state and overwrites the file on its next change.
 */
import { buildSeedState, loadCatalog } from "./seed-data.ts"
import { catalogPath, statePath } from "./paths.ts"
import { Store } from "./state.ts"

const state = buildSeedState(loadCatalog(catalogPath()))
new Store(statePath(), state).save()

console.log(
  `[tricon-mock] Seeded ${state.artikel.length} Artikel, ${state.grfaKombi.length} Kombis, ` +
    `${state.stockBranch.length + state.stockColorSizeBranch.length} stock rows -> ${statePath()}`
)
