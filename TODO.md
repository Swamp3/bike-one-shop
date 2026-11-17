# TODO

Short, prioritized list of what's still open. This is the readable
punch-list; `PLAN.md` has the full technical record (what was built, how,
and why) behind every line here — this file just points at it.

Status as of 2026-09-29, after Task 12 (national availability, real
inventory, color variants) and Task 13 (Wilier Adlar bike configurator
MVP) landed.

## In progress — due mid-November 2026 (test phase on dedicated Linux server)

- **TriCon mock + sync inspection screens (PLAN.md Task 14).** Plan:
  `planning/3-Architecture_Tech_Stack/tricon-mock-plan.md`; wire contract:
  `planning/3-Architecture_Tech_Stack/tricon-mock-contract.md`. Stateful
  SOAP mock (`backend/apps/tricon-mock`, port 3001) with its own UI for
  items/stock/orders/request log, shop-side `tridata-sync` +
  `tridata-stock-snapshot` modules, stock/order/order-state sync, and a
  "TriCon Sync" page in Medusa admin. Target ready 2026-11-13.
- **TriCon admin: actions for rejected/cancelled-in-TriBike orders
  (Task 14 follow-up).** Today the "Re-upload, new ID" / "Mark sent"
  buttons only exist for `conflict` (duplicate WebShopOrderID) orders,
  and the `rejected` / `canceled_in_tribike` / `partially_delivered`
  attention flags can't be cleared once handled. Add: (1) allow
  "Re-upload, new ID" for `Abgelehnt` orders once the cause is fixed in
  TriBike; (2) a "Mark resolved" button that clears the attention flag,
  logged with the admin user; (3) a shortcut from the alert to Medusa's
  refund + cancel for paid orders that can't be delivered (verify how
  Medusa 2.21.1 handles cancel with a captured payment). Also ask
  BikeOne/TriData what `Abgelehnt` means in their process (fixable
  error vs. always cancel + refund) — TriCon returns no reason.
- **Test server setup.** Dedicated Linux server arriving mid-November
  runs backend, storefront and the mock. Needs: storefront production
  build fixed (Task 3), env vars incl. `TRIDATA_*` pointed at the local
  mock, mock UI behind basic auth, `/soap` not exposed publicly.

- **Before the first real order goes to TriData (legal gate, from the
  2026-10-29 `legal-security-reviewer` pass on Task 14 — not legal advice,
  needs lawyer sign-off):** confirm where TriCon/TriBike is hosted
  (on-prem at BikeOne vs. TriData) and sign an AVV (GDPR Art. 28) with
  TriData if they process or can access the data; name the ERP transfer in
  the privacy policy; define an erasure/retention process for customer
  records in TriBike (no delete function in TriCon). Test server: put the
  storefront behind basic auth/IP allowlist + noindex, only fake customer
  data (example.com) in test orders.

- **Before go-live: OSM map on `/standorte` (legal + ops gate).** The
  store map loads OpenStreetMap tiles after a 2-click notice. The privacy
  policy (currently external, bike-one.org/datenschutz, which the notice
  links to) must name the OSM map loading, the transfer to the
  OpenStreetMap Foundation in the UK (check the adequacy decision is
  still in force) and tile delivery via the Fastly CDN. Decide the tile
  provider before go-live: OSM's public tiles are for low traffic only
  (Tile Usage Policy), so use a contracted provider or self-host. If a
  Content-Security-Policy is added later, allow
  `img-src https://tile.openstreetmap.org` (or the chosen provider).

- **Brevo e-mail on the dev server.** Code done (`src/modules/brevo`, PLAN.md
  Task 17). To switch on: finish the Brevo domain authentication
  (`mail.bike-one.dev`, `BREVO_SETUP.md`), put the API key and
  `NOTIFICATION_PROVIDER_RESOLVE=./src/modules/brevo` into the dev server's
  `.env`, remove `NOTIFICATION_ALLOW_NONE`, restart, place a test order. Before
  go-live: paid Brevo plan, production domain/key/fixed IP, privacy policy
  names Brevo, bounce webhook for failed confirmations. From the security
  review (2026-11-17, Pass): (1) test on the dev server "attempt 1 fails,
  attempt 2 succeeds" with the same idempotency key (briefly use a wrong key):
  status must end `sent` and exactly one mail must arrive; the workflow retries
  4xx too and a timeout after Brevo accepted the mail can send a duplicate;
  (2) `confirmation_email.status = "sent"` only means Brevo accepted it, not
  delivered (see the bounce webhook); (3) tracking off for transactional mail
  (`BREVO_SETUP.md` 7b); (4) sign the Brevo DPA, check sub-processors and the
  transfer basis before the privacy policy says "EU only".
