# Third-party services: BikeOne

The site calls nothing from a third party for its own rendering: fonts, images, styles and scripts are served from the site itself
(`default-src 'self'` in `public/_headers`, enforced by the `net` and `embeds` checks). Exactly three services can be reached, and only after
the visitor clicks "laden" on a placeholder (`src/components/Embed.astro`); before the click the page makes no request to them.

| Service | Provider | Where | URL | What happens on the click | Status |
| --- | --- | --- | --- | --- | --- |
| Appointment booking | eTermin (etermin.net) | `/termin-buchen-oldenburg/`, `/termin-buchen-osnabrueck/` | `https://www.etermin.net/bike-one`, `https://www.etermin.net/os1` | an iframe loads the booking page; the browser connects to eTermin and sends the visitor's IP address and browser data | click-to-load, CSP `frame-src` |
| Map | Google Maps (google.com/maps) | `/ueber-uns/` (one map per store card) | `https://www.google.com/maps?q=<address>&output=embed` (no API key) | an iframe loads the map; the browser connects to Google and sends the IP address and browser data | click-to-load, CSP `frame-src` |
| Leasing example calculator | JobRad (bike-leasing-calculator.jobrad.org) | `/service/` | `https://bike-leasing-calculator.jobrad.org` | an iframe loads the calculator; the browser connects to JobRad and sends the IP address and browser data | click-to-load, CSP `frame-src` |

Nothing else: no analytics, tag manager, chat, pixel, form service or font CDN. The home hero video is not loaded (decision d71): the hero is a
poster photo. Each placeholder names its provider and says that the IP address is transferred; the Datenschutz does not name these three
embeds yet (`docs/TODO.md`, Legal), the lawyer's text has to.
