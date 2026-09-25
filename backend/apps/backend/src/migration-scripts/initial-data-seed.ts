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

  const countries = ["gb", "de", "dk", "se", "fr", "es", "it"];

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

  const {
    result: [store],
  } = await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Default Store",
          supported_currencies: [
            {
              currency_code: "eur",
              is_default: true,
            },
            {
              currency_code: "usd",
              is_default: false,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Europe",
          currency_code: "eur",
          countries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "European Warehouse",
          address: {
            city: "Copenhagen",
            country_code: "DK",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
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

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "European Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Europe",
        geo_zones: [
          {
            country_code: "gb",
            type: "country",
          },
          {
            country_code: "de",
            type: "country",
          },
          {
            country_code: "dk",
            type: "country",
          },
          {
            country_code: "se",
            type: "country",
          },
          {
            country_code: "fr",
            type: "country",
          },
          {
            country_code: "es",
            type: "country",
          },
          {
            country_code: "it",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
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
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
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
      id: stockLocation.id,
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

  const { result: productOptionsResult } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: [
        {
          title: "Frame Size",
          values: ["S", "M", "L", "XL"],
        },
      ],
    },
  });
  const sizeOption = productOptionsResult.find(
    (o) => o.title === "Frame Size"
  )!;

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
          options: [{ id: sizeOption.id }],
          variants: [
            {
              title: "S",
              sku: "TREK-DOMANE-SL6-S",
              options: { "Frame Size": "S" },
              prices: [
                {
                  amount: 4999,
                  currency_code: "eur",
                },
                {
                  amount: 5499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "TREK-DOMANE-SL6-M",
              options: { "Frame Size": "M" },
              prices: [
                {
                  amount: 4999,
                  currency_code: "eur",
                },
                {
                  amount: 5499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "TREK-DOMANE-SL6-L",
              options: { "Frame Size": "L" },
              prices: [
                {
                  amount: 4999,
                  currency_code: "eur",
                },
                {
                  amount: 5499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "TREK-DOMANE-SL6-XL",
              options: { "Frame Size": "XL" },
              prices: [
                {
                  amount: 4999,
                  currency_code: "eur",
                },
                {
                  amount: 5499,
                  currency_code: "usd",
                },
              ],
            },
          ],
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
          options: [{ id: sizeOption.id }],
          variants: [
            {
              title: "S",
              sku: "CERVELO-ASPERO5-S",
              options: { "Frame Size": "S" },
              prices: [
                {
                  amount: 5999,
                  currency_code: "eur",
                },
                {
                  amount: 6499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "CERVELO-ASPERO5-M",
              options: { "Frame Size": "M" },
              prices: [
                {
                  amount: 5999,
                  currency_code: "eur",
                },
                {
                  amount: 6499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "CERVELO-ASPERO5-L",
              options: { "Frame Size": "L" },
              prices: [
                {
                  amount: 5999,
                  currency_code: "eur",
                },
                {
                  amount: 6499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "CERVELO-ASPERO5-XL",
              options: { "Frame Size": "XL" },
              prices: [
                {
                  amount: 5999,
                  currency_code: "eur",
                },
                {
                  amount: 6499,
                  currency_code: "usd",
                },
              ],
            },
          ],
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
          options: [{ id: sizeOption.id }],
          variants: [
            {
              title: "S",
              sku: "FACTOR-OSTROVAM-S",
              options: { "Frame Size": "S" },
              prices: [
                {
                  amount: 8999,
                  currency_code: "eur",
                },
                {
                  amount: 9499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "FACTOR-OSTROVAM-M",
              options: { "Frame Size": "M" },
              prices: [
                {
                  amount: 8999,
                  currency_code: "eur",
                },
                {
                  amount: 9499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "FACTOR-OSTROVAM-L",
              options: { "Frame Size": "L" },
              prices: [
                {
                  amount: 8999,
                  currency_code: "eur",
                },
                {
                  amount: 9499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "FACTOR-OSTROVAM-XL",
              options: { "Frame Size": "XL" },
              prices: [
                {
                  amount: 8999,
                  currency_code: "eur",
                },
                {
                  amount: 9499,
                  currency_code: "usd",
                },
              ],
            },
          ],
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
          options: [{ id: sizeOption.id }],
          variants: [
            {
              title: "S",
              sku: "SPECIALIZED-STUMPJUMPER-S",
              options: { "Frame Size": "S" },
              prices: [
                {
                  amount: 4299,
                  currency_code: "eur",
                },
                {
                  amount: 4599,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "SPECIALIZED-STUMPJUMPER-M",
              options: { "Frame Size": "M" },
              prices: [
                {
                  amount: 4299,
                  currency_code: "eur",
                },
                {
                  amount: 4599,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "SPECIALIZED-STUMPJUMPER-L",
              options: { "Frame Size": "L" },
              prices: [
                {
                  amount: 4299,
                  currency_code: "eur",
                },
                {
                  amount: 4599,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "SPECIALIZED-STUMPJUMPER-XL",
              options: { "Frame Size": "XL" },
              prices: [
                {
                  amount: 4299,
                  currency_code: "eur",
                },
                {
                  amount: 4599,
                  currency_code: "usd",
                },
              ],
            },
          ],
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
    fields: ["id"],
  });

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: item.id,
      })),
    },
  });

  logger.info("Finished seeding inventory levels data.");
}
