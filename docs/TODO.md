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

The home hero is the poster photo only (decision d71): best performance, no request for a video.

- [ ] Bring the video back only if it is performance-compatible: measure LCP and transfer with `npm run perf` (also `--throttle slow4g`) before and after, and consider a 540p encode (11.4 MiB at the time), `(pointer: fine)` so tablets and phones never load it, Save-Data and slow-connection checks, and a start only after the load event with `preload="none"`; engineer, blocked by the owner's wish and by those measurements.
- The encoded file is kept, untracked, in `website/.local/hero.mp4` (H.264 `avc1`, 1280x720, 13.4 s, no audio, faststart, 17.67 MiB; `.local/` is git-ignored, so it exists only on this machine: copy it somewhere safe). The HEVC original is `website/.conversion/video-download/VidOne.mp4` (27.8 MB, also untracked and git-ignored).
- To restore the component and its checks: `HeroVideo.astro` and `public/hero.mp4` came in with `7858e4c` and the data-conscious play policy with `5103883`; the poster-only change is `9ad7292` (`git show 9ad7292` shows exactly what to put back, including the `net`, `ui` and `size` assertions that now say "no video"). Check the size and net rules and the CSP `media-src 'self'` (still in `public/_headers`) when it returns.

## Product and information architecture

- [ ] Brand landing pages (Trek, Specialized, Cervélo, Pinarello, Ridley, Wilier, Factor) or keep redirecting every `/Marke/<brand>/` to the shop home: local landing pages need new copy from the owner; owner decides, then engineer.
- [ ] Shop deep-link URL scheme: all old shop URLs (`/product/...`, `/shop/`, `/ebikes/` and so on) redirect to the shop home because the shop's URLs for brands, categories and products are not known; engineer, blocked until the shop has stable handles (then refine `tools/redirect-map.mjs`).
- [ ] Google Business Profile per store, so the local pack works and `geo` and `sameAs` can enter the BikeStore data; owner, blocked by the profiles.

## Hosting and launch

- [ ] `Strict-Transport-Security` is a Cloudflare zone setting (Edge Certificates), not a `_headers` rule, and `includeSubDomains` also covers `shop.bike-one.org`; owner decides jointly for site and shop.
- [ ] The `public/_headers` rules (CSP, nosniff, Referrer-Policy, Permissions-Policy, noindex on `bike-one.dev` and `*.pages.dev`) are checked locally only; engineer verifies the live response headers after the first Cloudflare Pages deployment.
- [ ] Create the 20 Cloudflare Single Redirects of the `?p=` shortlinks from `cloudflare-query-redirects.csv` (a `_redirects` file cannot match a query string); owner or engineer with dashboard access, blocked by the zone.
- [ ] Search Console export (queries, pages, indexed URLs) to check that no old URL with traffic is missing from `docs/old-urls.json`; owner, blocked by Search Console access.
- [ ] Custom domain `bike-one.dev` on the Cloudflare Pages project for development, `bike-one.org` at launch (see `docs/LAUNCH.md`); owner, blocked by the Pages project.
- [ ] `gh auth login` and `npx wrangler login` on the machine that deploys; owner.

## Testing gaps

- [ ] Real Safari and iOS autoplay: not needed now that the hero has no video; only if the video returns.
- [ ] Firefox: Playwright's Firefox does not start on this machine (`Could not find profile folder`); run the site once in real Firefox on macOS or Windows; engineer.
- [ ] Android Chrome (Save-Data, cellular behaviour, touch targets on a real device); engineer or owner with a phone.
- [ ] The menu button's `aria-expanded` in Safari (native for popover invokers in Chrome, unverified in Safari); a three-line script would set it everywhere if wanted; engineer.
- [ ] How the Google Maps embed URL (`https://www.google.com/maps?q=...&output=embed`, no API key) behaves with redirects and the CSP `frame-src` in real browsers: tested only with every foreign request aborted; engineer, after the first real click on the deployed site.

## Repository

- [ ] Squash the 26.5 MiB HEVC `public/VidOne.mp4` out of history before any push (it came in with `6e06eac` and left with `b1cb7ab`; it is over the 25 MiB Cloudflare Pages file limit); the 17.7 MiB `hero.mp4` (`7858e4c` to `9ad7292`) should go with it unless the owner wants it in history. Engineer, with the owner's go-ahead for a history rewrite (nothing is pushed yet).
- [ ] Merge `website/` into the bike-one-shop repository with its history (`.working-files/astro-native-redesign/` in the parent repository holds the plan and the stage notes); engineer, after the squash above.
