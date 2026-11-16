# AI Tool Roadmap: Building Your Shop (Claude vs Gemini)

## Quick Reference

| Phase                                              | Status         | Primary tool                                       | Why                                                                                                    |
| -------------------------------------------------- | -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1. Market & competitor research                    | ✅ Done         | **Gemini**                                         | Huge context ingests many pages/reviews at once; strong web grounding                                  |
| 2. Product requirements / project plan             | 🟢 Started, not blocking | **Claude**                               | Structured long-form reasoning, Projects + Memory keep it consistent                                   |
| 3. Architecture & tech stack decisions             | 🟢 Started, not blocking | **Claude**                               | Trade-off reasoning, Opus for the hard calls                                                           |
| 4. UI/UX wireframes & visual concepts              | ✅ Done         | **Claude** (Artifacts) + Gemini for image concepts | Claude renders interactive mockups; Gemini strong on image gen                                         |
| 5. Database schema                                 | 🟢 Started, not blocking | **Claude**                               | Precision + explainable reasoning                                                                      |
| 6. Backend build (API, business logic, payments)   | 🟡 In progress | **Claude Code**                                    | Agentic — writes, runs, debugs in your actual repo                                                     |
| 7. Frontend build (storefront, cart, checkout)     | 🟡 In progress | **Claude Code**                                    | Same repo continuity, iterates with you                                                                |
| 8. Reviewing/onboarding a large or legacy codebase | ⬛ N/A          | **Gemini first, then Claude Code**                 | Gemini's 1–2M token window swallows the whole repo for a first pass; Claude Code does the actual edits |
| 9. Testing & QA                                    | ⚪ Open         | **Claude Code**                                    | Writes and runs test suites, catches edge cases                                                        |
| 10. DevOps / CI-CD / deployment scripts            | ⚪ Open (hosting undecided) | **Claude Code**                                    | Same continuous-build advantage                                                                        |
| 11. Product copy, SEO, marketing content           | 🟡 In progress | **Either**                                         | Claude often better nuance/tone; Gemini convenient if living in Docs/Sheets                            |
| 12. Legal basics (privacy policy, T&Cs, GDPR)      | ⚪ Open (placeholders only) | **Claude**                                         | Strong structured drafting — always have a lawyer review before publishing                             |
| 13. Post-launch analytics / log review             | ⚪ Open         | **Gemini** for bulk logs, **Claude** for strategy  | Gemini ingests raw volume, Claude turns it into decisions                                              |

Status legend:
- ✅ Done
- 🟡 In progress — code is being built; some parts shipped, some gated on outside input (see `../TODO.md`)
- 🟢 Started, not blocking — enough decided that later phases can proceed; what's left is a loose end, not a gate
- 🟠 Started, blocking — open item must resolve before the next phase can proceed (none currently)
- ⚪ Open — not started
- ⬛ N/A (not applicable — fresh build, no legacy codebase to onboard)

Last updated 2026-10-28. For task-level build status see [../PLAN.md](../PLAN.md); for the open/blocked punch-list see [../TODO.md](../TODO.md). This file stays phase-level.

Detail on the planning phases (2-5):
- **Phase 2** — all open questions in [2-Product_Requirements/questions.de.md](2-Product_Requirements/questions.de.md) (German, the maintained version — the earlier English `questions.md` was retired after its content was merged in) are now answered except the legal AGB/Widerrufsrecht review, which is tracked as its own pre-launch TODO under Phase 12 rather than blocking Phase 2. The actual product requirements doc + project plan write-up is still missing, but every downstream phase (3-7) has already been drawing directly on the answered questions, so the missing write-up is a documentation gap, not a blocker.
- **Phase 3** — payment provider, backend/Wawi integration, auth approach, payment methods, and SEO rendering strategy are decided in [3-Architecture_Tech_Stack/decisions.md](3-Architecture_Tech_Stack/decisions.md). **Shop system and frontend framework were revised during Phase 6 planning**: Shopware to Medusa.js v2, Angular to Next.js, both reopened after cost/lock-in research (Shopware's Fair Usage Policy GMV cap and rental-only plugin marketplace) and a better technical fit (Medusa's native multi-warehouse module, purpose-built ERP-sync workflow engine, Next.js's stronger e-commerce SEO/SSR maturity and status as Medusa's flagship storefront target) — see `decisions.md` for the full reasoning. Local dev environment is respecced in [3-Architecture_Tech_Stack/local-dev-setup.md](3-Architecture_Tech_Stack/local-dev-setup.md) for the new stack and doesn't need the hosting pick to start. Only the hosting provider is still open — it gates phase 10 (deployment) but not phases 4-9, which can proceed against local Docker regardless of which cloud is picked.
- **Phase 4** — six interactive, mobile-first HTML wireframes covering the full customer journey live in [wireframes/](../wireframes/): homepage, Gravelbikes category/listing, a product detail page, the cart + 4-step checkout, a reusable Click & Collect store-selector component, and the customer account area. All share one design system (dark header, Oswald/Inter/JetBrains Mono, category icons) refined against Gemini-generated moodboards and a real campaign photo. **Done and consumed:** the storefront pages (PLAN.md Tasks 7-11) were rebuilt to match these wireframes one-for-one, so they are now the design reference for implemented code rather than open work.
- **Phase 5** — full entity-relationship schema in [5-Database_Schema/schema-design.md](5-Database_Schema/schema-design.md), covering every entity the storefront, checkout, account area, and Tridata/TriCon sync need. Originally designed against Shopware, then re-expressed against Medusa.js v2's module/module-link system following the Phase 3 platform revision above — the same entity/relationship thinking carries over (2-store Click & Collect model, TriCon field mappings, GDPR retention, payment-instrument security), only the physical implementation vocabulary changed (Medusa modules instead of Shopware DAL entities, PostgreSQL instead of MySQL). A DBA-style review pass and a follow-up TriCon analysis (full 44-function reference obtained and archived — [3-Architecture_Tech_Stack/tricon-integration-notes.md](3-Architecture_Tech_Stack/tricon-integration-notes.md)) resolved nearly every open design question before the platform switch; that analysis carried over cleanly since TriCon's protocol/fields don't depend on which shop platform consumes them. Genuinely new open items surfaced by the platform switch itself (no native order-number-pattern generator, no native brand entity, multi-language mechanism needs confirming, GDPR customer-deletion flow needs verifying) are tracked in the schema doc's own open-questions section — none blocked Phase 6 from starting. Phase 6 has since started, but only a subset of the schema's custom modules exist as real code — see Phase 6 below.

