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
import { scrubError } from "./scrub";

export type IntegrationLogMeta = Record<string, unknown>;

/** Passed to the wrapped function so callers can persist the same id the log lines carry. */
export type IntegrationCallContext = {
  correlationId: string;
};

export interface IntegrationLogger {
  /**
   * Wraps an async call: logs before, logs success/failure with duration after, rethrows on error.
   * `fn` receives the call's correlation id (optional to use) so it can be stored alongside
   * whatever the call produces (e.g. a TridataSyncLog row).
   */
  call<T>(
    action: string,
    meta: IntegrationLogMeta,
    fn: (ctx: IntegrationCallContext) => Promise<T>
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

/**
 * What goes to stdout for a failed call: a SOAP-style fault code when the
 * error carries one, plus the message scrubbed of PII/secrets (never the
 * request/response payload).
 */
function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const faultCode =
    error && typeof error === "object" && "faultCode" in error
      ? String((error as { faultCode: unknown }).faultCode)
      : null;
  const scrubbed = scrubError(message, 300).replace(/"/g, "'");
  return faultCode ? `${faultCode}: ${scrubbed}` : scrubbed;
}

export function createIntegrationLogger(
  logger: Logger,
  scope: string
): IntegrationLogger {
  return {
    async call<T>(
      action: string,
      meta: IntegrationLogMeta,
      fn: (ctx: IntegrationCallContext) => Promise<T>
    ): Promise<T> {
      const correlationId = nextCorrelationId(scope);
      const startedAt = Date.now();
      logger.info(
        `[${scope}] → ${action} correlationId=${correlationId}${formatMeta(meta)}`
      );
      try {
        const result = await fn({ correlationId });
        logger.info(
          `[${scope}] ← ${action} ok correlationId=${correlationId} durationMs=${Date.now() - startedAt}`
        );
        return result;
      } catch (error) {
        logger.error(
          `[${scope}] ✗ ${action} failed correlationId=${correlationId} durationMs=${Date.now() - startedAt} error="${describeError(error)}"`
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
