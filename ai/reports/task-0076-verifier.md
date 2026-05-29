# Task 0076 — Verifier Report

## Result: PASS

PR #119 (`impl/task-0076-billing-worker`) verified and merged via squash commit
`fb66ff5d7d134e8077fd5104bc8bbb9007d9bcd7` on 2026-05-29. Local `main` is
fast-forwarded; branch deleted on origin.

## Summary

Task 0076 ships the first billing runtime/API read surface on top of the Task
0075 billing foundation:

- New private `apps/billing-worker` with five org-scoped read routes
  (`plans`, `customer`, `summary`, `invoices`, `entitlements`).
- `apps/api-edge` billing facade routing those five routes to the new Worker
  via service binding.
- Membership-worker authorization-context + policy-worker `billing.read`
  authorization on every route. Fails closed to no-enumeration 404s.
- Same-environment service bindings stage→stage and prod→prod for
  `SOURCEPLANE_DB`, `MEMBERSHIP_WORKER`, `POLICY_WORKER`, `BILLING_WORKER`.
- `workers_dev: false` on billing-worker for dev/stage/prod.
- 24 billing-worker tests and 14 new api-edge billing-facade tests, all green.
- No mutations, no provider SDK, no payment credentials, no UI, no schema,
  no Queue/KV/DO/AE/Terraform churn.

## PR / CI Evidence

- PR: https://github.com/sourceplane/multi-tenant-saas/pull/119
- Head branch: `impl/task-0076-billing-worker` (deleted post-merge)
- Squash merge commit: `fb66ff5d7d134e8077fd5104bc8bbb9007d9bcd7`
- Original PR CI run `26611508443` — 27/27 jobs SUCCESS (before report commit).
- Post-report-commit PR CI run `26611795386` — 27/27 jobs SUCCESS, run
  conclusion `success`.
- Post-merge main CI run `26611960703` triggered on `fb66ff5` (queued at
  report time; verifier did not block on apply, but report-only commit changed
  no infrastructure so no migration/apply behavior changes are expected).
- Merge state at merge time: CLEAN.
- Verifier committed missing implementer report to PR branch (`4a353a5`) before
  merging, then re-ran CI to green per Verifier Standard.

## Checks Run

| Check | Result |
| --- | --- |
| `gh pr view 119` (state, mergeStateStatus, statusCheckRollup) | OPEN, CLEAN, 27/27 SUCCESS |
| Implementer report on PR branch | initially MISSING — committed and pushed (commit `4a353a5`), CI re-ran green |
| `gh pr diff 119 --name-only` (scope) | 30 files: billing-worker runtime+component+wrangler+package+tsconfig, api-edge billing-facade/env/index/wrangler/component, focused tests, pnpm-lock; no UI/schema/infra |
| `pnpm --filter @saas/billing-worker typecheck` | PASS |
| `pnpm --filter @saas/billing-worker build` (wrangler --dry-run) | PASS (147 KiB) |
| `pnpm --filter @saas/billing-worker-tests typecheck` | PASS |
| `pnpm --filter @saas/billing-worker-tests test` | 24/24 PASS |
| `pnpm --filter @saas/api-edge typecheck` | PASS |
| `pnpm --filter @saas/api-edge-tests typecheck` | PASS |
| `pnpm --filter @saas/api-edge-tests test -- billing` | 14/14 PASS |
| `kiox -- orun validate --intent intent.yaml` | PASS |
| `kiox -- orun plan --changed --intent intent.yaml` | 26 jobs across 10 components × 3 envs (matches CI matrix) |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | PASS (26/26 simulated) |
| `gh run view 26611508443` (CI logs) | All 27 jobs SUCCESS, including `plan`, `billing-worker-tests · dev · Verify`, `api-edge-tests · dev · Verify`, and stage/prod Verify deploy for billing-worker and api-edge |
| `gh run view 26611795386` (post-report CI) | All 27 jobs SUCCESS |

## Code Path Review

- `apps/billing-worker/src/router.ts` — pure path-regex matcher for the five
  read routes; `parseOrgPublicId` rejects malformed IDs early (returns 404
  via `notFound`); `GET`-only enforcement with 405 fallback; actor required
  via `x-actor-subject-id`/`x-actor-subject-type` headers (401 on absence).
- `apps/billing-worker/src/policy.ts` — `authorizeBillingRead` calls
  membership-worker authorization-context first, then policy-worker
  `billing.read`. Any negative result collapses to a generic 404 to avoid
  org enumeration. Missing service bindings collapse to 503 not 404.
- `apps/billing-worker/src/handlers/*.ts` — each handler validates query
  parameters (status/limit/cursor/source/subscriptionId) before authorization,
  then authorizes, then queries through `createBillingRepository` from
  Task 0075. No raw provider/secret data is exposed; mappers only emit
  contract-shaped public fields.
- `apps/billing-worker/src/mappers.ts` — maps internal billing records to
  the provider-neutral `@saas/contracts/billing` public types. Provider
  fields surface only as opaque IDs/URLs (already enforced as safe at the
  contract layer in Task 0075).
- `apps/billing-worker/src/membership-client.ts` and
  `policy-client.ts` — defensive JSON parsing, fail-closed on any error,
  no bearer token forwarding.
- `apps/api-edge/src/billing-facade.ts` — `isBillingRoute` matches only the
  five expected routes (verified to reject mutation-style and metering
  routes via tests). `handleBillingRoute` rejects non-GET (405), requires
  `IDENTITY_WORKER` and `BILLING_WORKER` bindings (503), resolves actor via
  `resolveActor` before forwarding, sets only `x-actor-*` and `x-request-id`
  + a small allowlist of forwarded headers (`content-type`, `traceparent`,
  `idempotency-key`). The `authorization` header is never copied into the
  downstream request. Query string and path are preserved; body is not
  forwarded for GET. Downstream errors collapse to 503 generic.

