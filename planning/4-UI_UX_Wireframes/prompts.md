# Step 4 prompts: UI/UX wireframes & visual concepts

Per [ROADMAP.md](../ROADMAP.md): Claude (Artifacts) for interactive wireframes, Gemini for image/visual concepts. Each prompt below is self-contained (paste as-is into a fresh session) and carries the project context it needs, so it doesn't depend on chat history.

## Shared context (baked into every prompt)

- Digital extension of bike-one.org — 2 existing physical stores (Oldenburg/Osnabrück area).
- Positioning v1: **Omnichannel Premium Hub** — regional launch (~150km around Oldenburg/Osnabrück), in-store fitting/builds or shipping prebuilt frames. Leasing and bike configurator are later phases, not v1 UI.
- Catalog: bikes/frames + accessories + components, price range budget-to-premium (multi-brand reseller).
- v1 must-haves: Click & Collect, in-store returns, checkout with card + PayPal (via SumUp).
- Frontend: Angular + Tailwind, SSR for SEO — product/category pages must read as content-rich and crawlable, not app-shell-sparse.
- Primary language German (English secondary) — mock copy in German.
- SEO is high priority — PDP needs visible structured info (price, availability, GTIN-equivalent specs) since it feeds Google Shopping.

Full detail: [2-Product_Requirements/questions.md](../2-Product_Requirements/questions.md), [3-Architecture_Tech_Stack/decisions.md](../3-Architecture_Tech_Stack/decisions.md).

---

## A. Claude (Artifacts) — interactive wireframes

One prompt per screen. Run separately so each artifact stays focused; link them mentally as one flow.

### A1. Homepage

```
Build an interactive HTML wireframe (Artifact) for the homepage of a premium multi-brand road/gravel bike shop, German-language, mobile-first responsive.

Context: Digital extension of bike-one.org (2 physical stores, Oldenburg/Osnabrück area). Positioning: Omnichannel Premium Hub — regional focus, in-store fitting available. Catalog: bikes/frames, accessories, components, mixed budget-to-premium pricing.

Must include:
- Header: logo placeholder, search bar, cart icon, store/Click & Collect location indicator, DE/EN language switch
- Hero section: seasonal/lifestyle banner placeholder with a clear CTA (e.g. "Bikes entdecken")
- Category navigation: Rennrad, Gravel, Zubehör, Komponenten, Bekleidung
- Featured products grid (use placeholder product cards: image, name, price, "ab Lager verfügbar" stock badge)
- Trust/differentiator strip: in-store fitting, Click & Collect, returns in-store
- Footer: Impressum/AGB/Datenschutz links (placeholder), store locations, newsletter signup

Use realistic German placeholder copy, not lorem ipsum. Keep it a wireframe — structure and hierarchy over final visual polish (greyscale/low-fidelity is fine, but interactive: nav opens, search bar focuses, cart icon shows a count).
```

### A2. Category / product listing page (PLP)

```
Build an interactive HTML wireframe (Artifact) for a category/product listing page ("Gravelbikes"), German-language, mobile-first responsive, for a premium multi-brand bike shop.

Must include:
- Breadcrumb (Start > Fahrräder > Gravelbikes)
- Filter sidebar (collapsible on mobile): Marke, Preis (range), Rahmengröße, Verfügbarkeit (auf Lager / bestellbar), Einsatzbereich
- Sort dropdown (Beliebtheit, Preis aufsteigend/absteigend, Neuheiten)
- Product grid: image, brand, name, price, stock/availability badge, "In-Store verfügbar zur Anprobe" indicator where relevant
- Pagination or infinite-scroll placeholder
- Result count and applied-filter chips (removable)

Make filters and sort interactive (clicking updates a visible state, even if backed by static placeholder data). Realistic German copy for ~8-10 sample products across a few brands and price points.
```

### A3. Product detail page (PDP)

```
Build an interactive HTML wireframe (Artifact) for a product detail page for a bike (e.g. a gravel bike), German-language, mobile-first responsive.

This page matters most for SEO/Google Shopping eligibility, so structure it like real indexable content, not a sparse app shell:
- Product title, brand, price (with any strike-through/sale price), clear "verfügbar" / "auf Bestellung" stock status
- Image gallery placeholder (multiple angles, thumbnail strip)
- Frame size selector (with a "Größe im Store anprobieren" link — ties to in-store fitting)
- Add to cart + "Click & Collect in [Store]" as an alternate CTA next to standard delivery
- Full spec table (frame material, groupset, wheel size, weight, etc. — placeholder values)
- Long-form description block (German copy, a few paragraphs — this is the SEO content area)
- Cross-sell: "Passendes Zubehör" row (helmets, accessories)
- Delivery/returns info block: shipping estimate, in-store return note

Interactive: size selector changes state, gallery thumbnails swap the main image, add-to-cart shows a confirmation/mini-cart update.
```

