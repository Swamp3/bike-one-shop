/**
 * TriCon/Tridata SOAP client — stub.
 *
 * There is no WSDL URL or IdentifyGuid yet (see
 * planning/3-Architecture_Tech_Stack/tricon-integration-notes.md, "What's
 * still not resolved" — contact TriData support at +49 911 247675-0 /
 * support@tridata.de for sandbox access), so this cannot make real SOAP
 * calls today. What it does provide: every one of TriCon's 44 functions the
 * shop will eventually call is wired through `createIntegrationLogger`, so
 * the moment a method's body is filled in with a real SOAP call, every
 * request/response/failure against TriCon is already logged consistently.
 * Once TriCon work starts, search logs for `[tridata]` to isolate this
 * integration's traffic from the rest of the backend.
 *
 * Each stub throws until implemented — that's intentional, so callers fail
 * loudly instead of silently no-opping. Fill in the body (SOAP envelope via
 * a client like `soap` or `strong-soap`, using `this.config`) once sandbox
 * access exists. Field names/shapes below come from
 * tricon-integration-notes.md's confirmed mappings, not a tested connection.
 */
import type { Logger } from "@medusajs/framework/types";
import {
  createIntegrationLogger,
  IntegrationLogger,
} from "../integration-logger";

export type TridataClientConfig = {
  wsdlUrl?: string;
  identifyGuid?: string;
};

function notImplemented(functionName: string): never {
  throw new Error(
    `TridataClient.${functionName}: SOAP call not implemented yet — see ` +
      "planning/3-Architecture_Tech_Stack/tricon-integration-notes.md"
  );
}

export class TridataClient {
  private readonly log: IntegrationLogger;

  constructor(
    logger: Logger,
    private readonly config: TridataClientConfig
  ) {
    this.log = createIntegrationLogger(logger, "tridata");
  }

  /** Throws with a clear message if the WSDL/GUID aren't configured yet. */
  private assertConfigured(): void {
    if (!this.config.wsdlUrl || !this.config.identifyGuid) {
      throw new Error(
        "TridataClient is not configured — set TRIDATA_WSDL_URL and " +
          "TRIDATA_IDENTIFY_GUID once TriData support provides sandbox access."
      );
    }
  }

  // --- Items & variants (catalog import) ---

  async downloadArtikel(params: { sinceLastChange?: boolean } = {}) {
    return this.log.call("DownloadArtikel", params, async () => {
      this.assertConfigured();
      notImplemented("downloadArtikel");
    });
  }

  async downloadGrFaKombi(params: { artikelId: string }) {
    return this.log.call("DownloadGrFaKombi", params, async () => {
      this.assertConfigured();
      notImplemented("downloadGrFaKombi");
    });
  }

  // --- Images ---

  async downloadArtikelbildByArtikel(params: { artikelId: string }) {
    return this.log.call(
      "DownloadArtikelbildByArtikel",
      params,
      async () => {
        this.assertConfigured();
        notImplemented("downloadArtikelbildByArtikel");
      }
    );
  }

  // --- Stock (feeds Medusa InventoryLevel + tridata-stock-snapshot) ---

  async downloadStockBranch(params: { deltaSince?: string } = {}) {
    return this.log.call("DownloadStockBranch", params, async () => {
      this.assertConfigured();
      notImplemented("downloadStockBranch");
    });
  }

  async downloadStockColorSizeBranch(params: { deltaSince?: string } = {}) {
    return this.log.call(
      "DownloadStockColorSizeBranch",
      params,
      async () => {
        this.assertConfigured();
        notImplemented("downloadStockColorSizeBranch");
      }
    );
  }

  // --- Orders (the outbound checkout path) ---

  /** webShopOrderId should be the Medusa order's `display_id` — see tricon-integration-notes.md. */
  async uploadOrder(params: {
    webShopOrderId: number;
    [key: string]: unknown;
  }) {
    return this.log.call("UploadOrder", params, async () => {
      this.assertConfigured();
      notImplemented("uploadOrder");
    });
  }

  async uploadOrderChangeStorno(params: { webShopOrderId: number }) {
    return this.log.call("UploadOrderChangeStorno", params, async () => {
      this.assertConfigured();
      notImplemented("uploadOrderChangeStorno");
    });
  }

  async downloadOrderStateByOrder(params: { webShopOrderId: number }) {
    return this.log.call("DownloadOrderStateByOrder", params, async () => {
      this.assertConfigured();
      notImplemented("downloadOrderStateByOrder");
    });
  }

  // --- Invoices & credits (account-area PDFs) ---

  async downloadRechnungByOrder(params: { webShopOrderId: number }) {
    return this.log.call("DownloadRechnungByOrder", params, async () => {
      this.assertConfigured();
      notImplemented("downloadRechnungByOrder");
    });
  }
}
