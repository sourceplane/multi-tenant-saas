# Task 0078 — Implementer Report

**Agent:** Implementer
**Branch:** `impl/task-0078-billing-entitlement-check`
**PR:** [#121](https://github.com/sourceplane/multi-tenant-saas/pull/121)
**Base:** `main` @ `91a5a0c`

## Summary

Added a provider-neutral, service-binding-only entitlement decision API
(`CheckBillingEntitlement`) on `billing-worker` so other bounded-context
Workers can ask "is this org allowed X?" without speaking provider language
or holding billing secrets. The route lives at
`POST /v1/internal/billing/entitlements/check`, has strict input validation,
fail-closed semantics, secret-safe responses, and is **not** exposed via
`api-edge`.

This is the first `/v1/internal/...` route in the billing bounded context;
the router registers it explicitly before the public allow-list and before
`resolveActor()` so service-binding callers do not need to forge
`x-actor-*` headers.

## Files Changed

| File | Change |
|---|---|
| `packages/contracts/src/billing.ts` | +62 lines — `CheckBillingEntitlementRequest`, `BillingEntitlementDeniedReason` (`'disabled'` \| `'not_configured'`), `BillingEntitlementAllowedDecision`, `BillingEntitlementDeniedDecision`, `CheckBillingEntitlementResponse` discriminated union. |
| `apps/billing-worker/src/handlers/check-entitlement.ts` | **new** — 5055 bytes. Exports `parseCheckEntitlementBody` (pure), `decideEntitlement(repo, parsed)` (testable with fake repo), `handleCheckEntitlement(req, env, requestId, { repoFactory? })`. |
| `apps/billing-worker/src/router.ts` | +14 lines — imports handler; matches `POST /v1/internal/billing/entitlements/check` before the public allow-list and before `resolveActor()`. |
| `tests/contracts/src/billing.test.ts` | +4 tests in a new `describe("contracts: billing — Entitlement decision (internal seam)")` block. |
| `tests/billing-worker/src/billing-worker.test.ts` | +17 tests across 4 blocks: 4 router-level (405 on GET, 503 on missing DB without 401, 400 on bad JSON, 400 on bad orgId/key), 6 `parseCheckEntitlementBody`, 4 `decideEntitlement`, 3 `handleCheckEntitlement (injected repo)`. |
| `tests/api-edge/src/billing-facade.test.ts` | +2 tests asserting `isBillingRoute("/v1/internal/billing/entitlements/check")` is false and documenting the exact five Task 0076 public read routes. |

Net diff: **6 files changed, 666 insertions(+)**.

## Wire Shape

Request:
```json
{ "orgId": "org_<32hex>", "entitlementKey": "feature.custom_domains" }
```

Allowed response (200):
```json
{
  "data": {
    "allowed": true,
    "orgId": "org_...",
    "entitlementKey": "feature.custom_domains",
    "valueType": "boolean" | "quantity" | "feature",
    "limitValue": <number | null>,
    "source": "plan" | "override",
    "subscriptionId": <string | null>
  }
}
```

Denied response (200):
```json
{
  "data": {
    "allowed": false,
    "orgId": "org_...",
    "entitlementKey": "feature.custom_domains",
    "reason": "disabled" | "not_configured"
  }
}
```

Error codes: `400 validation_error` (bad JSON / bad orgId / bad key),
`405 method_not_allowed` (non-POST), `503 internal_error` (DB missing,
non-`not_found` repo failure — generic message, no SQL/details leaked).

## Key Decisions

- **Three-layer handler split.** `parseCheckEntitlementBody` is pure;
  `decideEntitlement(repo, parsed)` accepts a `Pick<BillingRepository,
  "getEntitlement">`; `handleCheckEntitlement` wires env/repo. Lets us
  unit-test the decision logic against an in-memory fake without booting
  Hyperdrive/Postgres.
- **Route registered early.** `POST /v1/internal/billing/entitlements/check`
  is matched before `matchRoute()` and before `resolveActor()`. Service-
  binding only; no `x-actor-*` required. Verified by a router test that
  returns 503 (missing DB) instead of 401 when the actor header is absent.
- **Fail-closed.** Missing entitlement → `200 { allowed:false,
  reason:"not_configured" }`, not 404 or 5xx. Callers gate behavior on
  the `allowed` boolean; absence-as-non-error prevents accidental
  "open on error" patterns at call sites.
- **Secret-safe responses.** Only `{ valueType, limitValue, source,
  subscriptionId }` carried from `Entitlement` to the wire — never `metadata`,
  internal `id`, raw repository rows. Repo `internal` errors mapped to
  503 with a generic message; original error text never propagated.
- **Conservative key regex.** `/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/` with
  128-char max. Matches existing key conventions (`feature.custom_domains`,
  `limit.projects`) and prevents log-injection / weird identifiers.
- **api-edge intentionally untouched.** The public facade allow-list only
  matches `/v1/organizations/{org}/billing/{plans|customer|summary|
  invoices|entitlements}`. The internal path shape cannot match by
  structure. Added regression tests to make this explicit and to document
  the exact public surface.

## Checks Run

| Check | Result |
|---|---|
| `pnpm --filter @saas/contracts typecheck` | ✓ PASS |
| `pnpm --filter @saas/billing-worker typecheck` | ✓ PASS |
| `pnpm --filter @saas/api-edge typecheck` | ✓ PASS |
| `pnpm --filter @saas/contracts-tests test -- billing` | ✓ 18/18 (+4 new) |
| `pnpm --filter @saas/billing-worker-tests test` | ✓ 41/41 (+17 new) |
| `pnpm --filter @saas/api-edge-tests test -- billing-facade` | ✓ 16/16 (+2 new) |
| `./.workspace/bin/orun validate` | ✓ `Intent is valid` / `All validation passed` |
| `./.workspace/bin/orun plan` | ✓ `32 components × 3 envs → 68 jobs` (plan `3cfba93a90b1`) |

`orun dry-run` does not exist as a subcommand in the installed `orun`
binary (`./.workspace/bin/orun --help` lists `validate`, `plan`, `run`,
`status`, etc., but no `dry-run`). `orun plan` is the closest equivalent
and passed.

### Pre-existing failures (NOT caused by this PR)

- `tests/identity-worker typecheck`: 12 errors of the form
  `Property 'crypto' does not exist on type 'typeof globalThis'` in
  test files. Reproduces on `main` with our changes stashed.
- `tests/projects-worker test`: `'queryEventsByOrg' is missing in type`
  in `projects-worker.test.ts:177` — `EventsRepository` interface drift
  not reflected in the test stub. Reproduces on `main` with our changes
  stashed.

Both should be tracked as separate follow-ups; they are outside the
billing context.

## Constraints Honored

- [x] Provider-neutral contracts — no `apiKey` / `secret` / `token` /
      `providerPayload` / `sql` / `metadata` / provider ids on the wire.
- [x] Fail-closed on missing entitlement.
- [x] 503 internal_error never leaks SQL / repo error text.
- [x] Internal route is service-binding-only; does not require
      `x-actor-*` headers.
- [x] Internal route not exposed via api-edge (verified by tests).
- [x] ESM `.js` import suffixes; `@billing-worker/*` and `@saas/*` path
      aliases used in tests.
- [x] Entitlement key regex `/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/` with
      128-char cap.

## Possible Follow-ups

- `decideEntitlement` currently returns `subscriptionId` directly from
  the `Entitlement` repo row. If that field is a raw UUID rather than a
  public `sub_<hex>` id, a follow-up should pass it through the public-id
  encoder (mirroring how other handlers use `mappers.ts`). The contract
  type allows any string, so this is a polish item rather than a
  breaking change.
- First caller of this seam (e.g. `projects-worker` checking
  `feature.custom_domains` before allowing a domain attach) is not part
  of this task — should be a separate PR that wires up the service
  binding and consumer-side gating.

## Task Document

`ai/tasks/task-0078.md`
