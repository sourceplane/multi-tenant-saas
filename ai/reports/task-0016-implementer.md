# Task 0016 Implementer Report

## Summary

Added the first deployable Membership Worker runtime (`@saas/membership-worker`)
and exposed initial organization bootstrap/read routes through `api-edge` via the
`MEMBERSHIP_WORKER` service binding. An authenticated user can now:

- `POST /v1/organizations` — create an organization (becomes owner)
- `GET /v1/organizations` — list organizations for the current user
- `GET /v1/organizations/{orgId}` — read an organization the user belongs to

## Files Changed

### apps/membership-worker/ (new)
- `package.json` — workspace package with build/typecheck/lint/deploy/dev scripts
- `wrangler.jsonc` — Cloudflare Worker config with dev/stage/prod environments and
  Hyperdrive bindings for stage/prod
- `tsconfig.json` — extends shared worker config
- `eslint.config.js` — shared eslint config
- `component.yaml` — Orun `cloudflare-worker-turbo` component (verify in
  dev/stage/prod, deploy stage/prod on github-push-main)
- `src/index.ts` — entry point delegating to router
- `src/env.ts` — Env interface (SOURCEPLANE_DB, ENVIRONMENT)
- `src/router.ts` — route dispatcher, actor resolution from x-actor-* headers
- `src/http.ts` — response envelope helpers
- `src/ids.ts` — org_ public ID / UUID conversion
- `src/handlers/health.ts` — health check with database reachability
- `src/handlers/create-organization.ts` — POST /v1/organizations handler
- `src/handlers/list-organizations.ts` — GET /v1/organizations handler
- `src/handlers/get-organization.ts` — GET /v1/organizations/{orgId} handler
- `src/services/organization.ts` — testable organization service with
  injectable repository

### apps/api-edge/ (modified)
- `src/env.ts` — added MEMBERSHIP_WORKER?: Fetcher
- `src/index.ts` — added org route detection and delegation, membership binding
  health check
- `src/org-facade.ts` (new) — resolves session through IDENTITY_WORKER, extracts
  actor context, forwards to MEMBERSHIP_WORKER with x-actor-* headers (no raw
  bearer tokens forwarded)
- `wrangler.jsonc` — added MEMBERSHIP_WORKER service bindings (stage →
  membership-worker-stage, prod → membership-worker-prod)
- `scripts/verify-bindings.mjs` — extended to verify MEMBERSHIP_WORKER targets

### packages/contracts/ (modified)
- `src/membership.ts` (new) — PublicOrganization, Create/List/Get request/response
  types
- `src/index.ts` — re-exports membership
- `package.json` — added `./membership` export path

### tests/membership-worker/ (new)
- `package.json` — test package with jest ESM config
- `tsconfig.json` — type paths for test module resolution
- `eslint.config.js` — shared config
- `component.yaml` — Orun turbo-package component (dev quick-check)
- `src/membership-worker.test.ts` — 15 tests covering service logic, ID
  utilities, conflict handling, tenant isolation

### tests/api-edge/ (modified)
- `src/org-facade.test.ts` (new) — 23 tests covering session resolution, token
  forwarding, binding errors, header preservation, method enforcement,
  response passthrough, binding verification

## Membership Worker Behavior

- Receives requests from api-edge with resolved actor context in
  `x-actor-subject-id` and `x-actor-subject-type` headers
- Uses `@saas/db/hyperdrive` for SQL execution and `@saas/db/membership`
  repository for persistence
- Organization creation calls `bootstrapOrganization` (atomic CTE: org + member +
  owner role assignment)
- GET /v1/organizations/{orgId} checks active role assignments before returning
  org data — returns `not_found` for inaccessible orgs (no existence leakage)
- All IDs are UUIDs internally, `org_<hex>` at the API boundary

## Edge Routing Notes

- api-edge resolves the session by calling IDENTITY_WORKER's `/v1/auth/session`
  endpoint
- Only the resolved user ID and type are forwarded to membership — no raw bearer
  tokens
- Missing/failed identity resolution returns 401 unauthenticated
- Missing membership binding returns 503 with safe message
- x-request-id, traceparent, idempotency-key forwarded to membership
- POST body streamed through to membership

## Auth Context and Tenant Boundary

- The identity public user ID (e.g. `usr_<hex>`) is stored as membership
  `subjectId` with `subjectType: "user"`
- Organization access is guarded by active role assignments — no cross-tenant
  data leakage
- Policy Worker authorization is not implemented; the local "current actor
  has active role" guard suffices until the policy Worker exists

## Verification Results

