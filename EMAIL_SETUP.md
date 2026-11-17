# E-mail setup (order confirmation)

How to switch on real e-mail on a server. Code side is done and gated on three env vars (`backend/apps/backend/medusa-config.ts`); without them nothing is sent. Background: `REVIEW_TASKS.md` (server checklist), `PLAN.md` Task 16.

## Which provider?

| | Resend | SendGrid |
| --- | --- | --- |
| Works with the repo today | No: Medusa has no official Resend provider, a small custom module is needed (~40 lines, plus the `resend` package) | **Yes**, built into Medusa (`@medusajs/medusa/notification-sendgrid`), env vars only |
| Cost | Free: 3,000 mails/month, 100/day, 3 domains. Pro $20/month for 50,000 | No permanent free plan since 2025: 60-day trial (100 mails/day), then Essentials about $20/month. Check sendgrid.com/pricing |
| EU / GDPR | DPA with EU Standard Contractual Clauses accepted at sign-up, EU-US Data Privacy Framework. You can **send** from Ireland (eu-west-1), but account data is stored in the US | Twilio DPA with SCCs. EU data residency for SendGrid: not verified, check with Twilio |
| Setup effort | Account + domain DNS + provider module | Account + domain DNS |

**EU-based alternatives** (both US options above store data in the US). Figures from the providers' own pages in 2026-11, confirm before signing up:

| | Scaleway Transactional Email (France) | Brevo (France) |
| --- | --- | --- |
| Hosting | Scaleway's own infrastructure only | France and Germany |
| Cost | 300 mails included, then €0.25 per 1,000, no monthly fee. Default quota 10,000/month, raisable | Free: 300 mails/day. Paid plans above that |
| Integration | SMTP relay (`smtp.tem.scaleway.com`) and API | SMTP relay and REST API |
| Fit | Pure transactional sender, no marketing upsell; billed per use | Also does newsletters later (own consent/double opt-in needed). Check whether the free plan adds a Brevo footer to transactional mail |

Mailjet (France-based, EU servers) is another option; I did not look into it. Amazon SES in Frankfurt and Mailgun's EU region keep data in the EU but the companies are US-based, so they do not fix the US-parent question.