- **Account activation: open items (security review 2026-11-17).** Activation
  mail, guest-order linking and the identity binding are built (PLAN.md Task
  17). Still open before go-live: (1) rate limit `/auth/*` and
  `/auth/verification/request` per IP at the reverse proxy (only an in-memory
  per-address throttle exists); (2) a "resend activation mail" button on the
  login/verification page (today: log in again); (3) clean up unverified
  identities older than about 7 days, because an unverified registration with
  someone else's address blocks that person from registering; (4) the
  register route's "already exists" error reveals registered addresses
  (Medusa behaviour); (5) privacy policy: guest orders are merged into the
  account after e-mail verification, activation mail via Brevo; (6) check
  that moving an order to another customer needs a re-sync to TriCon
  (`updateOrders` emits no order event); (7) legal footer of the activation
  mail uses the same seller data as the order confirmation, owner to confirm.
  Plan with tasks, order and acceptance: `.working-files/account-activation/plan.md`.
- **Cloudflare Access on the admin UI (test server, `shop-admin.bike-one.dev`).**
  Restrict only the admin UI; the storefront, the store API and the SumUp
  webhook (`/hooks/payment/*`) must stay public.
  1. Zero Trust → Access controls → Applications → Create new application →
     Self-hosted and private.
  2. Add public hostname: subdomain `shop-admin` on `bike-one.dev`, path `app*`.
  3. Add an Allow policy for your e-mail only.
  4. Enable the One-time PIN login method, then Create.
  5. No Access app for `shop.bike-one.dev` or for the whole `shop-admin` host.
  6. Test: `https://shop-admin.bike-one.dev/app` shows the PIN login, and a
     curl of `/store/products` and `/hooks/payment/…` is not intercepted. Not
     verified whether Cloudflare wants the path as `app*` or `/app*`; check on
     the first try.
  Gap: with Access only on `/app*`, the Medusa admin API (`/admin/*`) is
  protected by Medusa's own login alone. To put Access in front of it too, add
  a second hostname entry with path `admin*` to the same app (browser calls
  from the admin UI come from the same host, so they carry the Access cookie).
  Test the admin login afterwards.

## Blocked on someone outside this project

- **Compositing prototype for the configurator preview.** The Wilier
  Adlar configurator (Task 13) is fully working end to end — real
  photos, real Laufradsatz price math, real cart/checkout/order grouping
  — but selecting the Zipp 303 XPLR S wheelset still shows the same base
  photo with a plain text note, not a composited image of the bike with
  those wheels. This is the one piece intentionally left out, waiting on
  the compositing approach/prototype you said you'd bring in. Same
  applies to any future Schaltung (GRX/Rival) photo — the gallery's
  image-matching mechanism already supports it generically, it just
  needs the tagged photo.
- **Real component prices for the configurator.** Miche Wheelset (€400)
  and Zipp 303 XPLR S (€1.200) are clearly-flagged placeholders, not real
  BikeOne purchase prices — the Zipp upgrade currently shows +€800 on
  that placeholder basis. Also: Shimano GRX and SRAM Rival are priced
  identically (€3.500) since no real price difference between the two
  was given. Needs real numbers before this goes live.
- **SumUp sandbox on the dev server: enabled 2026-11-17, not yet tested
  end to end.** Sandbox credentials from the local `.env` are in the dev
  server's `.env` (own `SUMUP_WEBHOOK_SECRET`), the provider is enabled for
  the Deutschland region, a Store API payment session creates a SumUp checkout
  and the webhook route answers 401 without the secret. Still to do: a real
  browser checkout with a sandbox test card on `shop.bike-one.dev`, the
  webhook-driven order update, full and partial refund, the amount-11 failure
  test (`SUMUP_SETUP.md` section 5). Live credentials only after the webhook
  gap below is fixed.