## Authorization and Tenant Isolation Review

- Single policy action used: `billing.read`. No other actions touched.
- Resource shape is `{ kind: "organization", orgId }` — organization-scoped,
  not project-scoped. Consistent with V1 billing customer boundary.
- Membership facts are fetched per-request from membership-worker; not cached
  in billing-worker state.
- Fail-closed pattern verified by tests:
  - membership-worker error → 404 not 5xx (no enumeration).
  - policy denial → 404 not 403 (no enumeration).
  - missing service bindings → 503 (legitimate misconfiguration signal,
    distinct from data-plane denial).
- api-edge resolves the actor (session token or API-key bearer) via identity
  before forwarding, and emits the canonical `x-actor-subject-id` /
  `x-actor-subject-type` headers used by Task 0048. Raw bearer tokens never
  cross the binding seam — confirmed by code and explicit test
  (`forwards GET to BILLING_WORKER with actor headers and search`).
- Repository accessors (Task 0075) are org-scoped on every cross-tenant
  sensitive path, so even an invariant break in policy would be defended
  in depth at the SQL layer.

## Deployment / Orun Wiring Review

- `apps/billing-worker/wrangler.jsonc`:
  - `workers_dev: false` at top level and for each env.
  - stage: `SOURCEPLANE_DB` Hyperdrive `08f7c6055f544a3890a585d88fd92348`
    (matches verified stage ID from Task 0057). Services
    `membership-worker-stage`, `policy-worker-stage`.
  - prod: `SOURCEPLANE_DB` Hyperdrive `ab2c21c2db6245a59c91588fcac7107a`
    (matches verified prod ID). Services `membership-worker-prod`,
    `policy-worker-prod`.
- `apps/billing-worker/component.yaml`: `dependsOn` includes
  `membership-worker` and `policy-worker`. Verify profile in dev/stage/prod,
  deploy profile in stage/prod on `github-push-main` trigger.
- `apps/api-edge/wrangler.jsonc`: `BILLING_WORKER` bound to
  `billing-worker-stage` (stage) and `billing-worker-prod` (prod). No dev
  Worker reference (matches no-dev-Supabase policy).
- `apps/api-edge/component.yaml`: `dependsOn` now includes `billing-worker`.
- Orun changed plan selects exactly the expected 26 jobs (10 components × 3
  envs, less the api-edge-tests/billing-worker-tests dev-only jobs). CI job
  matrix matches the local plan 1:1.

## Secret Handling Review

- No provider SDK or credentials added.
- No webhook secret or provider-specific signing logic.
- Authorization header never forwarded to billing-worker.
- Provider fields only surface as opaque references (provider name, provider
  customer/subscription/invoice IDs, hosted invoice URL). Contracts test from
  Task 0075 already enforces no plaintext/ciphertext fields exist on the
  public types.
- Logs/handlers do not echo SQL, stack traces, or actor identifiers in error
  responses — they emit canonical envelope shapes only (`internal_error`,
  `not_found`, `unauthenticated`, `validation_error`, `unsupported`).

## Issues

- Implementer report (`ai/reports/task-0076-implementer.md`) was not present
  on PR #119 head when verification started. Verifier committed and pushed it
  (commit `4a353a5`), then waited for the new PR CI run (`26611795386`) to
  return SUCCESS before merging. This is the same recurring miss documented
  in the verifier skill and prior task verifier reports — no code-level
  blocker introduced.
- No other issues.

## Risk Notes

- Provider integration is intentionally absent. The provider-neutral surface
  reads from the empty billing tables on stage/prod (no plans/customers/
  subscriptions/invoices/entitlements seeded yet). Real read coverage is
  exercised only by unit-level tests in this task. Follow-up tasks that add
  provider-driven mutation (Stripe customer/subscription writes, webhook
  ingestion) must:
  - keep webhook signing secret in Secrets Store, never in wrangler.jsonc;
  - not weaken the fail-closed 404 collapse pattern in `authorizeBillingRead`;
  - keep `organization.api_key`/`billing_admin` boundaries — `billing_admin`
    is intentionally not yet authorized for `billing.read` in
    `apps/policy-worker`, which the orchestrator should confirm before
    exposing billing UI to a `billing_admin`-only persona.
- `BILLING_WORKER` service binding only exists in stage/prod blocks of
  `apps/api-edge/wrangler.jsonc`. Local/dev api-edge will hit the 503
  "Billing service unavailable" branch — that is expected and matches
  config-worker’s pattern, but is worth noting for any future local-dev
  end-to-end harness work.

## Spec Proposals

None required. Implementation matches `specs/components/11-billing.md` V1
read-surface expectations and the provider-adapter boundary.

## Recommended Next Move

Task complete. Orchestrator should select the next billing surface task. Per
`specs/components/11-billing.md` sequencing, natural candidates are:

1. Billing read UI in web-console (consume the five new public routes).
2. `billing_admin` role wiring for `billing.read` in policy-worker (if the
   product expects a billing-only persona to access these routes — currently
   only `owner`/`admin` paths satisfy policy).
3. Provider-adapter scaffolding (Stripe customer/subscription read sync via
   a separate webhook-or-poll job — kept private and out of public surface).

Payment-provider mutation, checkout/portal sessions, and quota definitions
remain explicit non-goals until separate follow-up tasks scope them.

## PR Number

**#119** — https://github.com/sourceplane/multi-tenant-saas/pull/119
