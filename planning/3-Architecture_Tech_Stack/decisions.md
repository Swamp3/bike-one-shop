# Decisions

## Online payment service

We will use SumUp as our online payment service.

## Frontend framework

We will use Angular as our frontend framework.

## Shop system

We will use Shopware as our shop system.

## Backend / merchandise management (Warenwirtschaft)

The backend (Wawi) is Tridata, integrated via Tricon.

## Customer accounts / auth

bike-one.org has no existing customer or loyalty system to integrate with. We build new customer accounts from scratch for the shop.

## Payment methods

At launch we support card (Visa/Mastercard) and PayPal, both handled natively through SumUp's checkout API — no separate PayPal integration needed. Apple Pay / Google Pay wallets can be added later via SumUp's Swift Checkout SDK on the same integration, so they're not a v1 blocker.

## Frontend rendering (SEO)

Angular runs with server-side rendering (`@angular/ssr`) rather than pure client-side rendering, so Google and the Merchant Center feed crawler receive fully-rendered HTML instead of an empty shell. Paired with schema.org `Product` structured data, canonical URLs, and a generated `sitemap.xml` for product/category pages, per the Google Shopping eligibility requirement in [planning/2-Product_Requirements/questions.md](../2-Product_Requirements/questions.md).

## Frontend architecture / CSS conventions

Prefer container queries (`@container`) over media queries for component-level responsive behavior. A component (product card, filter panel, store-selector, etc.) should adapt to the width of its own container, not the viewport — this is what lets the same component work correctly whether it's rendered full-width on a page or embedded narrow inside a sidebar (e.g. a cart summary), which media queries can't do since they only see the viewport. Media queries stay fine for page-level layout shifts (e.g. switching a page from a single column to a sidebar+content grid).

Build every reusable piece of UI — buttons, cards, common layouts (sidebar+content, tab/step nav, etc.) — as a standalone, reusable Angular component, not one-off markup duplicated per page. This is what the [Click & Collect store-selector wireframe](../../wireframes/click-collect-filiale.html) demonstrated: one component definition, mounted both as a full standalone page and embedded in a narrower checkout context, adapting via its own container query rather than needing two different implementations.

## Hosting — open

3-stage setup decided: dev / staging / prod, dockerized. Provider not yet decided — leaning toward a managed cloud (AWS or Azure) for security, plus interest in a managed Shopware host (e.g. mittwald) instead of self-managing PHP/MySQL/Redis/OpenSearch. Still needs a final pick. Constraints that narrow the field:

- Shopware self-hosted needs PHP 8.2+ (8.4 on Shopware 6.7), MySQL 8 / MariaDB 10.11, Redis (sessions + cache), and an Elasticsearch/OpenSearch-compatible search service for a catalog of real size — this rules out pure serverless/edge platforms (e.g. Vercel) for the Shopware side; Angular's SSR frontend alone would fit those fine.
- GDPR favors an EU data residency region for customer/order data.

| Option | Fit | Trade-off |
| --- | --- | --- |
| AWS (eu-central-1, Frankfurt) | Full-stack fit (ECS/Fargate + RDS MySQL + managed Redis/OpenSearch), most mature security/compliance tooling (IAM, KMS, audit trail) — matches the "managed cloud for security" preference | Most ops complexity and highest cost of the managed-cloud options; someone still assembles/maintains the ECS+RDS+Redis+OpenSearch stack |
| Azure (Germany West Central or West Europe) | Same full-stack fit via App Service / Container Apps + Azure Database for MySQL + Azure Managed Redis; Container Apps has a lower barrier to entry than AWS ECS and scale-to-zero for cost control | Managed OpenSearch equivalent is less first-party than AWS's — likely a 3rd-party add-on or self-run container |
| Managed Shopware host — mittwald | Purpose-built for this exact stack: Shopware-aware Kubernetes hosting, Docker-Compose deploys, Redis and OpenSearch as managed/one-click services in the same project, built-in staging environment matching our dev/staging/prod need, German provider (GDPR-friendly by default) | Narrower general-cloud ecosystem than AWS/Azure; still need to decide where the Angular SSR frontend runs (can be containerized in the same mittwald project, or split out) |
| Hetzner Cloud (Germany) | Cheapest full-stack fit, EU data residency | Fully self-managed — doesn't match the "managed service" preference |
| Vercel (frontend only) | Best-in-class Angular SSR hosting | Cannot host Shopware itself — only viable paired with one of the above for the backend |

Leaning: a managed option (AWS, Azure, or mittwald) over self-managed Hetzner, for security/ops-burden reasons. mittwald is the closest turnkey fit for the Shopware side specifically; AWS/Azure give more general-purpose control and compliance tooling but need the Shopware stack (PHP/MySQL/Redis/OpenSearch) assembled by hand. Final pick still open.

### Price comparison (ballpark, public list prices — not a quote)

Estimated for 3 environments (dev + staging + prod):

| Provider | Ballpark /month | Notes |
| --- | --- | --- |
| **mittwald** (2× vServer S €43 + 1× vServer M €119) | **~€205** (excl. VAT) | Flat, all-inclusive: Shopware app management, managed Redis + OpenSearch, Kubernetes-based infra, daily backups, 24/7 support, German/ISO-27001 data center — most predictable bill of the four |
| **Hetzner Cloud** (3× self-managed VMs, CPX-class) | **~€45–90** | Cheapest sticker price, but nothing managed — you install and maintain Shopware, MySQL, Redis, OpenSearch, backups, and security patches yourself on all 3 environments |
| **Azure** (Container Apps + MySQL Flexible Server + Managed Redis; OpenSearch self-run in a container — no first-party managed equivalent) | **~€250–450** | Cheaper entry than AWS; the missing managed-OpenSearch option undercuts the "fully managed" pitch since search still needs a container someone operates |
| **AWS** (Fargate + RDS MySQL + ElastiCache + OpenSearch) | **~€600–1,700+** | Widest range and the riskiest line item: a dev-sized OpenSearch domain is cheap (~$13–25/mo) but a real 3-AZ production OpenSearch cluster alone runs **~$1,600/mo** — this is what can blow up the AWS bill relative to the other three |
| **Vercel Pro** (frontend only, additive) | **+$20/seat** | Only ever covers the Angular SSR frontend — pair with one of the above for the Shopware side |

Reading it: mittwald and Hetzner are the two ends of the "cheap and predictable" vs. "cheapest but fully self-run" trade-off; Azure sits in the middle; AWS is only worth it if the extra control/compliance tooling matters enough to justify the OpenSearch cost risk. Given the "managed for security" preference, mittwald or Azure look like the stronger fits over AWS — final pick still yours.