- **SumUp webhook signature verification — security gap, not yet fixed.**
  The installed `@sumup/medusa-plugin` (v0.1.0) does not verify the
  authenticity of incoming payment webhooks at all. Not exploitable today
  (nothing is live), but **must be fixed or compensated for before real
  transactions go live** — patch/fork the provider, or add a server-side
  status re-check instead of trusting the webhook payload alone. See
  `PLAN.md` Task 5. Route through `legal-security-reviewer` before
  activating with real credentials either way.
- **TriCon/Tridata WSDL URL + `IdentifyGuid`.** Blocks the real ERP sync
  (Task 6), which in turn blocks: real stock numbers (today's inventory is
  realistic placeholder data, not real counts — Task 12 §3), real Click &
  Collect order fulfillment (see below), and real order sync. When you
  request access, also ask TriData directly whether this BikeOne
  installation uses "one interface for all branches" or "one interface per
  branch" (`planning/3-Architecture_Tech_Stack/tricon-integration-notes.md`)
  — the answer decides whether per-store stock/pickup routing is even
  possible with the current setup. **Update 2026-10-29:** confirmed that
  one TriCon connection covers both stores (TriCon/TriData/TriBike is one
  combined system), so the all-branches functions (`Filialname`) apply.
  Until real credentials arrive, the shop syncs against the mock above.
- **Real product photos, per color.** Color selection is now fully real
  and working — a color-swatch selector on the PDP, wired to the gallery
  (the caption updates live, e.g. "Produktfoto folgt — Farbe: Schwarz").
  What's still missing is the photos themselves: there are none at all yet
  (`bikeone-gallery` shows an honest placeholder, no source to pull real
  images from without fabricating URLs). The mechanism is done; dropping
  in real per-color photos the moment they exist is the only remaining
  step.
- **Real manufacturer colorway names.** The "Farbe" option's values
  (Schwarz/Blau/Weiß/Grau/Grün) are honest generic fallbacks, not
  manufacturer-verified — every attempt to fetch trekbikes.com,
  cervelo.com, factorbikes.com, specialized.com from this environment was
  blocked at the network level. Needs either verified access or you
  supplying the real current colorway names per model.
- **Real shipping prices and delivery times.** Nobody has given real rates.
  The seed has flat 10 €, but the local DB currently holds Standard 100 € and
  Express 200 € (something changed them after seeding; found 2026-11-16). The
  owner has to name the real prices and delivery times; the shop no longer
  states a delivery time or stock availability.