```
✓ pnpm --filter @saas/membership-worker build
✓ pnpm --filter @saas/membership-worker typecheck
✓ pnpm --filter @saas/membership-worker lint
✓ pnpm --filter @saas/api-edge build
✓ pnpm --filter @saas/api-edge typecheck
✓ pnpm --filter @saas/api-edge lint
✓ pnpm --filter @saas/api-edge verify-bindings
✓ pnpm --filter @saas/contracts build
✓ pnpm --filter @saas/contracts typecheck
✓ pnpm --filter @saas/contracts lint
✓ pnpm --filter @saas/contracts-tests test (8 tests pass)
✓ pnpm --filter @saas/membership-worker-tests test (15 tests pass)
✓ pnpm --filter @saas/membership-worker-tests typecheck
✓ pnpm --filter @saas/membership-worker-tests lint
✓ pnpm --filter @saas/api-edge-tests test (53 tests pass)
✓ pnpm --filter @saas/api-edge-tests typecheck
✓ pnpm --filter @saas/api-edge-tests lint (warnings only, matching existing pattern)
```

## Wrangler Dry-Run Summary

| Worker | Env | Bindings | Result |
|--------|-----|----------|--------|
| membership-worker | dev | ENVIRONMENT=dev | ✓ dry-run pass |
| membership-worker | stage | SOURCEPLANE_DB (08f7c6...), ENVIRONMENT=stage | ✓ dry-run pass |
| membership-worker | prod | SOURCEPLANE_DB (ab2c21...), ENVIRONMENT=prod | ✓ dry-run pass |
| api-edge | stage | SOURCEPLANE_DB, IDENTITY_WORKER→identity-worker-stage, MEMBERSHIP_WORKER→membership-worker-stage | ✓ dry-run pass |
| api-edge | prod | SOURCEPLANE_DB, IDENTITY_WORKER→identity-worker-prod, MEMBERSHIP_WORKER→membership-worker-prod | ✓ dry-run pass |

## Orun Plan Summary

- `orun validate` passed
- `orun plan --changed` selected 5 components × 3 envs → 11 jobs:
  - api-edge (dev/stage/prod verify-deploy)
  - api-edge-tests (dev verify)
  - contracts (dev/stage/prod verify)
  - membership-worker (dev/stage/prod verify-deploy)
  - membership-worker-tests (dev verify)
- `orun run --dry-run --runner github-actions` completed all 11 jobs successfully
- PR CI is verify/dry-run only; github-push-main triggers deploy for stage/prod

## Security Notes

- **Bearer token handling:** api-edge resolves the session and only forwards the
  extracted user ID — raw tokens never reach membership-worker
- **Internal actor forwarding:** uses `x-actor-subject-id` /
  `x-actor-subject-type` headers on the internal service binding
- **Public Worker exposure:** membership-worker uses the default Wrangler shape
  without explicit `workers_dev` override. Cloudflare service bindings work
  regardless of workers.dev state. The Worker requires actor headers for all
  organization routes, so direct access without the edge facade returns 401.
- **ID mapping:** UUIDs stored in Postgres, `org_<hex>` exposed at API boundary.
  parseOrgPublicId rejects malformed IDs early.
- **Secret hygiene:** no connection strings, tokens, SQL errors, hostnames, or
  provider internals in any response. Health endpoint reports only
  configured/reachable booleans.
- **Error safety:** all catch blocks return generic messages. Repository error
  `internal` messages are not propagated to the API response.

## Assumptions

- Public organization IDs use `org_` + UUID hex (32 chars) matching the identity
  pattern (`usr_`, `ses_`, `chl_`)
- The identity session response's `user.id` field is the public user ID and is
  used directly as `subjectId` in membership
- api-edge does not need to parse/validate the user ID format — it passes it
  opaquely to membership
- Slug validation: 2-63 chars, lowercase alphanumeric and hyphens, must
  start/end with alphanumeric
- Durable idempotency storage is out of scope — Idempotency-Key is forwarded but
  not enforced

## Remaining Gaps

- **Invitation management routes** — create/list/revoke/accept invitations
- **Member administration** — remove members, update roles
- **Policy Worker** — role-to-action authorization decisions
- **Audit/events** — domain event emission for organization.created etc.
- **Durable idempotency** — Idempotency-Key header forwarded but not enforced
  with storage
- **Project behavior** — project Worker and API routes
- **Billing, notifications, webhooks** — future bounded contexts
- **Domain events** — constitution requires events for all mutations; not
  implemented in this slice

## PR

- **Number:** #57
- **URL:** https://github.com/sourceplane/multi-tenant-saas/pull/57
- **Branch:** codex/task-0016-membership-worker-org-runtime → main
- **Mergeable:** MERGEABLE
- **Draft:** false
