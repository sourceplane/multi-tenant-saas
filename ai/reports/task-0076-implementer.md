# Implementer Report — task-0076

**Task:** Billing read runtime (`billing-worker`) + `api-edge` billing facade
**Branch:** `impl/task-0076-billing-worker`
**PR:** https://github.com/sourceplane/multi-tenant-saas/pull/119
**Status:** Implementation complete; ready for verifier.

## What shipped

### New private worker: `apps/billing-worker/`
A Cloudflare Worker exposed only via service binding (no `workers_dev`, no
routes). Mirrors `metering-worker` layout exactly.

Routes (all GET, authenticated, policy-gated by `billing.read`):

| Path | Repo call |
|---|---|
| `/v1/organizations/{orgId}/billing/plans?status=active\|archived` | `listPlans` |
| `/v1/organizations/{orgId}/billing/customer` | `getBillingCustomer` |
| `/v1/organizations/{orgId}/billing/summary` | `getBillingSummary` |
| `/v1/organizations/{orgId}/billing/invoices?status=&subscriptionId=&limit=&cursor=` | `listInvoices` |
| `/v1/organizations/{orgId}/billing/entitlements?source=&subscriptionId=` | `listEntitlements` |

Modules:

- `src/index.ts` — `ExportedHandler<Env>` entrypoint → `router.route`
- `src/router.ts` — regex routing, request-id resolution, actor header parsing, dispatch
- `src/env.ts` — `Env` interface with `SOURCEPLANE_DB` Hyperdrive + `MEMBERSHIP_WORKER`/`POLICY_WORKER` fetchers
- `src/http.ts` — JSON `successResponse` / `listResponse` / `errorResponse` / `notFound` / `methodNotAllowed` / `validationError`
- `src/ids.ts` — `parseOrgPublicId` / `parseSubscriptionPublicId` / `generateRequestId`
- `src/membership-client.ts` — POST `/v1/internal/memberships/context`
- `src/policy-client.ts` — POST `/v1/internal/policy/authorize` for `billing.read`
- `src/policy.ts` — orchestrates membership-then-authorize, fail-closed → 404
- `src/mappers.ts` — internal `BillingCustomer`/`Invoice`/`Plan`/`Subscription`/`Entitlement` → `@saas/contracts/billing` public shapes
- `src/handlers/{health,list-plans,get-customer,get-summary,list-invoices,list-entitlements}.ts`

### New edge facade: `apps/api-edge/src/billing-facade.ts`
- `isBillingRoute(pathname)` — regex matches for the five paths
- `handleBillingRoute(request, env, requestId, pathname)` — 405 on non-GET; 503 on missing `IDENTITY_WORKER`/`BILLING_WORKER`; `resolveActor()` → injects `x-actor-subject-id`/`-type`/`-email`/`-org-id`; forwards GET with original search params to `env.BILLING_WORKER.fetch("https://billing.internal" + path + search)`; 503 on downstream throw.

### Wiring
- `apps/api-edge/src/env.ts` — added `BILLING_WORKER?: Fetcher`
- `apps/api-edge/src/index.ts` — `isBillingRoute` branch inserted right after metering
- `apps/api-edge/wrangler.jsonc` — `BILLING_WORKER` service binding for `stage` and `prod`
- `apps/api-edge/component.yaml` — added `- component: billing-worker` dependency
- New `apps/billing-worker/component.yaml` + `wrangler.jsonc`

### Tests
- `tests/billing-worker/src/billing-worker.test.ts` — 24 tests:
  - `ids`: request-id format, org/subscription public-id parsing (valid + invalid prefix + invalid hex)
  - `router`: health (200 + 503 when bindings missing), unknown route (404), invalid org id (404), unauthenticated (401), wrong method (405), policy deny per-route (404 × 5, fail-closed), membership-worker failure (404), validation 400s for status/source/limit/cursor/subscriptionId, x-request-id preservation
- `tests/api-edge/src/billing-facade.test.ts` — 11 tests: route matching (5 routes + 3 negative), 405, 503 (missing identity), 503 (missing billing), 401 (missing auth), forwarding with actor headers + query string preservation, 503 on downstream throw

## Validation results

