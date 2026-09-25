/**
 * Prints the store's publishable API key so setup scripts can capture it
 * without booting the HTTP server or hand-copying it from the admin UI.
 *
 *   npx medusa exec ./src/scripts/print-publishable-key.ts
 *
 * Requires migrations to have already run (they create the default key).
 */
import type { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function printPublishableKey({ container }: ExecArgs) {
  const apiKeyModuleService = container.resolve(Modules.API_KEY);
  const [key] = await apiKeyModuleService.listApiKeys({
    type: "publishable",
  });

  if (!key) {
    throw new Error(
      "No publishable API key found. Run `medusa db:migrate` first."
    );
  }

  console.log(`PUBLISHABLE_KEY=${key.token}`);
}
