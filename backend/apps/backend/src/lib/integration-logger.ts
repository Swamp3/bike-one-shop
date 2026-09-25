/**
 * Structured logging for outbound calls to external systems (TriCon/Tridata,
 * SumUp, ...). Every call gets a short correlation id and a consistent,
 * greppable `[scope]` prefix so a debugging session can filter one
 * integration's traffic out of the rest of the backend's logs, e.g.:
 *
 *   docker compose logs backend | grep '\[tridata\]'
 *
 * Usage:
 *
 *   const log = createIntegrationLogger(logger, "tridata")
 *   const result = await log.call("DownloadArtikel", { limit: 100 }, () =>
 *     client.downloadArtikel({ limit: 100 })
 *   )
 */
import type { Logger } from "@medusajs/framework/types";

export type IntegrationLogMeta = Record<string, unknown>;

export interface IntegrationLogger {
  /** Wraps an async call: logs before, logs success/failure with duration after, rethrows on error. */
  call<T>(
    action: string,
    meta: IntegrationLogMeta,
    fn: () => Promise<T>
  ): Promise<T>;
  /** For events that aren't a single outbound call (e.g. a webhook received, a sync job starting). */
  info(action: string, meta?: IntegrationLogMeta): void;
  warn(action: string, meta?: IntegrationLogMeta): void;
}

let counter = 0;
function nextCorrelationId(scope: string): string {
  counter = (counter + 1) % 1_000_000;
  return `${scope}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

function formatMeta(meta: IntegrationLogMeta | undefined): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return " " + JSON.stringify(meta);
  } catch {
    return " [unserializable meta]";
  }
}

export function createIntegrationLogger(
  logger: Logger,
  scope: string
): IntegrationLogger {
  return {
    async call<T>(
      action: string,
      meta: IntegrationLogMeta,
      fn: () => Promise<T>
    ): Promise<T> {
      const correlationId = nextCorrelationId(scope);
      const startedAt = Date.now();
      logger.info(
        `[${scope}] → ${action} correlationId=${correlationId}${formatMeta(meta)}`
      );
      try {
        const result = await fn();
        logger.info(
          `[${scope}] ← ${action} ok correlationId=${correlationId} durationMs=${Date.now() - startedAt}`
        );
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          `[${scope}] ✗ ${action} failed correlationId=${correlationId} durationMs=${Date.now() - startedAt} error="${message}"`
        );
        throw error;
      }
    },
    info(action: string, meta?: IntegrationLogMeta) {
      logger.info(`[${scope}] ${action}${formatMeta(meta)}`);
    },
    warn(action: string, meta?: IntegrationLogMeta) {
      logger.warn(`[${scope}] ${action}${formatMeta(meta)}`);
    },
  };
}
