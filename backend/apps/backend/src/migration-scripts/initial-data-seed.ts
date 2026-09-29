import fs from "fs";
import path from "path";
import { MedusaContainer } from "@medusajs/framework";
import type { IFileModuleService } from "@medusajs/framework/types";
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
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// A generic (non-brand-specific) color name, used when a bike's real current
// colorway names could not be confirmed against the manufacturer's own site
// (see the per-product notes below and PLAN.md Task 12 §4). Never a
// fabricated-sounding paint/marketing name.
type ColorSpec = { name: string; abbr: string };

// A real, manufacturer-offered groupset choice for the Wilier Adlar (PLAN.md
// Task 13, confirmed directly by the user) — same "ordinary product_option"
// mechanism as Farbe/Frame Size, not a dealer-added component swap.
type SchaltungSpec = { name: string; abbr: string };

const sizes = ["S", "M", "L", "XL"];

// Real product photography (PLAN.md Task 13) — the first real images in this
// catalog; every other seeded product is untouched and keeps zero images
// (honest placeholder, per PLAN.md Task 12 §4 / the storefront's
// "Produktfoto folgt" gallery). Uploaded through the File module at seed time
// (local-file provider in dev) so each gets a real, servable URL instead of a
// hotlinked/fabricated one.
const exampleImagesDir = path.join(
  __dirname,
  "../../../../../example-product-images"
);

