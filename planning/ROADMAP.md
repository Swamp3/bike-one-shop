# AI Tool Roadmap: Building Your Shop (Claude vs Gemini)

## Quick Reference

| Phase                                              | Status         | Primary tool                                       | Why                                                                                                    |
| -------------------------------------------------- | -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1. Market & competitor research                    | ✅ Done         | **Gemini**                                         | Huge context ingests many pages/reviews at once; strong web grounding                                  |
| 2. Product requirements / project plan             | 🟢 Started, not blocking | **Claude**                               | Structured long-form reasoning, Projects + Memory keep it consistent                                   |
| 3. Architecture & tech stack decisions             | 🟢 Started, not blocking | **Claude**                               | Trade-off reasoning, Opus for the hard calls                                                           |
| 4. UI/UX wireframes & visual concepts              | 🟢 Started, not blocking | **Claude** (Artifacts) + Gemini for image concepts | Claude renders interactive mockups; Gemini strong on image gen                                         |
| 5. Database schema                                 | 🟢 Started, not blocking | **Claude**                               | Precision + explainable reasoning                                                                      |
| 6. Backend build (API, business logic, payments)   | ⚪ Open         | **Claude Code**                                    | Agentic — writes, runs, debugs in your actual repo                                                     |
| 7. Frontend build (storefront, cart, checkout)     | ⚪ Open         | **Claude Code**                                    | Same repo continuity, iterates with you                                                                |
| 8. Reviewing/onboarding a large or legacy codebase | ⬛ N/A          | **Gemini first, then Claude Code**                 | Gemini's 1–2M token window swallows the whole repo for a first pass; Claude Code does the actual edits |
| 9. Testing & QA                                    | ⚪ Open         | **Claude Code**                                    | Writes and runs test suites, catches edge cases                                                        |
| 10. DevOps / CI-CD / deployment scripts            | ⚪ Open         | **Claude Code**                                    | Same continuous-build advantage                                                                        |
| 11. Product copy, SEO, marketing content           | ⚪ Open         | **Either**                                         | Claude often better nuance/tone; Gemini convenient if living in Docs/Sheets                            |
| 12. Legal basics (privacy policy, T&Cs, GDPR)      | ⚪ Open         | **Claude**                                         | Strong structured drafting — always have a lawyer review before publishing                             |
| 13. Post-launch analytics / log review             | ⚪ Open         | **Gemini** for bulk logs, **Claude** for strategy  | Gemini ingests raw volume, Claude turns it into decisions                                              |

Status legend:
- ✅ Done
- 🟢 Started, not blocking — enough decided that later phases can proceed; what's left is a loose end, not a gate
- 🟠 Started, blocking — open item must resolve before the next phase can proceed (none currently)
- ⚪ Open — not started
- ⬛ N/A (not applicable — fresh build, no legacy codebase to onboard)

Detail on the three "Started" phases:
- **Phase 2** — all open questions in [2-Product_Requirements/questions.de.md](2-Product_Requirements/questions.de.md) (German, the maintained version — the earlier English `questions.md` was retired after its content was merged in) are now answered except the legal AGB/Widerrufsrecht review, which is tracked as its own pre-launch TODO under Phase 12 rather than blocking Phase 2. The actual product requirements doc + project plan write-up is still missing, but every downstream phase (3-7) has already been drawing directly on the answered questions, so the missing write-up is a documentation gap, not a blocker.
- **Phase 3** — payment provider, frontend framework, shop system, backend/Wawi integration, auth approach, payment methods, and SEO rendering strategy are decided in [3-Architecture_Tech_Stack/decisions.md](3-Architecture_Tech_Stack/decisions.md); local dev environment is specced in [3-Architecture_Tech_Stack/local-dev-setup.md](3-Architecture_Tech_Stack/local-dev-setup.md) and doesn't need the hosting pick to start. Only the hosting provider is still open — it gates phase 10 (deployment) but not phases 4-9, which can proceed against local Docker regardless of which cloud is picked.
- **Phase 4** — six interactive, mobile-first HTML wireframes covering the full customer journey live in [wireframes/](../wireframes/): homepage, Gravelbikes category/listing, a product detail page, the cart + 4-step checkout, a reusable Click & Collect store-selector component, and the customer account area. All share one design system (dark header, Oswald/Inter/JetBrains Mono, category icons) refined against Gemini-generated moodboards and a real campaign photo now used on the homepage hero. The brand accent color is still an open call — a "Premium Multi-Brand Hub" blue direction from the moodboards was prototyped and then reverted back to the original red pending an actual decision — everything else in this phase is settled enough for phase 5+ to build against.
- **Phase 5** — full entity-relationship schema in [5-Database_Schema/schema-design.md](5-Database_Schema/schema-design.md), covering every entity the storefront, checkout, account area, and Tridata/TriCon sync need. Each entity is tagged native/extended/custom against Shopware's built-in data model, so nothing already provided by Shopware gets redesigned from scratch. A DBA-style review pass corrected several ERD/constraint issues (versioned-entity FKs, a denormalized `store_stock` field, a sync table doing double duty as both ID-map and audit log, missing GDPR/retention handling), and a follow-up research pass resolved all but one of the design questions that review surfaced (Shopware version pinned to 6.7, native multi-warehouse support confirmed insufficient for this use case, order-number pattern confirmed achievable natively, VAT rate recommended at 19% pending accountant sign-off, plus several smaller decisions). That last remaining blocker — the TriCon protocol (SOAP/XML vs REST/JSON) — is now resolved too: a full 44-function reference doc was obtained and analyzed ([3-Architecture_Tech_Stack/tricon-integration-notes.md](3-Architecture_Tech_Stack/tricon-integration-notes.md), with the source archived alongside it), confirming SOAP/XML and reshaping `bikeone_store_stock`'s fields to match TriCon's real stock data (`Lagerbestand`/`Reserviert`/`Bestellt`/`MengeVerfuegbar` rather than the earlier invented status enum). Two narrower questions remain, but they're vendor-configuration facts for TriData support to answer, not design work: whether BikeOne's TriBike instance uses one TriCon interface for all branches or one per branch, and whether its color/size variant module is active. Neither blocks Phase 6 from starting.

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