**Cloudflare Email Service (public beta since 2026-04, SMTP submission beta since 2026-06-08).** Transactional only. SMTP: `smtp.mx.cloudflare.net`, port 465 (implicit TLS), user `api_token`, password a Cloudflare API token with "Email Sending: Edit". Needs the **Workers Paid** plan (about $5/month, not on the pages I read); includes 3,000 mails/month, then $0.35 per 1,000. For a domain already on Cloudflare DNS (as `bike-one.dev` is) onboarding is one click: it adds MX/SPF/DKIM/DMARC on a `cf-bounce` sub-domain. Before onboarding you can only send to verified addresses of your account, after it to anyone. Limits: 50 recipients per mail, new accounts get an unpublished "conservative" daily quota that grows with reputation (a form requests more). Open points: still beta with no stated SLA; Cloudflare is a US company, and the Email Service pages say nothing on data location, DPA or log retention (Cloudflare's general DPA may cover it, ask/verify); deliverability of a new sender is unproven. It fits the generic SMTP module below, so trying it costs no extra code. **Good for the dev server now, not my pick for the production go-live while it is beta.** Sources: [docs](https://developers.cloudflare.com/email-service/), [pricing](https://developers.cloudflare.com/email-service/platform/pricing/), [limits](https://developers.cloudflare.com/email-service/platform/limits/), [SMTP changelog](https://developers.cloudflare.com/changelog/post/2026-06-08-smtp-submission/).

**None of these has a Medusa provider**, so any of them needs a custom provider module. The cheapest way: **one generic SMTP provider** (`nodemailer`, about 40 lines, host/port/user/password/from from env). Then Cloudflare, Scaleway, Brevo, Mailjet, or the shop's own mailbox SMTP are an env change, with no new code per provider. Resend or SendGrid APIs are then optional.

**Recommendation:** an EU provider through one SMTP module. For this shop: **Scaleway TEM** if you want pure transactional sending with EU-only processing and pay-per-use pennies, **Brevo** if you want a free tier and may add newsletters later. Both are fine for the test server. The cost is the SMTP module (not written yet). If you want mail working today with no code at all, use SendGrid (built in), and switch later: only three env vars and the provider module change.

Either way the provider is a **processor** under GDPR Art. 28: accept its DPA, list it in the privacy policy (`datenschutz`), and keep the transfer to the US (SCCs / DPF) in there. This is not legal advice; the owner/lawyer signs off.

## 1. Pick the sending address

Use a dedicated sub-domain so mail problems never touch the main domain's reputation, for example `mail.bike-one.dev` for the dev server and the real shop domain's `mail.` sub-domain in production. From address: `BikeOne <shop@mail.bike-one.dev>`. Use a mailbox people can reply to, or set a Reply-To; customers will answer order mails.

## 2. Create the account and verify the domain

**Scaleway TEM:** Scaleway console, **Transactional Email → Create domain**, enter the sub-domain, add the SPF/DKIM/DMARC records it shows, then create SMTP credentials (API key) for the project.

**Brevo:** account, **Senders, Domains & dedicated IPs → Domains → Add a domain**, add the records (Brevo code, DKIM, DMARC), then **SMTP & API → SMTP** for host, login and an SMTP key.

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

## 4b. SMTP (Scaleway, Brevo, Mailjet, own mailbox): wire it

Not in the repo yet. It needs a module `src/modules/smtp` (service extending `AbstractNotificationProviderService`, `identifier = "smtp"`, `send()` calls `nodemailer` `sendMail({ from, to, subject, html })` and throws on an error) and the `nodemailer` package in `apps/backend`. The order-confirmation workflow already builds the HTML, so no templates are needed. The provider's options need SMTP host, port, user and password in addition to `from`, which `medusa-config.ts` does not pass yet (it only passes `api_key` and `from`), so that file changes too. A new dependency goes through the `legal-security-reviewer` first. Then, for example:

```
NOTIFICATION_PROVIDER_RESOLVE=./src/modules/smtp
NOTIFICATION_API_KEY=<smtp password or key>
NOTIFICATION_FROM=BikeOne <shop@mail.bike-one.dev>
NOTIFICATION_SMTP_HOST=smtp.tem.scaleway.com
NOTIFICATION_SMTP_USER=<smtp user>
```

## 4c. Resend: wire it

Same idea with a `src/modules/resend` module and the `resend` package (`resend.emails.send({ from, to, subject, html })`). Medusa's guide for reference: https://docs.medusajs.com/resources/integrations/guides/resend. Env: `NOTIFICATION_PROVIDER_RESOLVE=./src/modules/resend`, `NOTIFICATION_API_KEY`, `NOTIFICATION_FROM`.

## 5. Deploy and test

1. Edit the server's `.env` (above), then restart the backend. An env-only change needs no deploy: `ssh bee5 'sudo systemctl restart bikeone-backend'`.
2. Check the log has no `No e-mail provider configured`: `ssh bee5 'sudo journalctl -u bikeone-backend -n 30'`.
3. Place a test order on `https://shop.bike-one.dev` with an address you own. Never use real customer data on the dev server.
4. The mail arrives; check it is not in spam (DKIM/SPF pass: "Show original" in Gmail).
5. The order stores the result in `metadata.confirmation_email = { status: "sent" | "failed", at }`. On `failed`, fix the cause and resend:
   `POST /admin/orders/<order_id>/resend-confirmation` with an admin token and body `{}`.
6. Watch the log prefix `[notification] order confirmation`. Under the AGB the contract is formed when the confirmation is sent, so a failed confirmation means no contract yet.

## Later: other mail

Newsletter, shipping and pickup-ready mails are not built. Marketing mail needs its own consent and double opt-in (UWG, GDPR) and should not go through this transactional sender.