- **Legal compliance before go-live.** Plan and status:
  `.working-files/legal-compliance/plan.md` (code part A done 2026-11-16;
  first `legal-security-reviewer` verdict: needs changes, see
  `review-2026-11-16.md`; the code findings were fixed the same day, a second
  review is still to do). `/agb`,
  `/widerrufsrecht`, `/kontakt` are drafts from the statutory model texts, not
  legal advice. Owner decisions still open:
  1. **bike-one.org and the shutdown.** Impressum, Datenschutz and
     Terminbuchung link there. If they live on the WordPress instance that is
     being stopped, the links die: keep the domain, or move Impressum and
     Datenschutz into the shop first.
  2. **Datenschutzerklärung** is probably written for the old site. Needs shop
     content: accounts, orders, SumUp, freight forwarder, hosting at Strato
     (data processing agreement), cookies (ready text:
     `.working-files/legal-compliance/cookie-inventory.md`), OSM map,
     retention, supervisory authority.
  3. **Impressum.** Company data in `lib/data/company.ts` (and its copy in
     `workflows/order-confirmation/build-email.ts`) now matches the current
     Impressum (BikeOne GmbH, Rheinstrasse 16, 26135 Oldenburg (Oldb), HRB
     220546, USt-IdNr. DE366536184, Marvin Wilczura). That Impressum is
     outdated: it cites § 5 TMG (now DDG) and the EU OS platform
     (discontinued 2025). Update it, wherever it ends up (see 1).
  4. **Voluntary 30-day return:** the promise was removed from the product
     page, trust strip and order page (now "14 Tage Widerrufsrecht bei
     Online-Bestellungen"; old text is in git history). Keep it (then define
     it in the AGB, separate from the statutory right) or drop it. The account
     order list (`order-list`) now uses 14 days.
  5. **Returns and withdrawal: open questions for the owner** are in
     `.working-files/legal-compliance/rueckfragen-rueckgabe-widerruf.md`
     (return costs and estimate for bikes, § 357 Abs. 5 BGB; voluntary 30-day
     return; return address; made-to-order exception for configured builds;
     refunds; services). Consumer arbitration is decided: the Impressum says
     BikeOne does not join, AGB § 9 matches. AGB § 4 reserves correct
     self-supply, valid only with a matching covering purchase. Add a pickup
     clause once Click & Collect is bookable.
  6. **Manufacturer data per brand (GPSR).** The product page has a
     "Herstellerinformationen" block, but no data is entered. Per Medusa
     collection (Trek, Cervélo, Factor, Specialized, Wilier, Ridley,
     Pinarello) set `metadata.manufacturer_name`, `manufacturer_address`,
     `manufacturer_email` in the admin; per product optional
     `metadata.safety_info` (warnings). Do not go live without it.
  7. **E-mail provider** for order confirmations (§ 312i/§ 312f BGB). The
     confirmation e-mail is built and sent through the notification module,
     but only logs locally until a provider is configured
     (`NOTIFICATION_PROVIDER_RESOLVE`, `NOTIFICATION_API_KEY`,
     `NOTIFICATION_FROM` in `backend/apps/backend/.env`; the provider package
     must be installed in `apps/backend`). In production without a provider
     the backend refuses to start unless `NOTIFICATION_ALLOW_NONE=true` (test
     servers only; then no confirmation is sent). The e-mail should come from
     an EU provider (processing agreement); the installed SendGrid provider
     drops the plain-text part. `order-completed-template.tsx` and
     `confirmation-hero` still say "Bestellbestätigung wurde geschickt";
     revisit together with the provider.
  8. **BFSG** (accessibility, since June 2025): exempt only if the company is a
     micro-enterprise (under 10 employees and up to 2 M EUR turnover). Owner
     checks; otherwise an accessibility statement and a WCAG 2.1 AA audit are
     needed.
  9. **Before the first shipment:** LUCID registration and packaging licensing
     (VerpackG); WEEE and battery registration if e-bikes, lights or batteries
     are sold.
  10. **Newsletter:** hidden by default (`NEXT_PUBLIC_NEWSLETTER_ENABLED`
      must be `"true"` to show it; keep it unset in production). Double opt-in
      and provider come when it is built (see below).
  11. **German VAT (done in code).** `setup-german-vat.ts` in
      `src/migration-scripts` creates the 19 % default rate (`DE-MWST-19`) and
      tax-inclusive price preferences on `db:migrate`, so production gets it
      without Admin clicks (Admin > Settings > Tax Regions > Deutschland shows
      it). Verified locally with a fake cart (tax_total = total/1.19*0.19,
      shipping taxed). Not run on an empty DB, and 19 % is hardcoded for
      every product: reduced rates or exempt products are for the tax advisor.
      Add the script to the server checklist in `REVIEW_TASKS.md`. The TriCon
      order upload sends gross amounts only (`VKBrutto`, `ShippingCost`, no tax
      fields); tell the TriCon owner and check whether TriCon derives net and
      VAT itself.
  12. **Withdrawal function (EU 2023/2673, Art. 11a Directive 2011/83/EU, German
      § 356a BGB).** Ask the lawyer whether it applies from 19 June 2026 and
      whether it is a release blocker. Nothing exists in the shop.
  13. **Impressum on bike-one.org:** "geschäftsführender Gesellschafter" should
      read "Geschäftsführer", add a phone number, cite DDG instead of § 5 TMG,
      drop the discontinued EU OS platform. Confirm which phone number is the
      company's: `COMPANY.phone` (storefront `lib/data/company.ts` and the copy
      in `build-email.ts`) is the Oldenburg store number as a placeholder.
  14. **AGB § 2 model.** The contract is formed by the order confirmation
      e-mail (AGB, Widerruf page and e-mail say the same). Owner and lawyer
      confirm, or switch to a separate acceptance with a deadline (§ 308 Nr. 1
      BGB). The e-mail links the AGB only; ask the lawyer whether the AGB text
      must be in the mail (no shared package between storefront and backend, so
      the legal texts exist as copies: storefront pages and `build-email.ts`).
  15. **Datenschutzerklärung additions:** retention of the notification table
      (it stores recipient e-mails).
  16. **Belehrung in "du" or "Sie"?** The model (Anlage 1 zu Art. 246a § 1 Abs. 2
      S. 2 EGBGB) is in "Sie" and says "beigefügte" Muster-Widerrufsformular;
      ours is in "du" and says "das unten stehende". Ask the lawyer whether the
      model protection survives the adaptation (page and `build-email.ts`).
  17. **Monitor the confirmation e-mail.** Under AGB § 2 a failed confirmation
      means no contract. After 3 attempts the result is stored on the order
      (`metadata.confirmation_email.status`); alert on the log prefix
      `[notification] order confirmation` and on orders with status "failed".
      Resend: `POST /admin/orders/:id/resend-confirmation` (tested without
      auth only: 401; not with an admin token). Orders without a recipient
      address or skipped by `NOTIFICATION_ALLOW_NONE` get no status. Who
      watches, and how fast, is an owner decision.
  19. **Follow-ups from the third review (2026-11-16, OK to merge, not OK for
      go-live), all small:**
      - If `NODE_ENV` is not `production` on a server, `notification-local` is
        used and the order is still recorded as `confirmation_email.status =
        "sent"`: fail at `start` when `NODE_ENV` is unset, and do not record
        "sent" for the local provider. Before the first real order place one
        order and check that a real mail arrives.
      - Alert on failed confirmations (log prefix or a daily job listing
        status "failed"); owner decides who acts.
      - The start guards check `process.argv` for `start`: production must run
        exactly `medusa start`; `medusa develop` with `NODE_ENV=production`
        skips them.
      - Record `status: "skipped"` for orders skipped by
        `NOTIFICATION_ALLOW_NONE`; a failed resend should not overwrite an
        earlier "sent"; the resend route does not check for a missing e-mail or
        a canceled order.
      - One unit test for `sendOrderConfirmationWithRetry` (retry loop, record
        step) is missing; provider error text is logged after scrubbing only
        e-mails, phones and GUIDs.
  18. **Guest orders:** the order page links to "Bestellübersicht"
      (`/account/orders`, login needed); guests only have the contact link.
  Code follow-ups from the plan:
  - **Sale prices need the 30-day lowest price (PAngV § 11).** Crossed-out
    prices in `product-price`, `product-preview/price.tsx`, `line-item-price`
    and `line-item-unit-price` are marked with `shortcut:` comments. Implement
    before price lists are used.
  - **Click & Collect claims** on the product page, trust strip and checkout
    now say "bald verfügbar"; restore the real wording when pickup orders
    exist.
  - Not changed, check: the header store picker still says "Abholung:". The
    fake "Rücksendung im Store starten" button was removed from the order list.
