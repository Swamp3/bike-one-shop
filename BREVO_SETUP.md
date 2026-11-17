# Brevo setup (your part)

What you do in Brevo and Cloudflare so the shop can send order confirmations. Why Brevo and the code plan: `EMAIL_SETUP.md` and `.working-files/brevo-email/plan.md`. The provider module that talks to Brevo exists (`backend/apps/backend/src/modules/brevo`); step 8 switches it on.

Brevo's menus change between versions. Where I name a menu path below it is from memory or from their docs, so search the dashboard for the word in **bold** if a path is not there.

## Checklist

- [ ] 1. Cloudflare: `info@bike-one.dev` forwards to `info@bike-one.de`
- [ ] 2. Brevo account created and activated
- [ ] 3. Brevo DPA accepted
- [ ] 4. Sending domain `bike-one.dev` authenticated, branded link sub-domain `mail` (DNS records in Cloudflare)
- [ ] 5. Sender `order@bike-one.dev` exists
- [ ] 6. API key created (v3 API key, not an SMTP key)
- [ ] 7. IP blocking checked
- [ ] 7b. Open/click tracking and link rewriting switched off for transactional mail
- [ ] 8. Key and settings put into bee5's `.env` (after the module exists)

Never paste the API key into chat, git, an issue or a doc. It goes only into the server's `.env`.

## 1. Cloudflare: `info@bike-one.dev` forwards to `info@bike-one.de`

This is the Reply-To address customers will answer.

1. Cloudflare dashboard, select the `bike-one.dev` domain, **Email**, **Email Routing**, **Get started** / enable.
2. Let Cloudflare add the records it asks for (MX and an SPF TXT on the apex `bike-one.dev`). They do not clash with Brevo's DKIM, code and DMARC records on the same apex (different names and record types), but keep Cloudflare's SPF record as the only SPF TXT on the apex.
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

## 4. Authenticate the sending domain `bike-one.dev`

1. Brevo: **Senders, Domains & Dedicated IPs**, **Domains**, **Add a domain**. Enter `bike-one.dev` (the apex). This is how the dev account was set up: the DNS shows Brevo's DKIM (`brevo1/2._domainkey`), code TXT and DMARC on `bike-one.dev` itself.
2. Brevo shows the DNS records to add, with names relative to `bike-one.dev` (`mail` means `mail.bike-one.dev`). Typically: a **Brevo code** TXT record, two **DKIM** records (host names like `brevo1._domainkey`) and a **DMARC** TXT record. The optional **branded sub-domain** (enter the prefix `mail`) adds three CNAMEs (`mail`, `r.mail`, `img.mail`, pointing at `brevosend.com`); it only serves Brevo's link and image domain and has nothing to do with sending. Add exactly what Brevo shows, not what I list here.
3. In Cloudflare: **DNS**, **Records**, **Add record** for each one.
   - In the Name field enter the host **without** `.bike-one.dev` (Cloudflare adds the zone). Example: if Brevo says `r.mail.bike-one.dev`, enter `r.mail`.
   - Paste the value exactly. For TXT values, no extra quotes.
   - **Proxy status: DNS only (grey cloud).** CNAME records default to proxied (orange); change them, or Brevo cannot verify them.
4. Back in Brevo, press **Authenticate** / **Verify**. It can take minutes, sometimes a few hours. Brevo shows the domain as authenticated when done.
5. DMARC: if Brevo only suggests `p=none`, keep that for now. Reports go to the address in `rua=`; use `info@bike-one.dev`.

## 5. Sender

The sender address must be on the domain you authenticated in step 4: `order@bike-one.dev`. (`mail.bike-one.dev` is only the branded link CNAME; it cannot carry mail.)

Brevo: **Senders, Domains & Dedicated IPs**, **Senders**, **Add a sender**: name `BikeOne`, e-mail `order@bike-one.dev`. If Brevo sends a confirmation mail to that address, add a Cloudflare Email Routing rule (step 1) `order` forwarding to `info@bike-one.de`, which also lets replies to it arrive. Do not create a real mailbox for it; replies are handled by Reply-To.

## 6. API key