```
pnpm --filter @saas/billing-worker typecheck          PASS
pnpm --filter @saas/api-edge typecheck                PASS
pnpm --filter @saas/billing-worker-tests typecheck    PASS
pnpm --filter @saas/api-edge-tests typecheck          PASS
pnpm --filter @saas/billing-worker-tests test         PASS 24/24
pnpm --filter @saas/api-edge-tests test               PASS 263/263 (9 suites)
pnpm --filter @saas/billing-worker build              PASS (wrangler dry-run, 147.01 KiB / 34.12 KiB gzip)
pnpm --filter @saas/api-edge build                    PASS (wrangler dry-run, 136.83 KiB / 30.90 KiB gzip)
```

Unrelated pre-existing failure: `@saas/projects-worker-tests` typecheck —
`queryEventsByOrg` missing on `EventsRepository`. Not touched by this PR.

`orun validate` was not run — the `orun` CLI is not installed on this
machine. Component YAMLs follow the `metering-worker` schema verbatim.

## Authorization semantics

`billing.read` already exists in `@saas/contracts/src/policy.ts`
(`ORGANIZATION_ACTIONS`) and is granted by `@saas/policy-engine` to roles
`owner`, `admin`, `billing_admin`. No new actions or schema changes.

Flow per request:
1. Edge resolves session → injects `x-actor-subject-{id,type}` headers
2. Worker parses `org_*` path segment → 404 if invalid
3. Worker calls `MEMBERSHIP_WORKER`/v1/internal/memberships/context with the actor → 404 if not OK
4. Worker calls `POLICY_WORKER`/v1/internal/policy/authorize with `{action: "billing.read", resource: {kind: "organization", orgId, …}, memberships}` → 404 if denied
5. Repository call → 404 on `not_found`, 503 on `internal_error`, else 200 with mapped public shape

No org enumeration: every failure mode returns 404 with a generic body.

## Scope discipline (per task contract)

In scope: ✓ five read routes, ✓ private worker behind service binding, ✓ edge facade, ✓ deployment wiring, ✓ focused tests.

Out of scope (none touched): mutations, provider SDKs, webhooks, checkout, customer portal, raw metering aggregation, billing UI, schema migrations, Terraform, provider secrets, `specs-v2/**`.

## Files

**New (29):**
```
apps/billing-worker/component.yaml
apps/billing-worker/package.json
apps/billing-worker/tsconfig.json
apps/billing-worker/wrangler.jsonc
apps/billing-worker/src/env.ts
apps/billing-worker/src/http.ts
apps/billing-worker/src/ids.ts
apps/billing-worker/src/index.ts
apps/billing-worker/src/mappers.ts
apps/billing-worker/src/membership-client.ts
apps/billing-worker/src/policy-client.ts
apps/billing-worker/src/policy.ts
apps/billing-worker/src/router.ts
apps/billing-worker/src/handlers/get-customer.ts
apps/billing-worker/src/handlers/get-summary.ts
apps/billing-worker/src/handlers/health.ts
apps/billing-worker/src/handlers/list-entitlements.ts
apps/billing-worker/src/handlers/list-invoices.ts
apps/billing-worker/src/handlers/list-plans.ts
apps/api-edge/src/billing-facade.ts
tests/api-edge/src/billing-facade.test.ts
tests/billing-worker/component.yaml
tests/billing-worker/package.json
tests/billing-worker/tsconfig.json
tests/billing-worker/src/billing-worker.test.ts
```

**Modified (5):**
```
apps/api-edge/component.yaml      (+1 dependency)
apps/api-edge/src/env.ts          (+BILLING_WORKER Fetcher)
apps/api-edge/src/index.ts        (+billing-facade import & branch)
apps/api-edge/wrangler.jsonc      (+stage & prod service bindings)
pnpm-lock.yaml                    (new workspace packages)
```

## Notes for verifier

- Service binding live verification will require post-merge `wrangler tail`/curl through `api-edge` once `BILLING_WORKER` is provisioned in stage.
- The billing repository under `@saas/db/billing` was shipped in PR #118 (task-0075) and is unchanged here.
- All routes return `404` on policy deny / invalid id — verifier should NOT expect `403` on unauthorized access.
