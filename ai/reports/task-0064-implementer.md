# Task 0064 — Implementer Report

## PR
https://github.com/sourceplane/multi-tenant-saas/pull/107

## Branch
`impl/task-0064-secret-metadata-mutations`

## Summary
Implemented secret metadata create, rotate, and revoke mutation handlers in config-worker. Wired routes in router. Updated api-edge facade to forward secret item routes including DELETE. Added comprehensive tests.

## Files Changed (10 files, +1539/-14)

### New Files
| File | Purpose |
|------|---------|
| `apps/config-worker/src/handlers/create-secret.ts` | Create handler: KEY_RE validation, material guard, db create, event emit |
| `apps/config-worker/src/handlers/rotate-secret.ts` | Rotate handler: fetch existing, scope match, db rotate, event emit |
| `apps/config-worker/src/handlers/revoke-secret.ts` | Revoke handler: fetch existing, scope match, db revoke, event emit |
| `tests/config-worker/src/secret-mutation-handlers.test.ts` | 39 tests: handlers + router integration |

### Modified Files
| File | Change |
|------|--------|
| `apps/config-worker/src/ids.ts` | Added `parseSecretMetadataPublicId` (sec_ prefix) |
| `apps/config-worker/src/router.ts` | Added secret item routes (POST rotate, DELETE revoke, POST create) |
| `packages/contracts/src/config.ts` | Added Create/Rotate/Revoke request/response types |
| `apps/api-edge/src/config-facade.ts` | Extended route matching + allowed DELETE method |
| `tests/api-edge/src/config-facade.test.ts` | 7 new tests for secret routes + DELETE forwarding |
| `tests/config-worker/src/mutation-handlers.test.ts` | Updated POST-to-secrets expectation (503 not 405) |

## Route Design

| Method | Route Pattern | Handler |
|--------|--------------|---------|
| POST | `.../config/secrets` | createSecret |
| POST | `.../config/secrets/{id}/rotate` | rotateSecret |
| DELETE | `.../config/secrets/{id}` | revokeSecret |

All routes support org, project, and environment scope levels.

## Security
- All handlers reject secret material fields in request body (value, plaintext, secret, ciphertext, hash, token, password, credential)
- Audit events contain only metadata (operation, scope, key) — no secret material
- Response bodies use toPublicSecretMetadata mapper — no internal fields exposed
- Auth follows existing pattern: fetchAuthorizationContext → authorizeViaPolicy

## Test Results
- config-worker: 145/145 passed (39 new)
- api-edge: 230/230 passed (7 new)
- TypeScript typecheck: clean

## Status: COMPLETE