Detail on the build phases (6-13), as of 2026-10-28:

- **Phase 6 — Backend 🟡.** Medusa v2 + Postgres 16 + Redis 7 run locally via `make setup` / `make dev`; seeded with a real bike catalog, a Germany-only region, two real stock locations (Filialen) with realistic per-location inventory, and color variants (PLAN.md Tasks 1-4, 12).
  - *Done:* Wilier Adlar configurator backend (Laufradsatz swap, `product.metadata`-based v0; Task 13). SumUp payment provider installed and wired end to end in code (hosted checkout, return route, friendly payment labels, webhook gated by a shared `wh_secret`) — registered only once API key, merchant code and webhook secret are all set (Task 5, `SUMUP_SETUP.md`). Shared integration logging and a TriCon/Tridata client stub (Task 6).
  - *Blocked on outside input:* SumUp sandbox credentials (plus a signature-verification gap in `@sumup/medusa-plugin` that must be closed before real money moves); TriCon WSDL URL + `IdentifyGuid`, which gates real stock, order sync and Click & Collect fulfillment (and the "one interface for all branches vs. per branch" question to TriData).
  - *Not built yet:* the custom modules from the Phase 5 schema (`product-brand`, `store-profile`, `tridata-stock-snapshot`, `saved-payment-instrument`, `order-fulfillment-extension`, `tridata-sync`, plus `bike-configuration`) — current custom logic lives in `src/lib`, `src/search` and placeholder API routes instead of the module/workflow convention. Multi-language is scaffolded but disconnected (no `/store/locales` route).
- **Phase 7 — Frontend 🟡.** Next.js storefront rebuilt to the wireframes: homepage and shared chrome, category/collection/search listings, product detail page with color swatches, cart + 4-step checkout (including SumUp payment step), account area, Click & Collect store selection, and the Wilier Adlar configurator UI with grouped build line items in cart/checkout/order history (Tasks 7-13). DE-only, all strings hardcoded German.
  - *Open:* real product photos per color and the configurator's composited preview image, real configurator/shipping prices, mobile header layout pass, order-details page grouping, real newsletter signup, homepage hero copy that overstates Click & Collect.
- **Phase 8 — N/A.** Fresh build, no legacy codebase.
- **Phase 9 — Testing & QA ⚪.** No automated tests exist yet. Verification so far is manual, per task, recorded in PLAN.md.
- **Phase 10 — DevOps ⚪.** No CI workflow, no backend containerization. Hosting provider comparison is in `3-Architecture_Tech_Stack/decisions.md` (Hetzner, Vercel for the frontend, others) but no decision; it gates deploy, not local dev. The storefront's production build works since 2026-10-29 (PLAN.md Task 3).
- **Phase 11 — Copy & SEO 🟡.** Technical SEO audit done and critical blockers fixed (`../SEO_AUDIT.md`), rebrand to "BikeOne", company name corrected in the footer. Remaining: non-blocking SEO opportunities in the audit, real product copy, real manufacturer colorway names.
- **Phase 12 — Legal ⚪.** Impressum, AGB, Datenschutz and Widerrufsrecht are still placeholder `#` links; Impressum is a legal blocker for launch. GDPR review, cookie consent (TDDDG, formerly TTDSG) and double opt-in for the newsletter haven't happened. Everything touching auth, payments, personal data or checkout goes through the `legal-security-reviewer` subagent, then a real lawyer.
- **Phase 13 — Post-launch ⚪.** Not applicable until launch.

## How to actually work

**Use Claude Pro + Claude Code as your "home base."** Since you'll want help at every step, the biggest win is continuity: Claude's Projects + Memory let it remember your stack, naming conventions, and past decisions across sessions, and Claude Code means the same conversation that designed a feature can also write, run, and debug it. This avoids re-explaining context every time you switch tools.

**Reach for Gemini specifically when you need to dump something huge in at once** — an entire existing codebase you're inheriting, a pile of competitor sites, long user-research transcripts, or screen recordings. Its 1M–2M token context window handles that in a single pass better than chunking things for Claude.

## Practical loop per feature

1. Describe the feature to Claude → get a plan + data model.
2. Claude Code implements it directly in your repo.
3. Claude Code writes/runs tests.
4. If something touches a large existing part of the codebase you haven't loaded in, use Gemini to summarize that section first, then bring the summary back to Claude Code to implement against.

## Germany/EU-specific note

Since this is a shop (e-commerce), plan for GDPR, German _Impressum_ requirements, and EU consumer-rights rules (withdrawal/return policy, price display rules) early — draft with Claude, but get an actual lawyer to sign off before launch, especially on payments and data handling.
