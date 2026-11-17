# E-mail setup (order confirmation)

How to switch on real e-mail on a server. Code side is done and gated on three env vars (`backend/apps/backend/medusa-config.ts`); without them nothing is sent. Background: `REVIEW_TASKS.md` (server checklist), `PLAN.md` Task 16.

## Which provider?

| | Resend | SendGrid |
| --- | --- | --- |
| Works with the repo today | No: Medusa has no official Resend provider, a small custom module is needed (~40 lines, plus the `resend` package) | **Yes**, built into Medusa (`@medusajs/medusa/notification-sendgrid`), env vars only |
| Cost | Free: 3,000 mails/month, 100/day, 3 domains. Pro $20/month for 50,000 | No permanent free plan since 2025: 60-day trial (100 mails/day), then Essentials about $20/month. Check sendgrid.com/pricing |
| EU / GDPR | DPA with EU Standard Contractual Clauses accepted at sign-up, EU-US Data Privacy Framework. You can **send** from Ireland (eu-west-1), but account data is stored in the US | Twilio DPA with SCCs. EU data residency for SendGrid: not verified, check with Twilio |
| Setup effort | Account + domain DNS + provider module | Account + domain DNS |

**Recommendation:** Resend for this shop. Volume is far below 100 orders a day, so the free plan covers the test server and likely production; the developer experience is better. The cost is the small provider module (not written yet). If you want mail working this afternoon with no code, use SendGrid, and switch later: only three env vars and the provider module change.

Either way the provider is a **processor** under GDPR Art. 28: accept its DPA, list it in the privacy policy (`datenschutz`), and keep the transfer to the US (SCCs / DPF) in there. This is not legal advice; the owner/lawyer signs off.

## 1. Pick the sending address

Use a dedicated sub-domain so mail problems never touch the main domain's reputation, for example `mail.bike-one.dev` for the dev server and the real shop domain's `mail.` sub-domain in production. From address: `BikeOne <shop@mail.bike-one.dev>`. Use a mailbox people can reply to, or set a Reply-To; customers will answer order mails.

## 2. Create the account and verify the domain

**Resend:** sign up at resend.com, **Domains → Add Domain**, enter the sub-domain, choose region **Ireland (eu-west-1)**, add the DNS records it shows (SPF, DKIM, and the return-path MX).

**SendGrid:** sign up, **Settings → Sender Authentication → Authenticate Your Domain**, enter the sub-domain, add the CNAME records it shows.

DNS records go into Cloudflare. Set each record to **DNS only** (grey cloud), not proxied, or verification fails. Wait until the provider shows the domain as verified (minutes to hours).

Also add a DMARC record for the sending domain, at least `v=DMARC1; p=none; rua=mailto:<your address>`, and tighten it later.

## 3. Create an API key

Resend: **API Keys → Create**, permission **Sending access**, restricted to the domain. SendGrid: **Settings → API Keys → Create**, **Restricted Access**, only **Mail Send**. Copy it now; it is shown once. The key is a secret: only in the server's `.env`, never in git, chat or docs.

## 4a. SendGrid: wire it

On the server, in `backend/apps/backend/.env`:

```
NOTIFICATION_PROVIDER_RESOLVE=@medusajs/medusa/notification-sendgrid
NOTIFICATION_API_KEY=<key>
NOTIFICATION_FROM=BikeOne <shop@mail.bike-one.dev>
```

Delete `NOTIFICATION_ALLOW_NONE=true` if it is there. No package to install: the provider ships with `@medusajs/medusa`.

## 4b. Resend: wire it

Not in the repo yet. It needs a module `src/modules/resend` (service extending `AbstractNotificationProviderService`, `identifier = "resend"`, `send()` calls `resend.emails.send({ from, to, subject, html })` and throws on an error) and the `resend` package in `apps/backend`. The order-confirmation workflow already builds the HTML, so no React templates are needed. Medusa's guide for reference: https://docs.medusajs.com/resources/integrations/guides/resend. A new dependency goes through the `legal-security-reviewer` first. Then:

```
NOTIFICATION_PROVIDER_RESOLVE=./src/modules/resend
NOTIFICATION_API_KEY=<key>
NOTIFICATION_FROM=BikeOne <shop@mail.bike-one.dev>
```

## 5. Deploy and test

1. Edit the server's `.env` (above), then `make deploy-dev --force` is not needed for env-only changes: `ssh bee5 'sudo systemctl restart bikeone-backend'`.
2. Check the log has no `No e-mail provider configured`: `ssh bee5 'sudo journalctl -u bikeone-backend -n 30'`.
3. Place a test order on `https://shop.bike-one.dev` with an address you own. Never use real customer data on the dev server.
4. The mail arrives; check it is not in spam (DKIM/SPF pass: "Show original" in Gmail).
5. The order stores the result in `metadata.confirmation_email = { status: "sent" | "failed", at }`. On `failed`, fix the cause and resend:
   `POST /admin/orders/<order_id>/resend-confirmation` with an admin token and body `{}`.
6. Watch the log prefix `[notification] order confirmation`. Under the AGB the contract is formed when the confirmation is sent, so a failed confirmation means no contract yet.

## Later: other mail

Newsletter, shipping and pickup-ready mails are not built. Marketing mail needs its own consent and double opt-in (UWG, GDPR) and should not go through this transactional sender.
