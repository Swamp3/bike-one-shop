import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createPricePreferencesWorkflow,
  createTaxRatesWorkflow,
  createTaxRegionsWorkflow,
  updatePricePreferencesWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * German VAT: tax region "de" with a default 19 % rate, and tax-inclusive
 * prices for EUR and the German region (shop prices are gross, PAngV).
 * Runs after initial-data-seed.ts (scripts run in file-name order). Idempotent:
 * safe to run again with `medusa exec`. Without a rate every order shows
 * 0,00 EUR VAT.
 *
 * To change the rate later: Admin > Settings > Tax Regions > Deutschland.
 * Reduced rates or other products are not modelled here (owner/tax advisor).
 */
export default async function setup_german_vat({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const loadTaxRegion = async () =>
    (
      await query.graph({
        entity: "tax_region",
        fields: ["id", "country_code", "tax_rates.id", "tax_rates.is_default", "tax_rates.rate"],
        filters: { country_code: "de" },
      })
    ).data[0]

  let taxRegion = await loadTaxRegion()
  if (!taxRegion) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "de", provider_id: "tp_system" }],
    })
    taxRegion = await loadTaxRegion()
    logger.info("[vat] created tax region de")
  }

  const existingDefault = taxRegion.tax_rates?.find((r) => r?.is_default)
  if (existingDefault) {
    logger.info("[vat] default tax rate already exists, skipped")
    if (Number(existingDefault.rate) !== 19) {
      logger.warn(
        `[vat] existing default tax rate is ${existingDefault.rate} %, not 19 %: check Admin > Settings > Tax Regions > Deutschland (owner/tax advisor)`
      )
    }
  } else {
    await createTaxRatesWorkflow(container).run({
      input: [
        {
          tax_region_id: taxRegion.id,
          name: "MwSt. 19 %",
          code: "DE-MWST-19",
          rate: 19,
          is_default: true,
        },
      ],
    })
    logger.info("[vat] created default tax rate DE-MWST-19 (19 %)")
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code", "countries.iso_2"],
  })
  const region = regions.find((r) =>
    r.countries?.some((c) => c?.iso_2 === "de")
  )

  if (!region) {
    logger.warn(
      "[vat] no region with country de found: the region_id price preference was skipped, so region prices may not be tax-inclusive (rerun after creating the region)"
    )
  }

  const wanted: { attribute: string; value: string }[] = [
    { attribute: "currency_code", value: "eur" },
    ...(region ? [{ attribute: "region_id", value: region.id }] : []),
  ]
  const { data: prefs } = await query.graph({
    entity: "price_preference",
    fields: ["id", "attribute", "value", "is_tax_inclusive"],
  })
  for (const w of wanted) {
    const existing = prefs.find(
      (p) => p.attribute === w.attribute && p.value === w.value
    )
    if (!existing) {
      await createPricePreferencesWorkflow(container).run({
        input: [{ ...w, is_tax_inclusive: true }],
      })
      logger.info(`[vat] created tax-inclusive price preference ${w.attribute}=${w.value}`)
    } else if (!existing.is_tax_inclusive) {
      await updatePricePreferencesWorkflow(container).run({
        input: {
          selector: { id: [existing.id] },
          update: { is_tax_inclusive: true },
        },
      })
      logger.info(`[vat] price preference ${w.attribute}=${w.value} is now tax-inclusive`)
    }
  }
}
