# Task 0053 — Implementer Report

## Status: COMPLETE

## PR
https://github.com/sourceplane/multi-tenant-saas/pull/96

## Branch
`codex/task-0053-account-profile-api`

## What Was Done

### Contracts (`packages/contracts/src/auth.ts`)
- Added `ProfileResponse` interface (user id, email, displayName)
- Added `UpdateProfileRequest` interface (displayName: string | null)

### Repository Layer (`packages/db/src/identity/`)
- Added `UpdateUserProfileInput` type to `types.ts`
- Added `updateUserProfile` method to `IdentityRepository` interface
- Implemented SQL update in `repository.ts`
- Added to fake repository for tests
- Exported `UpdateUserProfileInput` from package index

### Auth Service (`apps/identity-worker/src/services/auth.ts`)
- `getProfile(token)` — reuses `getSession` (same user shape)
- `updateProfile(token, input)` — validates session, rejects non-session tokens, resolves user UUID, updates via repo, records `user.profile.updated` security event

### Handler (`apps/identity-worker/src/handlers/profile.ts`)
- GET: returns user profile from session token
- PATCH: validates displayName (string|null, max 120 chars, empty→null), rejects unsupported fields, rejects API keys with 403

### Router (`apps/identity-worker/src/router.ts`)
- Wired `/v1/auth/profile` accepting GET and PATCH

### API Edge Facade (`apps/api-edge/src/auth-facade.ts`)
- Added `AUTH_MULTI_METHOD_ROUTES` map for routes accepting multiple methods
- Updated `isAuthRoute` to check both maps
- Updated `handleAuthRoute` to validate against allowed method sets
- Extended body forwarding to include PATCH alongside POST

### IDs (`apps/identity-worker/src/ids.ts`)
- Added `parseUserPublicId` helper (mirrors existing `parseChallengePublicId` pattern)

### Specs (`specs/components/02-identity.md`)
- Documented GET/PATCH `/v1/auth/profile` routes

### Tests
- `tests/identity-worker/src/profile.test.ts` — 17 tests covering auth, CRUD, validation, security events, envelope
- `tests/api-edge/src/auth-facade.test.ts` — 4 new tests for profile route forwarding

## Test Results
- Identity worker: 118/118 passed
- API edge: 204/204 passed

## Files Changed (13)
1. `specs/components/02-identity.md`
2. `packages/contracts/src/auth.ts`
3. `packages/db/src/identity/types.ts`
4. `packages/db/src/identity/repository.ts`
5. `packages/db/src/identity/index.ts`
6. `apps/identity-worker/src/ids.ts`
7. `apps/identity-worker/src/services/auth.ts`
8. `apps/identity-worker/src/handlers/profile.ts` (new)
9. `apps/identity-worker/src/router.ts`
10. `apps/api-edge/src/auth-facade.ts`
11. `tests/identity-worker/src/helpers/fake-repository.ts`
12. `tests/identity-worker/src/profile.test.ts` (new)
13. `tests/api-edge/src/auth-facade.test.ts`