async function uploadRealImage(
  fileModuleService: IFileModuleService,
  filename: string,
  mimeType: string
): Promise<string> {
  const content = await fs.promises.readFile(
    path.join(exampleImagesDir, filename)
  );
  const [file] = await fileModuleService.createFiles([
    {
      filename,
      mimeType,
      content: content.toString("base64"),
      access: "public",
    },
  ]);
  return file.url;
}

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
        // A wheelset is a real, separately-sellable component (PLAN.md Task
        // 13 §2/§3) — not an accessory like a bottle cage, and not a bike
        // either, so it gets its own category rather than being force-fit
        // into one of the four above.
        {
          name: "Laufräder",
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
        { title: "Wilier", handle: "wilier" },
      ],
    },
  });
  const trek = collectionResult.find((c) => c.handle === "trek")!;
  const cervelo = collectionResult.find((c) => c.handle === "cervelo")!;
  const factor = collectionResult.find((c) => c.handle === "factor")!;
  const specialized = collectionResult.find(
    (c) => c.handle === "specialized"
  )!;
  const wilier = collectionResult.find((c) => c.handle === "wilier")!;
  // Miche and Zipp deliberately get no brand collection of their own — the
  // brand-as-collection pattern above is for the bikes shoppers browse by
  // brand; these two are real components sold to fill the Adlar's
  // Laufradsatz slot (PLAN.md Task 13 §2/§3), not a second brand-storefront
  // axis this task was asked to build.

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

  // Wilier Adlar (PLAN.md Task 13) — unlike the 4 colors above, both of
  // these are real and manufacturer/user-confirmed, not generic fallbacks:
  // "Bottle Green" and "Stone Dark" are the real Wilier-offered colorway
  // names for this model (confirmed by the user once real product photos
  // landed — an earlier "Black/Gray" description was wrong and is corrected
  // here), and Shimano GRX / SRAM Rival are the two groupsets Wilier itself
  // actually offers the Adlar in (also user-confirmed, not a generic
  // fallback like Task 12's colors). Both are still ordinary
  // `product_option`s, same mechanism as Farbe/Frame Size — see PLAN.md
  // Task 13 §0 for why (manufacturer-defined finished-bike SKU axes, not a
  // dealer-added component swap).
  const wilierColors: ColorSpec[] = [
    { name: "Bottle Green", abbr: "BGRN" },
    { name: "Stone Dark", abbr: "SDRK" },
  ];
  const wilierSchaltung: SchaltungSpec[] = [
    { name: "Shimano GRX", abbr: "GRX" },
    { name: "SRAM Rival", abbr: "RIVAL" },
  ];

  function buildWilierVariants({
    skuPrefix,
    priceEur,
  }: {
    skuPrefix: string;
    priceEur: number;
  }) {
    const variants: {
      title: string;
      sku: string;
      options: { "Frame Size": string; Schaltung: string; Farbe: string };
      prices: { amount: number; currency_code: string }[];
    }[] = [];

    for (const size of sizes) {
      for (const schaltung of wilierSchaltung) {
        for (const color of wilierColors) {
          variants.push({
            title: `${size} / ${schaltung.name} / ${color.name}`,
            sku: `${skuPrefix}-${size}-${schaltung.abbr}-${color.abbr}`,
            options: {
              "Frame Size": size,
              Schaltung: schaltung.name,
              Farbe: color.name,
            },
            // Real base price (€3.500, user-confirmed) for every variant —
            // see PLAN.md Task 13 for why Schaltung does NOT get a real
            // price differential yet (no real GRX-vs-Rival delta was given;
            // inventing one would violate this project's no-fabrication
            // rule, so every Schaltung value stays at the same real price
            // until a real number lands).
            prices: [{ amount: priceEur, currency_code: "eur" }],
          });
        }
      }
    }

    return variants;
  }

  // Real product photography (PLAN.md Task 13) — this catalog's first.
  // Uploaded through the File module so each image gets a real, servable
  // URL; every other seeded product (including Miche below) is untouched
  // and keeps zero images, the same honest placeholder as before.
  const fileModuleService: IFileModuleService = container.resolve(
    Modules.FILE
  );
  const [
    adlarBottleGreenUrl,
    adlarStoneDarkUrl,
    zipp303FrontUrl,
    zipp303RearUrl,
  ] = await Promise.all([
    uploadRealImage(
      fileModuleService,
      "YZ0TZD_Adlar_C9_Bottle_Green_lat_white-1920x1920_9STYYJ-1.jpg",
      "image/jpeg"
    ),
    uploadRealImage(
      fileModuleService,
      "H6UYXD_Adlar_C10_Stone_Dark_lat_white-1920x1920_L5B1UA-1.jpg",
      "image/jpeg"
    ),
    uploadRealImage(
      fileModuleService,
      "wh-303-xp-s-dbcl-700f-12x100-std-a1-c-side-s.png",
      "image/png"
    ),
    uploadRealImage(
      fileModuleService,
      "wh-303-xp-s-dbcl-700r-xdr-12x142-std-a1-c-side-s.png",
      "image/png"
    ),
  ]);

  const laufraeder = categoryResult.find((c) => c.name === "Laufräder")!;
  const gravelBikes = categoryResult.find((c) => c.name === "Gravel Bikes")!;

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

  // Miche + Zipp 303 XPLR S — real, separately-sellable components (PLAN.md
  // Task 13 §2), created before the Wilier Adlar below because the Adlar's
  // `metadata.configurable_slots` references their real product ids.
  // Neither gets a brand collection (see the note by `wilier` above) or a
  // "Frame Size"/color axis — each is a single real product with one
  // variant ("Default Title", Medusa's standard single-variant pattern),
  // exactly like a gift card or any other size/color-less catalog item.
  //
  // Prices are placeholders, NOT real numbers — no real Miche or Zipp price
  // was given by the user (PLAN.md Task 13). Deliberately round, clearly
  // fictitious figures, Zipp higher than Miche (the upgrade direction), so
  // the Laufradsatz price difference the configurator computes is a real
  // arithmetic result (never a stored delta) even though today it's
  // computed from two placeholder baselines. Needs real BikeOne purchase
  // prices before this goes live.
  const { result: componentResult } = await createProductsWorkflow(
    container
  ).run({
    input: {
      products: [
        {
          title: "Miche Wheelset",
          category_ids: [laufraeder.id],
          description:
            "The standard wheelset the Wilier Adlar ships with. Real Miche hardware (confirmed by the user), but no specific model/name was given, so this listing stays generic rather than inventing one. Sold here as its own real product — not because it's meant to be added to a cart on its own, but so the Laufradsatz upgrade's price difference is always computed against a real baseline price, never a stored delta (see PLAN.md Task 13 §2).",
          handle: "miche-wheelset",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          // No real photo exists for Miche (none was supplied) — stays on
          // the same honest "Produktfoto folgt" placeholder gallery as
          // every other unphotographed product in this catalog.
          options: [{ title: "Title", values: ["Default Title"] }],
          variants: [
            {
              title: "Default Title",
              // Placeholder SKU — no real Miche SKU/model was given.
              sku: "MICHE-WHEELSET-STD",
              options: { Title: "Default Title" },
              // Placeholder price (€400) — flagged above, not real.
              prices: [{ amount: 400, currency_code: "eur" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
        },
        {
          title: "Zipp 303 XPLR S",
          category_ids: [laufraeder.id],
          description:
            "Zipp's 303 XPLR S gravel wheelset — the Laufradsatz upgrade offered on the Wilier Adlar configurator. Real product photography, front and rear. No real BikeOne retail price has been confirmed yet — see PLAN.md Task 13.",
          handle: "zipp-303-xplr-s",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: zipp303FrontUrl,
          images: [
            { url: zipp303FrontUrl, metadata: { view: "front" } },
            { url: zipp303RearUrl, metadata: { view: "rear" } },
          ],
          options: [{ title: "Title", values: ["Default Title"] }],
          variants: [
            {
              title: "Default Title",
              // Rooted in the real SKU naming visible in the supplied
              // product-shot filenames
              // (wh-303-xp-s-dbcl-700f-12x100-... / -700r-xdr-12x142-...) —
              // not an unrelated invented code, per PLAN.md Task 13 §2.
              sku: "ZIPP-303-XPS-DBCL",
              options: { Title: "Default Title" },
              // Placeholder price (€1.200) — flagged above, not real.
              prices: [{ amount: 1200, currency_code: "eur" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
        },
      ],
    },
  });
  const micheProduct = componentResult.find(
    (p) => p.title === "Miche Wheelset"
  )!;
  const zippProduct = componentResult.find(
    (p) => p.title === "Zipp 303 XPLR S"
  )!;

  // Wilier Adlar (PLAN.md Task 13) — a new bike, not one of Task 12's 4.
  // Frame Size + Schaltung + Farbe are all ordinary, manufacturer-defined
  // `product_option` axes (real bounded variant matrix, no explosion risk —
  // see PLAN.md Task 13 §0). The Laufradsatz swap (Miche <-> Zipp) is
  // deliberately NOT a 4th `product_option` — it's a dealer-added component
  // upgrade, modeled as a v0/lighter mechanism via `metadata` below instead
  // of the full `bike-configuration` module PLAN.md originally proposed
  // (that module — ConfigurableSlot/ComponentOption entities, migration,
  // module link, TriCon sync — is real follow-up work, not built here; same
  // deferral treatment PLAN.md Task 12 gave the `store-profile` module).
  const { result: adlarResult } = await createProductsWorkflow(
    container
  ).run({
    input: {
      products: [
        {
          title: "Wilier Adlar",
          collection_id: wilier.id,
          category_ids: [gravelBikes.id],
          description:
            "A gravel bike from Wilier Triestina (real manufacturer, per the user — see PLAN.md Task 13). Configurable at checkout: Shimano GRX or SRAM Rival groupset, Bottle Green or Stone Dark colorway, and an optional Zipp 303 XPLR S wheelset upgrade over the standard Miche wheelset. Full geometry/spec details are not listed here — not independently verified by this catalog, ask BikeOne staff.",
          handle: "wilier-adlar",
          // No real weight was given for this model (unlike the 4 bikes
          // above, which had real-ish spec numbers already in this seed) —
          // left unset rather than inventing one.
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: adlarBottleGreenUrl,
          // Each image is tagged with which selectable option VALUE it
          // depicts — `option_title`/`option_value` name the exact
          // `product.options` entry (title + one of its `values`) shown in
          // this photo. This is deliberately generic, not
          // "farbe"-specific: PLAN.md Task 13's "gap surfaced by the real
          // assets" note says every component should eventually be
          // dynamically visualized, so the same
          // `{option_title, option_value}` shape can tag a future Schaltung
          // photo, or any other option value's image, without a new
          // mechanism. Today only Farbe has real photos (both base photos
          // show the default Shimano GRX groupset — no Rival photo exists
          // yet, a real temporary asset gap per PLAN.md, not a design
          // limit). The storefront reads this via `product.images` +
          // `image.metadata` (requires `+images.metadata` in the fields it
          // requests — not in its default field list yet, see PLAN.md Task
          // 13 for the exact fields query needed).
          images: [
            {
              url: adlarBottleGreenUrl,
              metadata: { option_title: "Farbe", option_value: "Bottle Green" },
            },
            {
              url: adlarStoneDarkUrl,
              metadata: { option_title: "Farbe", option_value: "Stone Dark" },
            },
          ],
          options: [
            { id: sizeOption.id },
            {
              title: "Schaltung",
              values: wilierSchaltung.map((s) => s.name),
            },
            { title: "Farbe", values: wilierColors.map((c) => c.name) },
          ],
          variants: buildWilierVariants({
            skuPrefix: "WILIER-ADLAR",
            priceEur: 3500,
          }),
          sales_channels: [{ id: defaultSalesChannel.id }],
        },
      ],
    },
  });

  const adlarProduct = adlarResult[0];

  // v0 configurable-slot data (PLAN.md Task 13 §3) — lighter than the
  // originally-designed `bike-configuration` module (deferred, see above).
  // Shape: one entry per slot; each option points at a real,
  // already-created, already-sellable product id (never a fake
  // attribute/stored price — the price difference is computed at
  // cart/checkout time from these products' own real prices, per PLAN.md
  // Task 13 §2). Exactly one option per slot has `is_default: true` (the
  // component already shown in both base photos and already included in
  // the €3.500 base price).
  // Set via a follow-up `updateProductsWorkflow` call rather than inline on
  // `createProductsWorkflow`'s input above — `metadata` passed directly to
  // the create call was silently dropped (confirmed via the Store and Admin
  // APIs after seeding: came back `null` despite being present in the
  // create payload), while `images[].metadata` on the same create call
  // persisted correctly. Root cause not pursued further (not worth a deep
  // Medusa internals dig for a v0 seed script) — updating right after
  // creation is a reliable, well-supported workaround, confirmed to work.
  await updateProductsWorkflow(container).run({
    input: {
      products: [
        {
          id: adlarProduct.id,
          metadata: {
            configurable_slots: [
              {
                slot: "Laufradsatz",
                options: [
                  { product_id: micheProduct.id, is_default: true },
                  { product_id: zippProduct.id, is_default: false },
                ],
              },
            ],
          },
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