1. Brevo: profile menu, **SMTP & API**, **API Keys**, **Generate a new API key**. Name it `bike-one-dev-bee5`.
2. **Access level: restricted, sending only.** Brevo's help centre says a key can be created with the **Restricted** option, where you choose a level per resource (None, Read, Read/write, All); older keys stay full-access until switched. The shop only calls `POST /v3/smtp/email`, so set the **transactional e-mail** resource (it may be labelled "Transactional emails" or "SMTP"; I could not read the exact menu names) to **Read/write** and everything else, especially contacts, campaigns, account and senders, to **None**. A leaked key then can send mail but cannot read your contacts or change the account.
3. If your dashboard offers no Restricted option, the key is full-access: that makes the root-only `.env` and the IP list (step 7) the only protection, so be stricter about both, and rotate the key if it ever appears anywhere it should not.
4. Copy the key immediately; Brevo shows it once. Use a **v3 API key**, not an SMTP key (the **SMTP** tab has separate SMTP keys; the shop does not use them).
5. Keep it in your password manager until step 8. Create a different key for production later, so a leak on dev does not touch production, and so each can be revoked alone.
6. After the first test order works, check the restriction held: with the new key, `curl -s -o /dev/null -w "%{http_code}\n" -H "api-key: <key>" https://api.brevo.com/v3/contacts` should answer 401 or 403, not 200. (Run it in your own terminal; do not paste the key anywhere else.)

## 7. IP blocking

Brevo can reject calls from IP addresses that are not on the account's authorised list. bee5's outbound IP changes, so a blocked call would fail with `unauthorized`.

1. Brevo: **Security**, **Authorised IPs** (menu name may differ).
2. Switch **blocking of unknown IP addresses for API keys** to **off** for the dev account, or use the automatic-authorisation mode if your account offers it. Do not enable blocking for the dev account unless you also add bee5's current public IP, and then accept that it breaks when the IP changes.
3. Production will have a fixed outbound IP: add it to the list and turn blocking **on** there.
4. If a test later fails with `unauthorized`, this is the first place to look.

## 7b. Tracking off for transactional mail

Tracking pixels and rewritten links in an order confirmation need a legal basis and, usually, consent (TDDDG § 25, GDPR), and they send click data to Brevo. Check in the Brevo account (look for **tracking**, **open tracking**, **click tracking**, **link tracking** in the settings and under Transactional) that they are off for transactional mail, and that no Brevo footer or logo is added to it. After the first test mail, look at its source ("Show original"): the links must point at `shop.bike-one.dev`, not at a Brevo tracking domain. Not verified which of these are on by default.

## 8. Put it on bee5 (after the module exists)

The module is deployed with `make deploy-dev`; the server keeps sending nothing until these variables are set.

1. `ssh bee5`, then edit `~/bike-one-shop/backend/apps/backend/.env`.
2. Delete the line `NOTIFICATION_ALLOW_NONE=true` and add (these names are what `medusa-config.ts` reads):

```
NOTIFICATION_PROVIDER_RESOLVE=./src/modules/brevo
NOTIFICATION_API_KEY=<the key from step 6>
NOTIFICATION_FROM="BikeOne <order@bike-one.dev>"
NOTIFICATION_REPLY_TO=info@bike-one.dev
```

3. `sudo systemctl restart bikeone-backend`, then `sudo journalctl -u bikeone-backend -n 30`: no `No e-mail provider configured` and no `SKIPPED`.
4. Place a test order on `https://shop.bike-one.dev` with an address you own (never a real customer's). The mail arrives, is not in spam, and "Show original" in Gmail shows DKIM, SPF and DMARC as pass for `mail.bike-one.dev`.
5. In Brevo, **Transactional**, **Logs** shows the message as delivered. Replying to the mail goes to `info@bike-one.de`.

## Before go-live

- Switch the Brevo plan from Free (300 mails/day, shared with any newsletter) to a paid one.
- Production: decide the sending domain (a `mail.` sub-domain on the production domain is safest, because the apex there already has real mailboxes), its own API key, a fixed outbound IP on the authorised list with blocking on, `NOTIFICATION_FROM="BikeOne <order@<sending domain>>"` and `NOTIFICATION_REPLY_TO=info@<production domain>`.
- Privacy policy names Brevo (see step 3). Check whether the Brevo footer shows up on transactional mail on your plan.
- Newsletters are a separate project (own sub-domain, double opt-in, consent records). The storefront newsletter form stays off until then.