- **Hosting provider.** Comparison exists (`planning/3-Architecture_Tech_Stack/decisions.md`).
  Decision (2026-11-09): Strato CP4-18 dedicated server (Xeon E3-1230v6,
  4C/8T, 32 GB ECC, 2x480 GB SSD RAID 1), replacing the netcup VPS 4000
  G12.5 idea. Not ordered yet. Server setup checklist: `REVIEW_TASKS.md`.

## Known gaps, no external blocker — just not built yet

- **Category structure Fahrräder / Komponenten / Zubehör (PLAN.md Task 15).**
  Implemented, awaiting review (not committed). Open: decide whether to publish
  the drafted seed wheelsets (Miche, Zipp 303) so Komponenten appears in the
  menu; run the production build; delete
  `.working-files/category-structure/` once accepted.
- **Real Click & Collect order fulfillment.** Store selection is real
  (Task 11). What's missing is a real pickup *order* flow: a pickup
  fulfillment set/shipping option in Medusa, the `tridata-stock-snapshot`
  module for genuine per-store stock in the store-picker, and a decision
  on the bike-fitting-appointment feature the wireframe sketches. Directly
  tied to TriCon order sync above (`Filialname` on `UploadOrder` maps
  straight onto the pickup-store field) — largely the same piece of work,
  not two separate ones. See `PLAN.md`'s "Later milestones".
- **Mobile header overlap + accent-blind search.** Implemented, awaiting
  review (not committed): mobile header fits at 360/390px (account moved to
  the drawer), store panel spans the header row, and search matches title,
  brand, category, groupset and tags in memory, ignoring accents and case
  (`lib/util/product-search.ts`, self-check `scripts/check-product-search.mjs`).
  Open: delete `.working-files/mobile-header-search/` once accepted. Upgrade
  path once the catalog passes 100 products or typos must match: the backend
  search index (`/store/search`).
