# Account activation: open items before go-live

Implementer: `expert-developer` for the code tasks. Every code task goes through `legal-security-reviewer` before merge (authentication and personal data). Legal wording is drafted for the owner and a lawyer; none of it is legal advice.

## Context

Built 2026-11-17 (PLAN.md Task 17): customer accounts need a confirmed e-mail address (`authVerificationsPerActor` in `medusa-config.ts`). `src/subscribers/auth-verification-requested.ts` sends the German activation mail through Brevo, only to the address of the requesting auth identity and at most once a minute per address (in memory). `src/lib/link-guest-orders.ts` moves guest orders with the same verified address onto the account, called by a middleware on `GET /store/orders` (at most every 5 minutes per customer). `POST /store/customers` must use the identity's own address. The storefront already had the verify page (`/de/verify-account`) and the `verification_required` state.

The two security reviews of this feature (first: two High findings, fixed; second: both confirmed fixed, one Medium design issue left, task 0) left these items. None blocks the dev server; all are go-live gates, in the order below.

## Status (2026-11-17)

Built: task 0 (option a), the in-app part of task 1 (per visitor in the storefront actions, per account/login in the backend, after the review found that the backend only sees the storefront's address), tasks 2, 3 and 4, and the activation-mail part of task 5's retention job. The third security review's findings (shared rate-limit bucket, early customer creation that bypassed the cleanup, forgeable proxy headers, resend-button enumeration, country-code redirect, cleanup page cap, verify page robots/referrer, reset-password limits, root .gitignore) are fixed. Still open and not code: the edge rate-limit rules (Cloudflare dashboard / proxy config, task 1), the privacy-policy text (task 5), the TriData question (task 6), the footer confirmation (task 7), and the password-reset plan (task 8). Details per task below; the old "Tasks" text is kept as the specification.

## Tasks

### 0. Blocking for real customers: pre-account takeover through the confirm link (decision needed)

Found by the second security review (2026-11-17). Not a problem on the dev server (no real data), a blocker before real customers:

1. An attacker registers an emailpass identity with the victim's address and the attacker's own password (Medusa does not check ownership).
2. The attacker logs in, gets `verification_required`, and requests verification. The subscriber mails the victim, because the victim's address is that identity's own address.
3. If the victim clicks the link, `POST /auth/verification/confirm` verifies the row by the code alone (the route is unauthenticated and never compares the identity).
4. The attacker logs in with the known password, creates the customer for the victim's address, and `linkGuestOrders` moves the victim's guest orders (names, addresses, purchases) onto the attacker's account.

It needs one click by the victim on a mail that says "ignore this if you did not register". Options:

- **(a) Recommended:** confirm only together with the identity. Override `/auth/verification/confirm` with a route that requires the identity's bearer token and checks that the verification row's `auth_identity_id` equals the token's identity. The verify page then asks the visitor to log in (address and password) first and confirms afterwards, so the mail link works on any device, but only for someone who knows the password. The victim does not know the attacker's password, so the attack fails; the real owner logs in with their own. Cost: custom route plus storefront page change (login step), a unit test for the route and for the attack.
- **(b)** Keep the one-click link but do not link orders on verification alone: an extra authenticated "show my earlier orders" step with a second code mailed to the address. More friction for every legitimate customer.
- **(c)** Accept the residual risk knowingly and document it. This is a product and data-protection decision for the owner and a lawyer (Art. 32 GDPR); do not choose it silently.

Until one is done, do not take real customers or real orders, and keep linking behind a switch if needed (`LINK_GUEST_ORDERS=false` env check in the middleware) so the feature can be turned off without a deploy of code.

Small follow-ups from the same review (not blocking): evict old entries from the two in-memory throttle maps; a unit test for `requireOwnEmail` and for `emailpassIdentity`; one live register, confirm, login, create customer, list orders run on the dev server; the 5-minute linking interval starts when the run starts, so a customer who confirms right after an earlier attempt can wait up to 5 minutes for merged orders (set the timestamp only after a run that had a verified identity, or accept).

### 1. Rate limit the auth endpoints at the edge (highest priority)

Medusa has no rate limit. The in-memory mail throttle only protects one address; an attacker can still hammer login (password guessing), registration (squatting addresses) and the verification request (mailing different victims once each).

- Limit per client IP, by path and method:
  - `POST /auth/customer/emailpass` (login): about 10 per minute
  - `POST /auth/customer/emailpass/register`: about 5 per minute
  - `POST /auth/verification/request` and `POST /auth/verification/confirm`: about 5 per minute
  - `POST /store/customers`: about 5 per minute
  Over the limit: HTTP 429.
- **Dev** (Cloudflare tunnel, `shop-admin.bike-one.dev` serves the backend): a Cloudflare rate limiting rule on the zone (Security, WAF, Rate limiting rules). Check what the plan allows (the free plan has few rules and fixed periods); if one rule is all there is, combine the paths with an OR expression and one limit.
- **Production** (Strato server, reverse proxy with TLS, decision in `planning/3-Architecture_Tech_Stack/decisions.md`): the proxy is not chosen yet. nginx `limit_req_zone` per client address on those locations is the simple way; Caddy needs a plugin for it. Behind Cloudflare the client IP is the `CF-Connecting-IP` header, so key the limit on that, not the proxy's own peer address.
- Write the exact rules into `REVIEW_TASKS.md` (server checklist already lists "rate limit `/auth/*`").
- Accept: a loop of 20 login requests from one IP gets 429 after the limit; normal browsing and one registration are unaffected.

### 2. "Resend activation mail" button

Today the text says "log in again", which re-sends through the same unthrottled request route and is not obvious.

- The verification request needs the no-actor bearer token that the login response returns together with `verification_required`. Keep it in a short-lived (15 minutes, the code lifetime), `httpOnly`, `sameSite=lax` cookie `_medusa_pending_verification`, set in `completeLogin` (`apps/storefront/src/lib/data/customer.ts`) when the backend says `verification_required`; remove it when the login succeeds.
- New server action `resendActivationEmail()` reads that cookie and calls `requestVerificationEmail` for the stored address (store the address next to the token, never take it from the form again). Returns "sent" or a neutral "wait a minute" (the backend throttle swallows early repeats silently, so the UI just starts a 60 s cooldown).
- Button "Bestätigungs-E-Mail erneut senden" in the `verification_required` message of the register and login components (`modules/account/components/register`, `login`), with a 60 s disabled state. Also on the `/verify-account` error state ("Link ungültig oder abgelaufen") instead of the current "log in to get a new one".
- German copy, `bo-*` tokens, keyboard accessible, `aria-live` for the result.
- Accept: register, do not click, press the button, a second mail arrives; pressing again within a minute sends nothing and the UI says so; an expired or used link offers the button.

### 3. Clean up stale unverified identities

Medusa lets anyone register an address without proving they own it. The identity then exists forever and the real owner gets "Identity with email already exists" when they try to register (address squatting). Verification codes live 15 minutes, so a stale identity is useless after that.

- Scheduled job `src/jobs/auth-unverified-cleanup.ts` (daily, like the `tridata-*` jobs, for example 03:45): delete auth identities that
  - have an `emailpass` provider identity,
  - are older than 7 days,
  - are bound to no actor (`app_metadata` has neither `customer_id` nor `user_id`; this excludes every admin user and every real customer),
  - and have no verification row with `verified_at`.
  Use the auth module's list/delete methods (`listAuthIdentities` with `relations: ["provider_identities"]`, `deleteAuthIdentities`). Log only the count and ids. Env flag `AUTH_CLEANUP_DRY_RUN=true` logs what it would delete.
- A registered-but-unverified identity that already has a customer record cannot exist (the customer is created after the login succeeds), so the "no actor" rule is the safety line; unit-test it with an admin identity, a customer identity and a stale identity.
- Accept: unit tests; on the dev server a throwaway registration, backdated 8 days in the database, disappears on a dry run log and then on a real run, while the admin identity and the real customer stay.

### 4. Address enumeration on registration

`POST /auth/customer/emailpass/register` answers "Identity with email already exists", so anyone can find out which addresses have an account. Login already answers generically (check it before changing anything).

- First do task 1 (limits the speed of enumeration).
- Then the storefront: treat the "already exists" answer of `signup` like a normal registration and show the same neutral message as for a new address ("Wir haben dir eine E-Mail geschickt, sofern ..."). The owner of an existing account gets nothing new; a squatter or attacker learns nothing. Cost: a legitimate user who forgot they have an account gets no hint. Mitigation: the neutral text names "Passwort vergessen" as the way out (there is no reset flow yet: see task 8).
- No CAPTCHA for now: Cloudflare Turnstile or similar is a third-party script and needs a consent/privacy decision (TDDDG); only reconsider if abuse shows up.
- Accept: registering an existing and a new address give the same message and similar timing.

### 5. Privacy policy and retention (owner and lawyer; drafts below)

The policy is still on the old site (`https://bike-one.org/datenschutz/`, linked from the storefront). It has to cover, in one place:

- **Customer account and e-mail confirmation:** purpose account management, Art. 6(1)(b) GDPR; address, name, password hash; the activation mail is sent through the processor Brevo.
- **Brevo as processor:** Art. 28 DPA signed (`BREVO_SETUP.md` step 3), sub-processors and transfer basis checked, tracking off for transactional mail (`BREVO_SETUP.md` 7b).
- **Order merge:** "Haben Sie vor der Registrierung als Gast bestellt, ordnen wir diese Bestellungen nach der Bestätigung Ihrer E-Mail-Adresse Ihrem Kundenkonto zu."
- **Retention:** unverified registrations are deleted after 7 days (task 3); the notification table keeps recipient address and mail content (see below).
- **Rate limiting (from the review):** IP addresses are held in memory for a minute to limit login attempts (legitimate interest, Art. 6(1)(f) GDPR); say so. Name the strictly necessary cookie `_medusa_pending_verification` (15 minutes, httpOnly) in the cookie list (§ 25(2) no. 2 TDDDG, no consent needed).
- **Draft paragraph (German) for the lawyer:** "Kundenkonto: Wenn Sie ein Kundenkonto anlegen, verarbeiten wir Ihre E-Mail-Adresse, Ihren Namen und ein verschlüsselt gespeichertes Passwort, um das Konto zu führen (Art. 6 Abs. 1 lit. b DSGVO). Wir senden Ihnen eine E-Mail, mit der Sie Ihre Adresse bestätigen; den Versand übernimmt unser Dienstleister Brevo (Sendinblue SAS, Frankreich) als Auftragsverarbeiter. Nicht bestätigte Registrierungen löschen wir nach sieben Tagen. Haben Sie zuvor als Gast bestellt, ordnen wir diese Bestellungen nach der Bestätigung Ihrer Adresse Ihrem Konto zu."
- **Notification table retention (from the review):** Medusa stores every sent mail with the recipient and the full content, which includes the one-time activation link (valid 15 minutes) and, for order confirmations, addresses and items. Built: `src/jobs/notification-retention.ts` deletes the copies of activation mails after 7 days. Order confirmations are NOT deleted: they are business letters with a 6-year retention duty (§ 257 HGB, § 147 AO); the policy should say so and the lawyer confirms the period.

### 6. TriCon / TriBike and moved orders

`UploadOrder` sets `IsOneTimeCustomer: !order.customer?.has_account` at upload time (`workflows/tridata/helpers/build-upload-order.ts`). An order uploaded as a guest stays a one-time customer in the ERP after it is later moved to an account, and `updateOrders` emits no order event, so nothing is re-sent. That is probably fine, but it is a business question.

- Ask BikeOne/TriData: do web-shop account customers get an ERP customer number, and does it matter that earlier guest orders of the same person stay under one-time customers? Record the answer in `planning/3-Architecture_Tech_Stack/tricon-mock-contract.md`.
- If it matters: a follow-up that re-sends the customer data (a TriCon customer update), triggered by the linking. Not before the answer.

### 7. Seller footer of the activation mail

The mail carries the same company block as the order confirmation (`COMPANY` and `SELLER` in `workflows/order-confirmation/build-email.ts`, register number, VAT id, managing director). The owner has to confirm those values and the wording once for both mails (already open for the order mail). Optionally add the Impressum link.

### 8. Related gaps found on the way

- No **password reset** flow exists (the storefront has none; Medusa emits `auth.password_reset`). A customer who forgot the password has no way back. Same shape as the activation mail: subscriber on `auth.password_reset`, German mail with a link to a storefront page, throttled and bound to the identity. Needed before go-live; plan it as the next task after 1 to 3.
- Account deletion / data export for customers (GDPR Art. 15 and 17): not built; see `.working-files/legal-compliance/`.

## Order of work

0. Task 0: owner decision (a, b or c), then build it.
1. Task 1 (edge limits). Dev and production rules, documented.
2. Tasks 2 and 3 together (storefront cookie plus button; cleanup job). One review.
3. Task 5 notification retention job, and the policy text to the owner.
4. Task 4 after 1.
5. Task 8 password reset as its own plan.
6. Tasks 6 and 7 are owner/TriData questions: send them now.

## Done when

- A new customer can register, activate (also after the first mail expired, via the button), log in, and sees their earlier guest orders.
- 20 rapid login or registration requests from one IP are rejected at the edge.
- Stale unverified registrations disappear; admin and real customers are never touched (test).
- The privacy policy names Brevo, the order merge and the retention periods; the owner has confirmed the footer data.
- `legal-security-reviewer` returns Pass on each code change, and this folder is removed once its facts live in `REVIEW_TASKS.md`, `PLAN.md` and the privacy policy.
