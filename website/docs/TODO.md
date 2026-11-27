# Open items

The owner's list of what is still open before and after launch. One line per item: who acts (owner, lawyer or engineer) and what blocks it.
Decisions that are taken live in `docs/plan.md`; why the site looks as it does is in `docs/redesign.md`.

## Legal

Nothing in the legal texts is edited by an engineer without the lawyer's text; the pages render `src/content/legal/*.md` as they are.

- [ ] Datenschutz names Google Maps, eTermin and the JobRad calculator as embeds, each with provider, data (the visitor's IP address and browser data go to the provider once the visitor clicks "laden") and legal basis; owner and lawyer, blocked by the legal review.
- [ ] Datenschutz drops the shop-only items about payment and shipping that this site does not have (they belong to the shop's own policy); owner and lawyer.
- [ ] Datenschutz typos "ZugriƯ" and "IPAdresse" (and the URL cut by a line break) are fixed in `src/content/legal/datenschutz.md`; engineer, as soon as the lawyer's final text exists.
- [ ] Impressum cites the TMG and must cite the DDG (Digitale-Dienste-Gesetz, in force since May 2024), and must name both stores and the legal entity details (today it names only the Oldenburg address); owner and lawyer.
- [ ] Run the project's `legal-security-reviewer` agent (`.claude/agents/legal-security-reviewer.md` in the bike-one-shop repository) on the CSP, the click-to-load text, the fonts and the legal pages, then a lawyer; engineer starts it, the lawyer's sign-off blocks launch.
- [ ] Cookie and consent handling stays click-to-load (no cookies, no analytics, no third-party request before a click); revisit only if analytics or another embed is ever added; owner decision, nothing blocks it.

## Content and claims to confirm

All are verbatim from the old site; the owner decides what stays. Engineer changes the text once the answer is in.

- [ ] "bis zu 40 %" (home, service) and "bis zu 30 %" (blog post): savings claims in copy and snippets; owner, blocked by proof of the figures.
- [ ] Canyon Collect & Ride and "authorised service partner": still true, and at which store; owner.
- [ ] Austria and Vienna in two blog posts ("Allein in Österreich ...", "in Städten wie Wien", "Österreich wurde 2024 fast jedes zweite ...") on a site for Oldenburg and Osnabrück: keep, rewrite or cut; owner.
- [ ] Author of the blog posts: today the Article data names the organisation; owner names a person or confirms the organisation.
- [ ] Rights for the `DAY2_*` studio photos used in two posts (and the descriptions of them); owner, blocked by the photographer's licence.
- [ ] Partner logos for Dienstradleasing (JobRad, BusinessBike, Mein-Dienstrad.de, ...): exact names and alt texts before they return to the site; owner.
- [ ] Jobs page: are the openings current, the currency of the list, and how people apply (no contact is stated); owner.
- [ ] Keywords "E-Bike", "Rennrad", "Gravelbike", "Trek Händler Oldenburg" in titles and descriptions only if the shops really sell and are dealers of them; owner, then engineer.
- [ ] Per-store services (which store does fitting, workshop, leasing, Canyon service), so pages and structured data can name a city per service; owner.

## Hero video

The home hero plays an 8 s showroom loop behind the headline; its first frame is the poster (decision d83, how it is made: `docs/hero-video.md`).

- [ ] The visible SCOTT lettering on the bike in the trainer shot (Scott is not one of the seven brands on the site) is accepted for now; owner decides whether a different shot or a re-cut should replace it (brand consistency); engineer re-cuts with `docs/hero-video.md`.
- [ ] Cloudflare's terms for serving video from Pages (about 1.2 MiB for the two files, 0.5 MiB per visit): owner confirms it is permitted on the plan in use.
- [x] Image rights and consent of the people in the film: the owner confirmed they are cleared (2026-11-27).
- [ ] Real Safari (macOS, iOS, Low Power Mode) and Android Chrome: does the film start, does the poster stay when autoplay is refused, does the H.264 fallback look right; owner or engineer with the devices. In Chrome on macOS the H.264 fallback (hardware decode) shows the first frame about 7.7 of 255 brighter than the poster (AV1 2.8); only browsers without AV1 use it.
- The original film is `website/.conversion/video-download/VidOne.mp4` (HEVC, 27.8 MB, untracked and git-ignored, only on this machine: keep a copy). `website/.local/hero.mp4` (the old 17.67 MiB encode) is no longer needed.
- Rollback: `git revert` of the hero commit (hash in `.working-files/website-performance/notes-implementation.md`) restores the photo-only hero and the "no video" assertions.

## Product and information architecture

- [ ] Brand landing pages (Trek, Specialized, Cervélo, Pinarello, Ridley, Wilier, Factor) or keep redirecting every `/Marke/<brand>/` to the shop home: local landing pages need new copy from the owner; owner decides, then engineer.
- [ ] Shop deep-link URL scheme: all old shop URLs (`/product/...`, `/shop/`, `/ebikes/` and so on) redirect to the shop home because the shop's URLs for brands, categories and products are not known; engineer, blocked until the shop has stable handles (then refine `tools/redirect-map.mjs`).
- [ ] Google Business Profile per store, so the local pack works and `geo` and `sameAs` can enter the BikeStore data; owner, blocked by the profiles.

## Hosting and launch

- [ ] `Strict-Transport-Security` is a Cloudflare zone setting (Edge Certificates), not a `_headers` rule, and `includeSubDomains` also covers `shop.bike-one.org`; owner decides jointly for site and shop.
- [ ] The `public/_headers` rules (CSP, nosniff, Referrer-Policy, Permissions-Policy, `Speculation-Rules`, the `Content-Type: application/speculationrules+json` rule for `/speculation-rules.json`, the one-day cache of the icons and the film files, noindex on `bike-one.dev` and `*.pages.dev`) are checked locally only; engineer verifies the live response headers after the first Cloudflare Pages deployment (and that Pages lets a `_headers` rule set the `Content-Type` of that file).
- [ ] Only checkable after the first Cloudflare Pages deployment (`curl -sI`, then a run of `npm run perf` against the preview URL): brotli on HTML and CSS, HTTP/2 and HTTP/3, Early Hints (whether the `<link rel=preload>` tags are used), `Accept-Ranges` and edge caching of `/hero.webm` and `/hero.mp4` (the local review server answers ranges, Pages is unverified), the 25 MiB file limit (the largest file is 0.69 MiB, `dist/` about 14 MB), and that serving the film is within Cloudflare's terms (see Hero video); engineer, owner for the terms.
- [ ] Create the 20 Cloudflare Single Redirects of the `?p=` shortlinks from `cloudflare-query-redirects.csv` (a `_redirects` file cannot match a query string); owner or engineer with dashboard access, blocked by the zone.
- [ ] Search Console export (queries, pages, indexed URLs) to check that no old URL with traffic is missing from `docs/old-urls.json`; owner, blocked by Search Console access.
- [ ] Custom domain `bike-one.dev` on the Cloudflare Pages project for development, `bike-one.org` at launch (see `docs/LAUNCH.md`); owner, blocked by the Pages project.
- [ ] `gh auth login` and `npx wrangler login` on the machine that deploys; owner.

## Testing gaps

- [ ] Real Safari and iOS autoplay of the hero film: see Hero video.
- [ ] Firefox: Playwright's Firefox does not start on this machine (`Could not find profile folder`); run the site once in real Firefox on macOS or Windows; engineer.
- [ ] Android Chrome (Save-Data, cellular behaviour, touch targets on a real device); engineer or owner with a phone.
- [ ] The menu button's `aria-expanded` in Safari (native for popover invokers in Chrome, unverified in Safari); a three-line script would set it everywhere if wanted; engineer.
- [ ] How the Google Maps embed URL (`https://www.google.com/maps?q=...&output=embed`, no API key) behaves with redirects and the CSP `frame-src` in real browsers: tested only with every foreign request aborted; engineer, after the first real click on the deployed site.

## Repository

- [x] The 26.5 MiB HEVC `public/VidOne.mp4` and the 17.7 MiB `public/hero.mp4` were removed from the whole history (2026-11-26, `git filter-repo`; the commit hashes changed). The only copies are `.local/hero.mp4` and `.conversion/video-download/VidOne.mp4`. A backup of the history as it was is the bundle `bike-one-shop-website-before-filter.bundle` next to the repository (outside it).
- [x] `website/` merged into the bike-one-shop repository with its history (see the merge commit on the import branch).

## Reviewer notes (legal-security-reviewer, 2026-11-27; verdict: merge pass, dev deploy pass with conditions, launch blocked by the legal items above)

- [ ] Embed iframe: add `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` and `referrerpolicy="strict-origin-when-cross-origin"` in `src/components/Embed.astro`, then test eTermin and the JobRad calculator (needs the live hosts, so after the first deploy); engineer.
- [ ] Review server: reject a non-localhost `Host` header and compare `realpathSync` with `dist/` (local tool, optional); engineer.
- [ ] Run `npm audit` in `website/`; engineer.
- [ ] Check that the commit author address in the history is the intended one before the repository becomes public; owner.
- [ ] Datenschutz: also name Cloudflare Pages (server logs, IP, third-country transfer, processing agreement) and the data typed into the eTermin form; Impressum: second quick contact (phone), VAT ID instead of the tax number, drop the discontinued ODR text (all with the lawyer); owner.
- [ ] Claims: also "bis zu 70 %" (helmet post); PAngV/financing notes for leasing; written consent of the people in the film kept on file (§ 26 BDSG); owner.
- [ ] Confirm the German accessibility statement (BFSG) is not required; owner.
