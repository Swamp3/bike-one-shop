import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

// A generic (non-brand-specific) color name, used when a bike's real current
// colorway names could not be confirmed against the manufacturer's own site
// (see the per-product notes below and PLAN.md Task 12 §4). Never a
// fabricated-sounding paint/marketing name.
type ColorSpec = { name: string; abbr: string };

const sizes = ["S", "M", "L", "XL"];

function buildVariants({
  skuPrefix,
  colors,
  priceEur,
}: {
  skuPrefix: string;
  colors: ColorSpec[];
  priceEur: number;
}) {
  const variants: {
    title: string;
    sku: string;
    options: { "Frame Size": string; Farbe: string };
    prices: { amount: number; currency_code: string }[];
  }[] = [];

  for (const size of sizes) {
    for (const color of colors) {
      variants.push({
        title: `${size} / ${color.name}`,
        sku: `${skuPrefix}-${size}-${color.abbr}`,
        options: { "Frame Size": size, Farbe: color.name },
        prices: [{ amount: priceEur, currency_code: "eur" }],
      });
    }
  }

  return variants;
}

// Deterministic, per-variant "realistic" placeholder inventory quantities —
// there is no real business inventory count yet (no TriCon/Tridata feed,
// see PLAN.md Task 12 §3). Two interleaved repeating patterns (length 11,
// coprime with most product variant counts) assigned by sorted SKU index so
// the mix is reproducible: mostly small in-stock quantities, a handful of
// single-location zeros (tests that per-location + aggregate stock is
// handled correctly), and one fully-sold-out combination per 11 variants
// (tests the real "Ausverkauft" path).
const OL_PATTERN = [3, 1, 0, 4, 2, 5, 1, 3, 0, 2, 0];
const OS_PATTERN = [2, 4, 1, 5, 0, 3, 0, 2, 0, 1, 4];

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );

  logger.info("Seeding store data...");
  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "Default Sales Channel",
          description: "Created by Medusa",
        },
      ],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Default Publishable API Key",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  });

  // EUR only — BikeOne is a German retailer with no multi-currency
  // requirement (schema-design.md "Out of scope for v1"), and USD pricing
  // for a store with no USD-priced region is dead/confusing data.
  const {
    result: [store],
  } = await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "BikeOne Store",
          supported_currencies: [
            {
              currency_code: "eur",
              is_default: true,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  // Germany-only region — a deliberate narrowing of schema-design.md's
  // DE/AT/CH region, per explicit fresh user feedback ("start with national
  // availability first to keep things easy"). See PLAN.md Task 12 §1 for
  // the full note; widening back to AT/CH later is a small, additive
  // change (country list + tax regions), not a redesign.
  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Deutschland",
          currency_code: "eur",
          countries: ["de"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "de",
        provider_id: "tp_system",
      },
    ],
  });
  logger.info("Finished seeding tax regions.");

  // Two real BikeOne stores (schema-design.md: "2 fixed physical
  // locations", not a simplification to revisit later). Addresses/phone
  // match the storefront footer exactly. `email` has no native
  // stock_location field yet (that's the not-yet-built `store-profile`
  // module — see PLAN.md Task 12 §2) so it's stashed in `metadata` for now.
  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "BikeOne Oldenburg",
          address: {
            address_1: "Rheinstr. 16",
            city: "Oldenburg",
            postal_code: "26135",
            country_code: "de",
            phone: "0441 984 894 83",
          },
          metadata: {
            email: "OL@bike-one.de",
          },
        },
        {
          name: "BikeOne Osnabrück",
          address: {
            address_1: "Lengericher Landstraße 30",
            city: "Osnabrück",
            postal_code: "49078",
            country_code: "de",
            phone: "0541 440 952 84",
          },
          metadata: {
            email: "OS@bike-one.de",
          },
        },
      ],
    },
  });
  const oldenburg = stockLocationResult.find(
    (l) => l.name === "BikeOne Oldenburg"
  )!;
  const osnabrueck = stockLocationResult.find(
    (l) => l.name === "BikeOne Osnabrück"
  )!;

  // Both locations get a fulfillment *provider* link — either one could end
  // up holding the reserved stock for an order (Medusa reserves inventory
  // across every stock location linked to the cart's sales channel, not
  // just the location a shipping option nominally points at — confirmed by
  // reading @medusajs/core-flows's cart-complete/
  // prepare-confirm-inventory-input.js), so both need a registered provider
  // to be able to carry a real Fulfillment.
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: oldenburg.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: osnabrueck.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  // This is created by a migration script in core.
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  // One shared "national shipping" fulfillment set/service zone for
  // Germany, structurally anchored to a single stock_location (Medusa's
  // FulfillmentSet <-> StockLocation link is 1:1 — see
  // @medusajs/link-modules's fulfillment-set-location.js), here Oldenburg.
  // This is a deliberate, documented simplification for this shipping-only
  // task (not the real, later Click & Collect model): since inventory
  // reservation at checkout is aggregated across *every* stock location
  // linked to the sales channel (both Oldenburg and Osnabrück, linked
  // below), a single shared "Standard-Versand"/"Express-Versand" pair
  // already lets a real order complete from either store's stock, without
  // needing duplicate, confusingly-identical shipping options per store.
  // Real Click & Collect (a separate, later, blocked task — see PLAN.md
  // "Later milestones") is what will need a genuine per-store pickup
  // fulfillment set/service zone.
  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "BikeOne Versand",
    type: "shipping",
    service_zones: [
      {
        name: "Deutschland",
        geo_zones: [
          {
            country_code: "de",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: oldenburg.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard-Versand",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Versand in 2–3 Werktagen.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 10,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express-Versand",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Lieferung innerhalb von 24 Std.",
          code: "express",
        },
        prices: [
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 10,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: oldenburg.id,
      add: [defaultSalesChannel.id],
    },
  });
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: osnabrueck.id,
      add: [defaultSalesChannel.id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding product data...");

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Road Bikes",
          is_active: true,
        },
        {
          name: "Gravel Bikes",
          is_active: true,
        },
        {
          name: "Mountain Bikes",
          is_active: true,
        },
        {
          name: "Accessories",
          is_active: true,
        },
      ],
    },
  });

  // Brands aren't a native Medusa entity yet (see
  // planning/5-Database_Schema/schema-design.md's `product-brand` row for the
  // custom module that will eventually replace this). Collections are the
  // interim stand-in so brand pages and filtering work today.
  const { result: collectionResult } = await createCollectionsWorkflow(
    container
  ).run({
    input: {
      collections: [
        { title: "Trek", handle: "trek" },
        { title: "Cervélo", handle: "cervelo" },
        { title: "Factor", handle: "factor" },
        { title: "Specialized", handle: "specialized" },
      ],
    },
  });
  const trek = collectionResult.find((c) => c.handle === "trek")!;
  const cervelo = collectionResult.find((c) => c.handle === "cervelo")!;
  const factor = collectionResult.find((c) => c.handle === "factor")!;
  const specialized = collectionResult.find(
    (c) => c.handle === "specialized"
  )!;

  const { result: sizeOptionResult } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: [
        {
          title: "Frame Size",
          values: sizes,
        },
      ],
    },
  });
  const sizeOption = sizeOptionResult.find((o) => o.title === "Frame Size")!;

  // "Farbe" (German — see PLAN.md Task 12 §4 for why "Frame Size" itself
  // stays English, a pre-existing inconsistency left alone). Colors below
  // are researched per product against the manufacturer's own site
  // (trekbikes.com / cervelo.com / factorbikes.com / specialized.com) —
  // but every one of those sites, and docs.medusajs.com, is blocked by this
  // session's network egress policy (confirmed via repeated WebFetch
  // EGRESS_BLOCKED errors, not a transient failure — see PLAN.md Task 12
  // §4 for the exact evidence). A supplementary web *search* (not a fetch
  // of the manufacturer's own page) surfaced plausible current colorway
  // names for some models, but nothing here could be verified directly
  // against the primary source, and results were inconsistent/mixed
  // model-years across retailers. Per this project's no-fabrication rule,
  // every color below is therefore a plain, generic, honest fallback name
  // (Schwarz/Blau/Weiß/Grau/Grün) — never a specific-sounding factory paint
  // name — for all 4 products, not just some. Every size ships in every
  // color for all 4 products: with no real per-model size/color
  // availability data to go on, inventing exclusions would itself be a
  // fabricated availability claim, so a full cross-product is the more
  // honest choice here.
  //
  // Each product gets its own "Farbe" option created inline (not via the
  // shared/reused `createProductOptionsWorkflow` pattern `sizeOption` uses
  // above) because that shared path enforces a globally-unique option
  // title — a second standalone "Farbe" option collides with the first.
  // An inline `{title, values}` entry in a product's own `options` array
  // creates an option scoped to that one product instead, which is also
  // the more correct shape here since each bike's color values differ.
  const trekColors: ColorSpec[] = [
    { name: "Schwarz", abbr: "BLK" },
    { name: "Blau", abbr: "BLU" },
    { name: "Weiß", abbr: "WHT" },
  ];
  const cerveloColors: ColorSpec[] = [
    { name: "Schwarz", abbr: "BLK" },
    { name: "Grau", abbr: "GRY" },
  ];
  const factorColors: ColorSpec[] = [
    { name: "Schwarz", abbr: "BLK" },
    { name: "Weiß", abbr: "WHT" },
    { name: "Blau", abbr: "BLU" },
  ];
  const specializedColors: ColorSpec[] = [
    { name: "Schwarz", abbr: "BLK" },
    { name: "Grau", abbr: "GRY" },
    { name: "Grün", abbr: "GRN" },
  ];

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Trek Domane SL 6",
          collection_id: trek.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Road Bikes")!.id,
          ],
          description:
            "An endurance road bike built for long days in the saddle. Trek's IsoSpeed decoupler smooths out rough roads without sacrificing efficiency, making the Domane SL 6 equally at home on club rides and all-day gravel-adjacent adventures.",
          handle: "trek-domane-sl-6",
          weight: 8900,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [
            { id: sizeOption.id },
            { title: "Farbe", values: trekColors.map((c) => c.name) },
          ],
          variants: buildVariants({
            skuPrefix: "TREK-DOMANE-SL6",
            colors: trekColors,
            priceEur: 4999,
          }),
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
        },
        {
          title: "Cervélo Áspero-5",
          collection_id: cervelo.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Gravel Bikes")!.id,
          ],
          description:
            "A race-bred gravel bike from the brand that pioneered aero road design. The Áspero-5 carries that same obsession with speed off the tarmac, with clearance for wide tires and a frame stiff enough to sprint out of a gravel corner.",
          handle: "cervelo-aspero-5",
          weight: 9200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [
            { id: sizeOption.id },
            { title: "Farbe", values: cerveloColors.map((c) => c.name) },
          ],
          variants: buildVariants({
            skuPrefix: "CERVELO-ASPERO5",
            colors: cerveloColors,
            priceEur: 5999,
          }),
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
        },
        {
          title: "Factor Ostro VAM",
          collection_id: factor.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Road Bikes")!.id,
          ],
          description:
            "Factor's aero race bike, sold direct-to-consumer since day one. The Ostro VAM pairs a fully integrated aero cockpit with a claimed sub-800g frame weight, built for riders who want a WorldTour-grade race machine without the WorldTour price gouging.",
          handle: "factor-ostro-vam",
          weight: 7300,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [
            { id: sizeOption.id },
            { title: "Farbe", values: factorColors.map((c) => c.name) },
          ],
          variants: buildVariants({
            skuPrefix: "FACTOR-OSTROVAM",
            colors: factorColors,
            priceEur: 8999,
          }),
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
        },
        {
          title: "Specialized Stumpjumper",
          collection_id: specialized.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Mountain Bikes")!.id,
          ],
          description:
            "The trail bike that defined the category, updated for another generation. The Stumpjumper balances a playful, efficient ride with enough travel to handle technical terrain, backed by Specialized's FSR suspension platform.",
          handle: "specialized-stumpjumper",
          weight: 13500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [
            { id: sizeOption.id },
            { title: "Farbe", values: specializedColors.map((c) => c.name) },
          ],
          variants: buildVariants({
            skuPrefix: "SPECIALIZED-STUMPJUMPER",
            colors: specializedColors,
            priceEur: 4299,
          }),
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
        },
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  });

  const sortedInventoryItems = [...inventoryItems].sort((a, b) =>
    (a.sku ?? "").localeCompare(b.sku ?? "")
  );

  const inventoryLevels = sortedInventoryItems.flatMap((item, index) => {
    const olQty = OL_PATTERN[index % OL_PATTERN.length];
    const osQty = OS_PATTERN[index % OS_PATTERN.length];

    return [
      {
        location_id: oldenburg.id,
        stocked_quantity: olQty,
        inventory_item_id: item.id,
      },
      {
        location_id: osnabrueck.id,
        stocked_quantity: osQty,
        inventory_item_id: item.id,
      },
    ];
  });

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");
}