- **`store-profile` custom module.** Each stock location's `opening_hours`
  and `email` are stashed in Medusa's generic `metadata` field for now,
  not a real linked module as `schema-design.md` specifies. Small, not
  urgent.
- **Per-instance values that don't carry over to a new Medusa instance.**
  `SUMUP_WEBHOOK_SECRET` (env var, generated per environment — see
  `SUMUP_SETUP.md`) and the `payment_label_pp_sumup_sumup` Store metadata
  key (Admin → Settings → Store, used to display a friendlier SumUp label
  on the storefront's payment step) both live outside migrations/code and
  must be set again by hand on any new dev/staging/prod instance — flagging
  now so it isn't forgotten when going live.
- **Real newsletter signup.** Footer form is an honest UI-only placeholder
  (matches the wireframe's own behavior) — needs a real email/newsletter
  provider plus double opt-in for GDPR compliance.
- **Region is DE-only, not DE/AT/CH.** Deliberate, per your "keep it
  simple" feedback — narrower than `schema-design.md`'s original plan.
  Widening to Austria/Switzerland later is a small additive change
  (2 more countries + 2 tax regions), not a redesign. Flagging so it's a
  conscious decision to revisit, not a forgotten scope cut.
- **Multi-language support — scaffolded but disconnected, not real yet.**
  The storefront already carries locale plumbing from the starter template
  (a `_medusa_locale` cookie, `getLocaleHeader()` auto-attaching
  `x-medusa-locale` to every backend request via `lib/config.ts`, a
  language-select component, `listLocales()`) but none of it does anything:
  `GET /store/locales` 404s (no such route exists in
  `backend/apps/backend/src/api`), and nothing in the backend source reads
  `x-medusa-locale` anywhere. Every string across the storefront (checkout
  included) is hardcoded German today. Needs, in order: a real `/store/locales`
  route backed by actual configured locales, backend content (product/category
  text) keyed by locale and filtered via the already-arriving
  `x-medusa-locale` header, and translating every hardcoded UI string
  (checkout, header, footer, legal pages, etc.) — not a small task, closer
  to its own milestone than a quick add. Once real: the
  `payment_label_<provider_id>` Store-metadata mechanism (see the
  per-instance-values entry above) extends cheaply — suffix keys by locale
  (`payment_label_pp_sumup_sumup_en`), have the backend route prefer the
  suffixed key and fall back to the base one.
- **Mobile header layout.** The icon cluster (search/language/store/cart)
  should default to one item per row instead of today's horizontal row —
  flagged by you, explicitly deferred, needs its own mobile-layout pass.
- **GDPR compliance review** — hasn't happened yet; do this alongside the
  legal pages above, not separately.
- **Testing & QA, CI/CD** — no automated tests, no GitHub Actions workflow
  exist yet.
- **Backend containerization** for a staging environment — not needed for
  local dev, worth doing once there's a staging target.
- **Configurator order-details page not grouped.** Cart, checkout,
  order confirmation, and account order-history all group a custom
  build's line items under one card — the separate, still-unstyled
  `/account/orders/details/[id]` page (plain Medusa-starter table) does
  not yet. Small, noted rather than silently skipped.
- **`bike-configuration` real module still deferred.** Task 13 uses a v0
  `product.metadata`-based mechanism for the Laufradsatz slot, same
  deferral treatment Task 12 gave `store-profile` — the real linked
  module (proper entities, migration, eventual TriCon sync) is follow-up
  work, not started.

## Recently closed (for context, not action items)

- Homepage, PLP, PDP, cart/checkout, account, Click & Collect
  store-selection — all built and verified against the wireframes.
- National region, 2 real stock locations, realistic per-location
  inventory, color variants (data + a real swatch selector wired to the
  gallery) — all live (Task 12).
- Header layout, add-to-cart toast, legal company name in the footer,
  newsletter documented as a placeholder — all shipped from your last
  round of feedback.
- **Wilier Adlar bike configurator MVP (Task 13).** Real photos per
  color, real Laufradsatz (Miche/Zipp) slot with live computed price
  delta, real cart/checkout/order-history grouping via a shared build
  id. Working end to end, including a real placed order. Only the
  compositing preview and real prices remain (see above).
