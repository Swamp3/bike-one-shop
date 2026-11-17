# Brevo setup (your part)

What you do in Brevo and Cloudflare so the shop can send order confirmations. Why Brevo and the code plan: `EMAIL_SETUP.md` and `.working-files/brevo-email/plan.md`. The provider module that talks to Brevo is **not written yet**; everything below can be done now, and the last section says what to do once it exists.

Brevo's menus change between versions. Where I name a menu path below it is from memory or from their docs, so search the dashboard for the word in **bold** if a path is not there.

## Checklist

- [ ] 1. Cloudflare: `info@bike-one.dev` forwards to `info@bike-one.de`
- [ ] 2. Brevo account created and activated
- [ ] 3. Brevo DPA accepted
- [ ] 4. Sending domain `mail.bike-one.dev` authenticated (DNS records in Cloudflare)
- [ ] 5. Sender `bestellung@mail.bike-one.dev` exists
- [ ] 6. API key created (v3 API key, not an SMTP key)
- [ ] 7. IP blocking checked
- [ ] 8. Key and settings put into bee5's `.env` (after the module exists)

Never paste the API key into chat, git, an issue or a doc. It goes only into the server's `.env`.

## 1. Cloudflare: `info@bike-one.dev` forwards to `info@bike-one.de`

This is the Reply-To address customers will answer.

1. Cloudflare dashboard, select the `bike-one.dev` domain, **Email**, **Email Routing**, **Get started** / enable.
2. Let Cloudflare add the records it asks for (MX and an SPF TXT on the apex `bike-one.dev`). They do not clash with Brevo's records, which will sit on the `mail.` sub-domain.
3. **Routing rules**, **Create address**: custom address `info`, action **Send to an email**, destination `info@bike-one.de`.
4. Cloudflare sends a verification mail to `info@bike-one.de`; click the link in it. The rule is inactive until you do.
5. Test: send a mail to `info@bike-one.dev` from any account and check it arrives at `info@bike-one.de`.

## 2. Create the Brevo account

1. brevo.com, **Sign up**, choose the **Free** plan (you will move to a paid plan before go-live).
2. Use a login owned by the company or by you personally, not a shared password. Turn on two-factor authentication under the account's security settings.
3. Fill in the company details Brevo asks for (company name, address, country). Use the real data: Brevo may check it before it lets you send, and it ends up in the footer of newsletters later.
4. Brevo may **review and activate** new accounts, sometimes with follow-up questions, and this can take hours to a day or more. Do this step first and do the rest while you wait. If Brevo asks what you send, say: transactional order confirmations for a bicycle shop, newsletters later.

## 3. Accept the data processing agreement (GDPR Art. 28)

Brevo will process customer e-mail addresses and order content for you, so it is your processor.

1. In the account settings, find the **data processing agreement** (DPA) under legal / privacy / account settings, or via Brevo's legal pages, and accept or sign it. Keep a copy.
2. Note for later: the privacy policy (`/datenschutz`) has to name Brevo as a recipient and say it is hosted in the EU. The lawyer or owner signs that off; this is not legal advice.

## 4. Authenticate the sending domain `mail.bike-one.dev`

1. Brevo: **Senders, Domains & Dedicated IPs**, **Domains**, **Add a domain**. Enter `mail.bike-one.dev` (the sub-domain, not `bike-one.dev`).
2. Brevo shows the DNS records to add. Typically: a **Brevo code** TXT record, two **DKIM** records (CNAME or TXT, host names like `brevo1._domainkey.mail`) and a **DMARC** TXT record. Add exactly what Brevo shows, not what I list here.
3. In Cloudflare: **DNS**, **Records**, **Add record** for each one.
   - In the Name field enter the host **without** `.bike-one.dev` (Cloudflare adds the zone). Example: if Brevo says `brevo1._domainkey.mail.bike-one.dev`, enter `brevo1._domainkey.mail`.
   - Paste the value exactly. For TXT values, no extra quotes.
   - **Proxy status: DNS only (grey cloud).** CNAME records default to proxied (orange); change them, or Brevo cannot verify them.