### A4. Cart & checkout

```
Build an interactive HTML wireframe (Artifact) covering cart + checkout flow (can be one artifact with tabbed/stepped states, or two views toggled by a button), German-language, mobile-first responsive.

Cart view:
- Line items (image, name, size/variant, qty stepper, price, remove)
- Order summary (subtotal, shipping estimate, total)
- Delivery method choice: standard shipping vs. Click & Collect (pick a store from a short list — Oldenburg, Osnabrück)
- Promo code field
- Proceed to checkout CTA

Checkout view (steps: Adresse → Versand/Abholung → Zahlung → Bestätigung):
- Guest vs. account login choice (new accounts only — no existing bike-one.org login to integrate)
- Address form (or "Filiale wählen" if Click & Collect was chosen in cart)
- Payment method selection: Kreditkarte, PayPal (both via SumUp — show as two distinct radio options, no separate "SumUp" branding needed since it's the processor, not a customer-facing method)
- Order summary sidebar persists across steps
- Final confirmation screen: order number, next steps, return policy note (returns accepted in-store)

Make the step navigation interactive (clicking a step or "Weiter" advances the state).
```

### A5. Store / Click & Collect picker

```
Build an interactive HTML wireframe (Artifact) for a Click & Collect store-selection component, German-language, mobile-first responsive — usable both as a standalone page and embeddable in cart/checkout.

Must include:
- List of 2 stores (Oldenburg, Osnabrück) with address, opening hours, live-ish stock note ("3x auf Lager in dieser Filiale")
- Map placeholder (static graphic is fine, doesn't need a real map)
- Selection state (radio/card select) that a parent checkout flow would read
- Note that fitting/assembly can be booked in-store — a small "Termin für Bike-Fitting vereinbaren" link/CTA is enough, doesn't need to be a full booking flow (booking flow is a post-v1 feature)
```

### A6. Account area / order history

```
Build an interactive HTML wireframe (Artifact) for a customer account area, German-language, mobile-first responsive.

Sections (as a sidebar or tab nav):
- Bestellungen (order history list: order #, date, status, total, "Rücksendung im Store starten" link per order)
- Meine Daten (name, email, address book)
- Zahlungsmethoden (saved payment method placeholder, tied to SumUp tokenization — just show as a masked card entry, no real payment logic)
- Logout

Keep it simple — this is a new-accounts-from-scratch system (no bike-one.org legacy account data to migrate), so no "import old account" flows needed.
```

---

## B. Gemini — visual concept prompts

Use Gemini for moodboard/image generation since it's stronger there; bring the direction that resonates back into the Claude wireframes' visual polish pass later.

### B1. Brand mood board

```
Generate a set of moodboard-style visual concepts for a premium multi-brand road & gravel bike shop's online storefront. The brand is a digital extension of an established physical bike retailer (bike-one.org) in the Oldenburg/Osnabrück region of Germany, positioned as an "Omnichannel Premium Hub" — approachable but high-end, for enthusiast and semi-competitive cyclists.

Generate 3 distinct directions:
1. Clean/technical — minimal, engineering-forward, cool tones (steel/graphite/accent color), emphasizes precision and componentry
2. Warm/regional — earthy tones evoking North German gravel/coastal landscapes, more lifestyle-photography-led
3. Bold/performance — high contrast, dynamic action photography, sport-brand energy

For each: describe the color palette, typography feel, and photography style, and generate one representative hero-banner-style image concept.
```

### B2. Homepage hero imagery

```
Generate hero banner image concepts for a road/gravel bike shop homepage, set in a North German regional context (Oldenburg/Osnabrück area — flat coastal roads, gravel paths, moderate countryside, not alpine). Show a mix of:
- A road cyclist on rural German backroads, morning light
- A gravel cyclist on a forest/coastal gravel path
- An in-store scene: staff fitting a customer to a bike (supports the "in-store fitting" differentiator)

Style: premium but not aspirational-elite — approachable for serious hobbyists, not just pros. Landscape orientation suitable for a full-width web hero banner, leaving negative space on one side for headline text overlay.
```

### B3. Category iconography

```
Generate a consistent icon set (simple line-art or duotone style, one unified visual language) for bike shop e-commerce category navigation: Rennrad (road bike), Gravelbike, Zubehör (accessories), Komponenten (components), Bekleidung (apparel), Werkstatt/Service (workshop/service). Icons should be simple enough to work at small sizes (~24-32px) in a website nav bar, on a transparent background.
```

---

## After this phase

Once wireframes are reviewed and a visual direction is picked, feed both back into Claude to produce the actual Angular component structure (Step 6/7), and revisit [3-Architecture_Tech_Stack/decisions.md](../3-Architecture_Tech_Stack/decisions.md) if the UI surfaces new architecture needs (e.g. a specific search/filter library, image CDN choice).
