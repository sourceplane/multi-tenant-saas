# Billing — Polar Integration Plan

Status: Design / implementation plan (proposal). Not yet normative. The
normative billing contract remains `specs/components/11-billing.md`; this
document is the concrete plan for wiring **[Polar](https://polar.sh)** in as the
payment provider behind that contract (roadmap item **B6 — Billing UX
completion**, substituting Polar for the previously-named Stripe adapter).

## 1. Why Polar, and the one decision to confirm first

Polar is a **Merchant of Record (MoR)** developer billing platform: it owns
checkout, subscriptions, a hosted customer portal, invoices, and — critically —
**sales tax / VAT remittance**, which a raw Stripe integration does not. It ships
a Workers-compatible TypeScript SDK (`@polar-sh/sdk`), signs webhooks with the
[Standard Webhooks](https://www.standardwebhooks.com/) spec, and supports a
sandbox environment.

**Decision to confirm before Phase 1:** the roadmap (B6) named *Stripe*. Polar
being MoR means **Polar is the legal seller of record**, not Sourceplane. That is
usually a feature for a starter (no tax engine to build), but it is a real
business decision. Everything below assumes Polar-as-MoR is acceptable. The
adapter seam (§3) keeps this reversible — swapping providers later is an adapter
rewrite, not a schema or contract change.

## 2. What already exists (and why this is mostly wiring, not redesign)

The billing bounded context was deliberately built **provider-neutral with an
adapter seam**, so the foundation is already in place:

- **DB schema** (`packages/db/.../110_billing_foundation/up.sql`): `plans`,
  `billing_customers`, `subscriptions`, `invoices`, `entitlements` all already
  carry `provider`, `provider_customer_id`, `provider_subscription_id`,
  `provider_invoice_id`, and `hosted_url` columns as **opaque references**. No
  schema change is required to store Polar's ids.
- **`apps/billing-worker`**: owns plans, subscriptions, invoices, and
  entitlement materialization. The internal `plan/assign` seam
  (`handlers/assign-plan.ts`) idempotently (a) ensures the catalog plan rows,
  (b) upserts a billing customer, (c) creates/changes the subscription, and
  (d) **materializes the plan's entitlement set into `billing.entitlements`**,
  emitting `subscription.created|updated` + `entitlements.updated`. **This is
  exactly the function the Polar webhook will reuse.**
- **Entitlement seam** (`/v1/internal/billing/entitlements/check`): already
  consumed by `projects-worker` (project/env create gates) and
  `membership-worker` (member-limit gate). Because Polar drives entitlements
  through the *same* materialization path, **upgrades/downgrades take effect
  with zero changes to any gating caller.**
- **`packages/contracts/src/billing.ts`**: provider-neutral public types;
  provider ids appear only as opaque refs, never secrets. Checkout/portal
  request/response types are the only additions needed.
- **`apps/api-edge/src/billing-facade.ts`**: GET-only proxy to billing-worker.
  Needs POST (checkout/portal) + a public webhook route.
- **`packages/sdk/src/billing.ts`**: read-only by design; gains exactly two
  write methods (checkout, portal).
- **Secrets pattern**: established by B1 OAuth — non-secret config in
  `wrangler.jsonc` `vars`, secrets via `wrangler secret put … --env <env>`
  (see `apps/identity-worker`). Polar credentials follow the same pattern.

The roadmap precondition **U7 (designed `412 precondition_failed` upgrade UX)**
already exists in the console, so upgrade CTAs have somewhere to point.

## 3. Architecture: Polar as an adapter, never the source of truth

```
Console ──HTTP──> api-edge ──service binding──> billing-worker ──HTTPS──> Polar API
   ▲                  ▲                              │  ▲
   │ redirect         │ public webhook route         │  │ @polar-sh/sdk
   └─ checkout/portal └─ POST /v1/billing/webhooks/polar (raw body)
                                                      │
                                          billing.* tables (source of truth
                                          for ENTITLEMENT decisions)
```

Invariants (inherited from `specs/components/11-billing.md` § Extraction Seam):

1. **Entitlement decisions are read from `billing.entitlements`, never from
   Polar at request time.** Polar mutates our state asynchronously via webhooks;
   product gates stay fast and provider-independent.
2. **Provider-specific fields stay behind the adapter.** No Polar types leak into
   `packages/contracts`; no Polar secrets touch the DB or `metadata` columns.
3. **The billing-worker remains the system contract.** Polar is one
   `src/polar/*` adapter module that can be replaced.

### Identity mapping (no new mapping table)

- **Org ↔ Polar customer:** use Polar's `customerExternalId = <public org id>`
  on checkout. Polar then creates/links its customer to our org automatically;
  we mirror `provider='polar'` + `provider_customer_id` onto
  `billing.billing_customers` when a webhook first reports it. Lookups use
  `polar.customers.getExternal({ externalId })`.
- **Plan ↔ Polar product:** each catalog plan maps to a Polar **product id**,
  which differs between sandbox and production. Store this mapping in **env
  config** (recommended) — a `POLAR_PRODUCT_MAP` var per environment, parsed in
  `plan-catalog.ts` — rather than a migration, so sandbox/prod ids never live in
  the DB-of-record and adding a plan stays a code change. (Alternative:
  `billing.plans.metadata.polarProductId`; allowed since a product id is a
  non-secret opaque ref, but it couples catalog data to one provider.) The
  **entitlement set a plan grants stays in `plan-catalog.ts`** — Polar never
  decides what a plan unlocks, only that it was paid for.

## 4. The three flows

### 4.1 Purchase (checkout)

1. Console "Upgrade to Pro" → `POST /v1/organizations/:orgId/billing/checkout`
   `{ planCode }` (authenticated; **org-admin policy gate**, idempotent via
   `Idempotency-Key`).
2. api-edge resolves actor + forwards to billing-worker `handleCreateCheckout`.
3. billing-worker resolves `planCode → polarProductId`, calls
   `polar.checkouts.create({ products: [productId], customerExternalId: orgId,
   metadata: { orgId, planCode }, successUrl })`, returns `{ checkoutUrl }`.
4. Console redirects the browser to `checkoutUrl`. Polar hosts payment.
5. On success Polar fires `subscription.created` / `order.paid` webhooks →
   §4.3 materializes the upgrade. `successUrl` returns the user to the console
   billing page (which reflects the new plan once the webhook lands).

### 4.2 Manage subscription (customer portal)

1. Console "Manage billing" → `POST /v1/organizations/:orgId/billing/portal`
   (authenticated; org-admin policy gate).
2. billing-worker `handleCreatePortalSession` looks up the Polar customer by
   `externalId=orgId` (or by stored `provider_customer_id`), calls
   `polar.customerSessions.create({ … })`, returns `{ portalUrl }`.
3. Console redirects. Polar's portal handles payment-method updates,
   plan changes, cancellation, and invoice history. All resulting changes flow
   back through webhooks (§4.3) — the portal is read-through, not a second
   source of truth.

### 4.3 Webhook intake (the state-sync path — the most important piece)

- **Public, unauthenticated** `POST /v1/billing/webhooks/polar` at api-edge.
  It must **bypass actor resolution and identity rate-limiting**, and forward
  the **raw request body** (signature is computed over raw bytes) plus the
  `webhook-id` / `webhook-timestamp` / `webhook-signature` headers to
  billing-worker. (Cloudflare note: ensure Bot Fight Mode does not block this
  route.)
- billing-worker `handleProviderWebhook`:
  1. `validateEvent(rawBody, headers, POLAR_WEBHOOK_SECRET)` from
     `@polar-sh/sdk/webhooks`; on `WebhookVerificationError` → `403`, fail closed.
  2. **Dedupe** by Polar event id (new `billing.provider_webhook_events` table,
     unique on `(provider, event_id)`); a duplicate returns `200` without
     re-applying.
  3. Map event → state mutation, then **reuse `assignPlanWithRepos`** for the
     entitlement-bearing paths so upgrades/downgrades materialize identically to
     bootstrap:

     | Polar event | Mapped action |
     |---|---|
     | `subscription.created` / `subscription.active` | upsert subscription (provider ids, period, status); resolve product→planCode; `assignPlan` → materialize entitlements; emit `subscription.created` + `entitlements.updated` |
     | `subscription.updated` | update period/status; if product changed, re-assign plan (re-materialize entitlements) |
     | `subscription.canceled` / `subscription.revoked` | mark `canceled`/`expired`; **downgrade to `free`** (re-assign free entitlements); emit `subscription.canceled` + `entitlements.updated` |
     | `order.created` / `order.paid` | `upsertInvoice` mirror (number, amounts, currency, `hostedUrl`, period); emit `invoice.generated` / `invoice.paid` |
     | order payment failure | emit `payment.failed` (drives B2 recovery email) |

  4. Respond **fast** (Polar times out at 10s, recommends < 2s). Persist the
     critical state inline; push best-effort event emission to `ctx.waitUntil`.
  5. **Never persist raw Polar payloads, signing secrets, or tokenized URLs** —
     only the mapped safe fields the schema already defines.

This webhook path is what makes Polar the source of truth for *billing state*
while `billing.entitlements` stays the source of truth for *product decisions*.

## 5. Secrets & configuration (per environment: dev / stage / prod)

Add to `apps/billing-worker/src/env.ts` and `wrangler.jsonc`:

- `POLAR_ACCESS_TOKEN` — **secret** (`wrangler secret put POLAR_ACCESS_TOKEN --env <env>`).
- `POLAR_WEBHOOK_SECRET` — **secret**; base64 secret from Polar's webhook config.
- `POLAR_SERVER` — var: `"sandbox"` (dev/stage) or `"production"` (prod).
- `POLAR_PRODUCT_MAP` — var: JSON `{ "pro": "<polar_product_id>", … }` per env.
- `POLAR_SUCCESS_URL` / allowed console origin — var; where checkout returns to.

Mirrors the B1 OAuth secret pattern exactly. Nothing Polar-related goes into
contracts, `metadata` columns, or the repo.

## 6. File-level change map

- **`packages/contracts/src/billing.ts`** — add `CreateCheckoutRequest`
  (`{ planCode }`), `CreateCheckoutResponse` (`{ checkoutUrl }`),
  `CreatePortalSessionResponse` (`{ portalUrl }`). Provider-neutral.
- **`packages/db`** — new migration `170_billing_provider_webhook_events`
  (dedupe table); add `recordProviderWebhookEvent` + an upsert-subscription-by-
  provider-id helper to `billing/repository.ts`. No change to existing tables.
- **`apps/billing-worker/src/`**
  - `env.ts` — Polar config/secrets above.
  - `polar/client.ts` — thin adapter over `@polar-sh/sdk`
    (`checkouts.create`, `customerSessions.create`, `customers.getExternal`).
  - `polar/verify.ts` — `validateEvent` wrapper.
  - `polar/mapper.ts` — product↔planCode + event→mutation mapping (pure,
    unit-testable).
  - `handlers/create-checkout.ts`, `handlers/create-portal-session.ts`,
    `handlers/provider-webhook.ts`.
  - `router.ts` — route the two authenticated POSTs (policy-gated) and the
    public signature-verified webhook.
- **`apps/api-edge/src/billing-facade.ts`** — allow POST for `…/billing/checkout`
  and `…/billing/portal` (auth + idempotency + policy); add a **separate public
  raw-body passthrough** for `/v1/billing/webhooks/polar` (no actor, no
  identity rate-limit). Register in `index.ts`.
- **`packages/sdk/src/billing.ts`** — add `createCheckout(orgId, { planCode })`
  and `createPortalSession(orgId)` (the two intentional write methods).
- **`apps/web-console-next`** — billing settings: plan cards with **Upgrade**
  (→ checkout redirect), **Manage billing** (→ portal redirect), current
  plan/status from `getSummary`, invoice list from `listInvoices`; wire the
  existing **U7** upgrade prompt CTA to `createCheckout`.
- **`apps/membership-worker` / `apps/projects-worker`** — **no change** (free
  plan still bootstrapped locally; entitlement gates unchanged). This is the
  proof the seam holds.
- **Notifications (B2)** — on `invoice.paid` send a receipt; on `payment.failed`
  send dunning/recovery copy. Optional, follow-up.

## 7. Delivery phases (each ~one PR-sized task)

- **Phase 0 — Adapter scaffolding.** Polar SDK dependency, `env.ts` config,
  `polar/client.ts`, product map, sandbox credentials. No public routes yet.
- **Phase 1 — Webhook intake (critical path).** Public route + signature verify
  + dedupe table + event→state/entitlement mapping. Makes Polar drive billing
  state even before the UI exists (test by creating a checkout in Polar's
  dashboard).
- **Phase 2 — Checkout (purchase).** POST checkout + policy gate + console
  upgrade buttons + U7 CTA wiring.
- **Phase 3 — Customer portal.** POST portal + console "Manage billing".
- **Phase 4 — Invoices & lifecycle polish.** Invoice list UI, downgrade-on-
  cancel, trials (`trial_end`), receipts/dunning via B2.
- **Phase 5 — Hardening.** Reconciliation job (read-sync from Polar to repair
  missed webhooks), entitlement-decision observability (B9), admin plan
  overrides (B8).

## 8. Testing

- **Unit** (follow `tests/billing-worker/.../assign-plan.test.ts` repo-fake
  pattern): `polar/mapper.ts` (event→mutation, product→plan), signature verify
  against captured fixtures, checkout/portal handlers with a fake Polar client.
- **Contract** (`tests/contracts`): new request/response shapes.
- **Edge** (`tests/api-edge/.../billing-facade.test.ts`): checkout/portal require
  auth + policy; webhook route bypasses auth but **rejects bad signatures**.
- **Manual e2e**: Polar **sandbox** — real checkout → webhook → entitlement
  materialization → gated action unlocks.

## 9. Security checklist

- Webhook signature verification mandatory; fail closed on bad/missing signature.
- Idempotent webhook application (dedupe by event id); idempotent checkout
  (`Idempotency-Key`).
- Checkout/portal are **org-admin only** (policy gate) — never anonymous.
- No secrets/tokens in contracts, DB, `metadata`, or logs; `hosted_url` validated
  as a safe display URL (no embedded bearer tokens) per the schema's existing
  constraint.
- Entitlements never read live from Polar on the request hot path → no provider
  outage can block product gates; deny-by-default preserved.

## 10. Open questions to resolve before building

1. **MoR acceptable?** (Polar is seller of record / handles tax) — vs a direct
   Stripe integration. (§1)
2. **Plan→product mapping home:** env config (recommended) vs
   `billing.plans.metadata`. (§3)
3. **Webhook dedupe store:** new `billing.provider_webhook_events` table
   (recommended) vs reuse the edge idempotency store. (§4.3)
4. **Trials & proration:** offer a trial on `pro`? Honour Polar proration on
   mid-cycle changes, or snap entitlements at webhook time only?
5. **Usage-based billing** (future): `apps/metering-worker` already produces
   rollups; Polar meters could bill overages later (roadmap "MAY" item).
</content>
</invoke>
