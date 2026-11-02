export const MAX_UPLOAD_ATTEMPTS = 10

/** Exponential backoff: 1, 2, 4, 8 ... minutes, capped at 60. */
export function nextAttemptAt(attempts: number, now = new Date()): Date {
  const minutes = Math.min(60, 2 ** Math.max(0, attempts - 1))
  return new Date(now.getTime() + minutes * 60_000)
}
