/**
 * In-process overlap guard shared by scheduled jobs and admin "run now"
 * actions, so e.g. a manual stock sync never runs concurrently with the
 * scheduled one. Per process only; with several worker instances a
 * distributed lock (Medusa locking module) would be needed.
 */
const running = new Set<string>()

export async function runExclusive<T>(
  key: string,
  fn: () => Promise<T>
): Promise<{ skipped: true } | { skipped: false; result: T }> {
  if (running.has(key)) {
    return { skipped: true }
  }
  running.add(key)
  try {
    return { skipped: false, result: await fn() }
  } finally {
    running.delete(key)
  }
}
