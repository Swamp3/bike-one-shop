# TODO

Short, prioritized list of what's still open. This is the readable
punch-list; `PLAN.md` has the full technical record (what was built, how,
and why) behind every line here — this file just points at it.

Status as of 2026-09-29, after Task 12 (national availability, real
inventory, color variants) and Task 13's planning (bike configurator)
landed.

## Next big feature — planned, not started

- **Bike configurator (swap groupset/wheelset/tires).** Full design in
  `PLAN.md` Task 13. Not a new idea — already scoped in
  `planning/2-Product_Requirements/questions.de.md` as "the phase right
  after v1," which this now is. MVP decided: a new **Wilier Adlar**,
  Schaltung (Shimano GRX/SRAM Rival) and Farbe (Bottle Green/Black-Gray)
  as ordinary manufacturer-variant options, Laufradsatz (Miche → Zipp 303
  XPLR) as the one real dealer-added component swap, via a new
  `bike-configuration` module — deliberately *not* more `product_option`s
  for the wheelset, which would explode combinatorially. No assembly fee
  yet (modeled at €0, ready to turn on later); downgrades reduce the
  total (computed price difference, not a stored delta).
  **Blocked on the user's own compositing prototype** for the visual
  preview (component images composited onto the base bike photo per
  color) — decided approach, but not yet shared, so that specific piece
  can't start. The rest (data model, selection UI, pricing, cart
  grouping) isn't blocked by it. Also still needs: real component prices
  from BikeOne, and the base bike photos themselves (2, one per color).

## Blocked on someone outside this project

- **SumUp sandbox credentials.** Payments are code-complete and gated
  (`PLAN.md` Task 5) but inactive without real `SUMUP_API_KEY`/
  `SUMUP_MERCHANT_CODE`. Waiting on you.
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
  possible with the current setup.
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
- **Real shipping prices.** Both shipping options still carry the original
  demo seed's flat €10 — nobody has given real rates.
- **German legal pages.** Impressum, AGB, Datenschutz, Widerrufsrecht are
  still placeholder `#` links in the footer — real legal content needed,
  reviewed via `legal-security-reviewer` before publishing (see also GDPR
  item below).
- **Hosting provider.** Comparison exists (`planning/3-Architecture_Tech_Stack/decisions.md`),
  no decision made — blocks any real deploy, not local dev.

## Known gaps, no external blocker — just not built yet

- **Real Click & Collect order fulfillment.** Store selection is real
  (Task 11). What's missing is a real pickup *order* flow: a pickup
  fulfillment set/shipping option in Medusa, the `tridata-stock-snapshot`
  module for genuine per-store stock in the store-picker, and a decision
  on the bike-fitting-appointment feature the wireframe sketches. Directly
  tied to TriCon order sync above (`Filialname` on `UploadOrder` maps
  straight onto the pickup-store field) — largely the same piece of work,
  not two separate ones. See `PLAN.md`'s "Later milestones".
- **`store-profile` custom module.** Each stock location's `opening_hours`
  and `email` are stashed in Medusa's generic `metadata` field for now,
  not a real linked module as `schema-design.md` specifies. Small, not
  urgent.
- **Homepage hero copy overstates Click & Collect** ("abholbereit
  innerhalb von 2 Stunden") — inconsistent with the honest "Bald
  verfügbar" treatment everywhere else. Quick copy fix, currently
  untouched because editing the homepage was out of scope for the tasks
  that found it.
- **Real newsletter signup.** Footer form is an honest UI-only placeholder
  (matches the wireframe's own behavior) — needs a real email/newsletter
  provider plus double opt-in for GDPR compliance.
- **Region is DE-only, not DE/AT/CH.** Deliberate, per your "keep it
  simple" feedback — narrower than `schema-design.md`'s original plan.
  Widening to Austria/Switzerland later is a small additive change
  (2 more countries + 2 tax regions), not a redesign. Flagging so it's a
  conscious decision to revisit, not a forgotten scope cut.
- **Next.js production build fails** on its own `/404`/`/500` prerender.
  Doesn't affect local dev; needs fixing before any real deploy.
- **Mobile header layout.** The icon cluster (search/language/store/cart)
  should default to one item per row instead of today's horizontal row —
  flagged by you, explicitly deferred, needs its own mobile-layout pass.
- **GDPR compliance review** — hasn't happened yet; do this alongside the
  legal pages above, not separately.
- **Testing & QA, CI/CD** — no automated tests, no GitHub Actions workflow
  exist yet.
- **Backend containerization** for a staging environment — not needed for
  local dev, worth doing once there's a staging target.

## Recently closed (for context, not action items)

- Homepage, PLP, PDP, cart/checkout, account, Click & Collect
  store-selection — all built and verified against the wireframes.
- National region, 2 real stock locations, realistic per-location
  inventory, color variants (data + a real swatch selector wired to the
  gallery) — all live (Task 12).
- Header layout, add-to-cart toast, legal company name in the footer,
  newsletter documented as a placeholder — all shipped from your last
  round of feedback.
