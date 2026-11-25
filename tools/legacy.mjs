// The explicit, shrinking allowlist of Stage 1 (docs/redesign: native Astro redesign, decision d32).
// A path listed here is still served by the old WordPress route (src/pages/[...path].astro) from the captured
// markup. The checks in tools/checks/ skip these pages and the files only they use; every other page must pass them
// in full. Migrating or removing a page means deleting its line here: Stage 2 empties both lists.
// src/pages/[...path].astro builds exactly LEGACY_PAGES, so this file is the only place that decides.

export const LEGACY_PAGES = [
  '/404.html', // src/pages/404.astro, replaced in Stage 2
  '/Marke/cervelo/',
  '/Marke/factor/',
  '/Marke/pinarello/',
  '/Marke/ridley/',
  '/Marke/specialized/',
  '/Marke/trek/',
  '/Marke/wilier/',
  '/alle-fahrrader/',
  '/author/lawrencebennier-com/',
  '/author/marvin/',
  '/blog/',
  '/category/allgemein/',
  '/e-bike-oder-klassisches-rad-welche-entscheidung-fuer-deine-mobilitaet-zaehlt-und-wie-bikeone-dich-optimal-begleitet/',
  '/ebikes/',
  '/fahrrad-leasing-die-smarte-alternative-zum-autopendeln-und-warum-es-sich-jetzt-mehr-denn-je-lohnt/',
  '/gravel-bikes/',
  '/main-bike/',
  '/portfolio-category/branding-design/',
  '/portfolio-category/branding-design/page/2/',
  '/portfolio/portfolio-name-10/',
  '/portfolio/portfolio-name-11/',
  '/portfolio/portfolio-name-12/',
  '/portfolio/portfolio-name-13/',
  '/portfolio/portfolio-name-14/',
  '/portfolio/portfolio-name-15/',
  '/portfolio/portfolio-name-2/',
  '/portfolio/portfolio-name-3/',
  '/portfolio/portfolio-name-4/',
  '/portfolio/portfolio-name-5/',
  '/portfolio/portfolio-name-6/',
  '/portfolio/portfolio-name-7/',
  '/portfolio/portfolio-name-8/',
  '/portfolio/portfolio-name-9/',
  '/portfolio/portfolio-name/',
  '/racebikes/',
  '/sale/',
  '/sicherheit-auf-zwei-raedern-so-faehrst-du-entspannt-und-geschuetzt-durch-den-stadtverkehr/',
  '/so-erkennst-du-fruehzeitig-fahrrad-ermuedungserscheinungen-und-wie-bikeone-vorbeugt/',
  '/stellenangebote/',
  '/team-member/charlotte-neal/',
  '/team-member/john-bennett/',
  '/team-member/member-01/',
  '/team-member/member-02/',
  '/team-member/member-03/',
  '/team-member/victor-peters/',
  '/team-member/willie-carter/',
  '/termin-buchen-oldenburg/',
  '/termin-buchen-osnabrueck/',
  '/termin-buchen/',
  '/tt-triathlon/',
  '/wann-sich-ein-professioneller-fahrradservice-wirklich-lohnt-und-woran-du-ihn-erkennst/',
];

// Built paths (relative to dist/, prefix match) that only the old route and public/ put there. Stage 2 and 4 empty it.
export const LEGACY_FILES = [
  'wp-content/',
  'wp-includes/',
  'wp-sitemap',
  'VidOne.mp4',
  'feed/',
  'comments/',
  'author/',
  'category/',
  'Marke/',
  'portfolio-category/',
  'portfolio/',
  'team-member/',
];

export const LEGACY_SOURCES = [
  'src/content/pages/',
  'src/content/heads/',
  'src/content/bottoms/',
  'src/content/parts/',
  'src/content/index.json',
  'src/styles/inline/',
  'src/styles/site.css',
  'src/layouts/legacy/',
  'src/components/legacy/',
  'src/pages/[...path].astro',
  'src/pages/404.astro',
];

const norm = (p) => (p.endsWith('/') || p.endsWith('.html') ? p : p + '/');
export const isLegacyPage = (urlPath) => LEGACY_PAGES.includes(norm(urlPath));
export const isLegacyFile = (distRel) => LEGACY_FILES.some((f) => distRel === f || distRel.startsWith(f));
export const isLegacySource = (srcRel) => LEGACY_SOURCES.some((f) => srcRel === f || srcRel.startsWith(f));