4. Back in Brevo, press **Authenticate** / **Verify**. It can take minutes, sometimes a few hours. Brevo shows the domain as authenticated when done.
5. DMARC: if Brevo only suggests `p=none`, keep that for now. Reports go to the address in `rua=`; use `info@bike-one.dev`.

## 5. Sender

Brevo: **Senders, Domains & Dedicated IPs**, **Senders**, **Add a sender**: name `BikeOne`, e-mail `bestellung@mail.bike-one.dev`. With an authenticated domain Brevo may not require a confirmation mail; if it does, it goes to that address, which has no mailbox. In that case tell me and we pick an address that can receive mail. Do not create a mailbox for it; replies are handled by Reply-To.

## 6. API key

1. Brevo: profile menu, **SMTP & API**, **API Keys**, **Generate a new API key**. Name it `bike-one-dev-bee5`.
2. Copy it immediately; Brevo shows it once.
3. Use a **v3 API key**. The **SMTP** tab has separate SMTP keys; those are not what the shop uses.
4. Keep it in your password manager until step 8. Create a different key for production later, so a leak on dev does not touch production, and so each can be revoked alone.

## 7. IP blocking

Brevo can reject calls from IP addresses that are not on the account's authorised list. bee5's outbound IP changes, so a blocked call would fail with `unauthorized`.

1. Brevo: **Security**, **Authorised IPs** (menu name may differ).
2. Switch **blocking of unknown IP addresses for API keys** to **off** for the dev account, or use the automatic-authorisation mode if your account offers it. Do not enable blocking for the dev account unless you also add bee5's current public IP, and then accept that it breaks when the IP changes.
3. Production will have a fixed outbound IP: add it to the list and turn blocking **on** there.
4. If a test later fails with `unauthorized`, this is the first place to look.

## 8. Put it on bee5 (after the module exists)

Do this only after the Brevo provider module is implemented and deployed (`make deploy-dev`). The code path ignores the key otherwise.

1. `ssh bee5`, then edit `~/bike-one-shop/backend/apps/backend/.env`.
2. Delete the line `NOTIFICATION_ALLOW_NONE=true` and add (these names are what `medusa-config.ts` reads; the first and the Reply-To line are final once the plan's tasks 1 and 2 are built):

```
NOTIFICATION_PROVIDER_RESOLVE=./src/modules/brevo
NOTIFICATION_API_KEY=<the key from step 6>
NOTIFICATION_FROM="BikeOne <bestellung@mail.bike-one.dev>"
NOTIFICATION_REPLY_TO=info@bike-one.dev
```

3. `sudo systemctl restart bikeone-backend`, then `sudo journalctl -u bikeone-backend -n 30`: no `No e-mail provider configured` and no `SKIPPED`.
4. Place a test order on `https://shop.bike-one.dev` with an address you own (never a real customer's). The mail arrives, is not in spam, and "Show original" in Gmail shows DKIM, SPF and DMARC as pass for `mail.bike-one.dev`.
5. In Brevo, **Transactional**, **Logs** shows the message as delivered. Replying to the mail goes to `info@bike-one.de`.

## Before go-live

- Switch the Brevo plan from Free (300 mails/day, shared with any newsletter) to a paid one.
- Production: its own `mail.` sub-domain on the production domain, its own API key, a fixed outbound IP on the authorised list with blocking on, `NOTIFICATION_FROM="BikeOne <bestellung@mail.<production domain>>"` and `NOTIFICATION_REPLY_TO=info@<production domain>`.
- Privacy policy names Brevo (see step 3). Check whether the Brevo footer shows up on transactional mail on your plan.
- Newsletters are a separate project (own sub-domain, double opt-in, consent records). The storefront newsletter form stays off until then.
