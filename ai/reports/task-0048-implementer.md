# Task 0048 — Implementer Report: API Key Bearer Resolution

**PR**: https://github.com/sourceplane/multi-tenant-saas/pull/91
**Branch**: `task-0048/api-key-bearer-resolution`
**Status**: Ready for review

## What Was Done

Added service_principal authentication via API keys across identity-worker and api-edge.

### Contract Layer
- `ActorContext` discriminated union on `actorType` ("user" | "service_principal")
- `BearerResolutionResponse` type for the resolve endpoint

### Identity Worker
- `resolveBearer()` in auth service: tries session token first (sps_ses_ prefix), falls back to SHA-256 hash lookup of API key. Validates key status, expiry, revocation, and resolves owning service principal.
- `GET /v1/auth/resolve` endpoint — new handler + route registration

### API Edge
- `resolveActor()` shared module replacing 3 separate `resolveSession()` implementations
- All facades (org, project, audit) refactored to use `resolveActor()`
- Forwards `x-actor-subject-id`, `x-actor-subject-type`, `x-actor-email`, `x-actor-org-id` headers downstream

### DB Barrel
- Exported `ApiKey`, `ServicePrincipal`, and related types from `@saas/db/identity`

### Tests
- 12 new resolveBearer tests covering session tokens, API keys (valid, inactive, revoked, expired, no-expiry), and edge cases
- Updated all api-edge test fixtures for new `/v1/auth/resolve` response shape
- Extended fake-repository with full API key / service principal support
- **All tests green**: 88 identity-worker, 193 api-edge, 13/13 turbo tasks

## Files Changed (15)
- `packages/contracts/src/auth.ts` — ActorContext, BearerResolutionResponse
- `packages/db/src/identity/index.ts` — barrel exports
- `apps/identity-worker/src/services/auth.ts` — resolveBearer
- `apps/identity-worker/src/handlers/resolve-bearer.ts` — NEW
- `apps/identity-worker/src/router.ts` — route
- `apps/api-edge/src/resolve-actor.ts` — NEW
- `apps/api-edge/src/org-facade.ts` — resolveActor
- `apps/api-edge/src/project-facade.ts` — resolveActor
- `apps/api-edge/src/audit-facade.ts` — resolveActor
- `apps/api-edge/src/auth-facade.ts` — route entry
- `tests/identity-worker/src/resolve-bearer.test.ts` — NEW (12 tests)
- `tests/identity-worker/src/helpers/fake-repository.ts` — SP/API key methods
- `tests/api-edge/src/org-facade.test.ts` — fixture updates
- `tests/api-edge/src/project-facade.test.ts` — fixture updates
- `tests/api-edge/src/audit-facade.test.ts` — fixture updates

## Design Decisions
1. **New endpoint** `/v1/auth/resolve` rather than modifying `/v1/auth/session` — backward compatible
2. **Session-first fallback** — resolveBearer tries session token, then API key hash
3. **Shared resolveActor()** — eliminates 3 duplicated resolveSession() implementations
4. **Email fallback** — for service_principal actors, email defaults to "" (downstream workers enforce requirements)
