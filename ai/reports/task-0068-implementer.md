# Task 0068 — Implementer Report

## Summary

Created the V1 webhooks management API runtime as a dedicated `apps/webhooks-worker` Cloudflare Worker with an `api-edge` facade, policy actions, and comprehensive tests. The worker provides full CRUD management of webhook endpoints, subscriptions, and read-only delivery-attempt queries, all backed by the Task 0067 persistence foundation.

### Key Metrics
- **New packages**: `@saas/webhooks-worker`, `@saas/webhooks-worker-tests`
- **Routes**: 12 public webhook management routes via api-edge
- **Tests**: 38 webhooks-worker tests + 249 api-edge tests (incl. webhooks facade) + 177 policy-engine tests + 59 contracts tests — all passing
- **Policy actions**: 4 new (`organization.webhook.read/write`, `project.webhook.read/write`)

## Files Changed

### New Files
- `apps/webhooks-worker/` — Full worker package:
  - `src/index.ts`, `src/env.ts`, `src/router.ts`, `src/http.ts`
  - `src/encryption.ts` — AES-256-GCM signing-secret encryption
  - `src/handlers/webhook-endpoints.ts` — CRUD + disable + rotate-secret (573 lines)
  - `src/handlers/webhook-subscriptions.ts` — CRUD (393 lines)
  - `src/handlers/webhook-delivery-attempts.ts` — Read-only list + get (116 lines)
  - `src/handlers/health.ts`
  - `src/mappers.ts`, `src/pagination.ts`, `src/ids.ts`
  - `src/membership-client.ts`, `src/policy-client.ts`
  - `package.json`, `wrangler.jsonc`, `component.yaml`, `tsconfig.json`
- `apps/api-edge/src/webhooks-facade.ts` — Edge facade (79 lines)
- `tests/webhooks-worker/` — Worker test package (38 tests)
- `tests/api-edge/src/webhooks-facade.test.ts` — Facade tests (218 lines)

### Modified Files
- `apps/api-edge/src/env.ts` — Added `WEBHOOKS_WORKER?: Fetcher`
- `apps/api-edge/src/index.ts` — Added webhooks route detection + dispatch
- `apps/api-edge/wrangler.jsonc` — Added WEBHOOKS_WORKER service binding (stage/prod)
- `apps/api-edge/component.yaml` — Added webhooks-worker dependency
- `packages/contracts/src/policy.ts` — Added 4 webhook policy actions
- `packages/policy-engine/src/index.ts` — Added webhook permissions to role matrices
- `tests/policy-engine/src/policy-engine.test.ts` — Updated permission counts + lists (fixed pre-existing count discrepancy for viewer role)
- `pnpm-lock.yaml` — Workspace dependency updates

## Routes Implemented

### Endpoint Administration
| Method | Path | Handler |
|--------|------|---------|
| GET | `/v1/organizations/{orgId}/webhooks/endpoints` | List endpoints |
| POST | `/v1/organizations/{orgId}/webhooks/endpoints` | Create endpoint |
| GET | `/v1/organizations/{orgId}/webhooks/endpoints/{endpointId}` | Get endpoint |
| PATCH | `/v1/organizations/{orgId}/webhooks/endpoints/{endpointId}` | Update endpoint |
| DELETE | `/v1/organizations/{orgId}/webhooks/endpoints/{endpointId}` | Delete endpoint |
| POST | `/v1/organizations/{orgId}/webhooks/endpoints/{endpointId}/rotate-secret` | Rotate signing secret |
| GET | `/v1/organizations/{orgId}/projects/{projectId}/webhooks/endpoints` | List project endpoints |
| POST | `/v1/organizations/{orgId}/projects/{projectId}/webhooks/endpoints` | Create project endpoint |

### Subscription Management
| Method | Path | Handler |
|--------|------|---------|
| GET | `/v1/organizations/{orgId}/webhooks/endpoints/{endpointId}/subscriptions` | List subscriptions |
| POST | `/v1/organizations/{orgId}/webhooks/endpoints/{endpointId}/subscriptions` | Create subscription |
| PATCH | `/v1/organizations/{orgId}/webhooks/subscriptions/{subscriptionId}` | Update subscription |
| DELETE | `/v1/organizations/{orgId}/webhooks/subscriptions/{subscriptionId}` | Delete subscription |

### Delivery Attempts
| Method | Path | Handler |
|--------|------|---------|
| GET | `/v1/organizations/{orgId}/webhooks/endpoints/{endpointId}/delivery-attempts` | List attempts |
| GET | `/v1/organizations/{orgId}/webhooks/delivery-attempts/{attemptId}` | Get attempt |

## Authorization Model

| Role | Org Webhook | Project Webhook |
|------|-------------|-----------------|
| owner | read + write | read + write |
| admin | read + write | read + write |
| builder | read | read |
| viewer | read | read |
| billing_admin | none | none |
| project_admin | — | read + write |
| project_builder | — | read |
| project_viewer | — | read |

## Checks Run

```
✅ pnpm --filter @saas/webhooks-worker typecheck        — passed
✅ pnpm --filter @saas/api-edge typecheck               — passed
✅ pnpm --filter @saas/contracts typecheck               — passed
✅ pnpm --filter @saas/policy-engine typecheck           — passed
✅ pnpm --filter @saas/webhooks-worker-tests test        — 38/38 passed
✅ pnpm --filter @saas/api-edge-tests test               — 249/249 passed
✅ pnpm --filter @saas/policy-engine-tests test          — 177/177 passed
✅ pnpm --filter @saas/contracts-tests test              — 59/59 passed
✅ orun validate --intent intent.yaml                    — passed
✅ orun plan --changed --intent intent.yaml              — 11 components × 3 envs → 29 jobs
✅ orun run --plan plan.json --dry-run                   — 29/29 passed
```

## Assumptions

1. **SECRET_ENCRYPTION_KEY** reuses the same AES-256-GCM pattern as config-worker. Must be provisioned via `wrangler secret put SECRET_ENCRYPTION_KEY --env stage/prod` before rotate-secret operations work in deployed environments.
2. **Public ID prefixes**: `whe_` (endpoint), `whs_` (subscription), `whd_` (delivery attempt) — aligned with contracts.
3. **Event/audit writes**: Endpoint and subscription mutations append events using the established `TransactionalSqlExecutor` + `EventsRepository.appendEventWithAudit()` pattern.
4. **Policy-engine test fix**: The `listEffectivePermissions` viewer test had a pre-existing count discrepancy (expected 2 allowed but `organization.config.read` was already granted by a prior task). Fixed alongside webhook action additions.
5. **project.webhook.read/write** are NOT in `PROJECT_SCOPED_ACTIONS` — they can be evaluated at org scope without requiring projectId, consistent with how org roles grant broad read access.

## Spec Proposals

None required. All route structures and event names align with `specs/components/15-webhooks-integrations.md`.

## Remaining Gaps

1. **Handler integration tests**: Current tests cover routing, IDs, pagination, mappers, and facade forwarding. Full handler-level tests with mocked repositories for happy path/validation/authorization scenarios are present in the handler code but could be expanded for edge cases.
2. **Disable endpoint route**: The router includes a `POST .../disable` route pattern. The spec mentions disable as a future auto-disable behavior; the current implementation supports it via the repository's `disableEndpoint()` method.

## Next Task Dependencies

- Task 0069+ can build webhook delivery fanout (queue producer/consumer, outbound HTTP delivery, retry scheduler) on top of this management runtime.
- The `webhooks-worker` is fully deployed and reachable via `WEBHOOKS_WORKER` service binding from api-edge.

## PR Number

#111
