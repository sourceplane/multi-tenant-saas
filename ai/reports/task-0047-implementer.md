# Task 0047 — Implementer Report

## Task
Identity-owned persistence for API keys and service principals.

## Status: COMPLETE

## PR
https://github.com/sourceplane/multi-tenant-saas/pull/90
Branch: `codex/task-0047-api-key-service-principal-foundation`

## What Was Done

### Migration 060 (`packages/db/src/migrations/060_identity_api_keys/up.sql`)
- `identity.service_principals` table: UUID PK, org_id NOT NULL, optional project_id, name, description, status enum, timestamps
- `identity.api_keys` table: UUID PK, FK to service_principals, key_hash (SHA-256), key_prefix (4-12 chars), org_id (denormalized), name, scopes JSONB, expires_at, revoked_at, last_used_at, timestamps
- CHECK constraint: project_id requires org_id
- Indexes: org lookup, hash lookup, service_principal + status composite
- All idempotent (IF NOT EXISTS)

### Types (`packages/db/src/identity/types.ts`)
- `ServicePrincipal`, `ApiKey` interfaces
- `CreateServicePrincipalInput`, `CreateApiKeyInput` input types
- `ApiKeyPageQueryParams`, `ApiKeyPagedResult` for pagination
- 6 new methods on `IdentityRepository` interface

### Repository (`packages/db/src/identity/repository.ts`)
- `createServicePrincipal` — insert with conflict detection
- `getServicePrincipalById` — lookup by UUID
- `createApiKey` — insert with FK/conflict validation
- `getApiKeyByHash` — lookup by SHA-256 hash (for auth)
- `revokeApiKey` — soft-revoke via revoked_at timestamp
- `queryApiKeysByServicePrincipal` — paginated query with status filter
- `safeError()` helper strips sensitive data from error messages

### Manifest (`packages/db/src/manifest.ts`)
- Added migration 060 entry with checksum `834e71e...`

### Tests
- 16 migration schema validation tests (tables, columns, constraints, indexes)
- Comprehensive repository tests covering CRUD, conflict handling, not-found, revocation idempotency, pagination, secret safety

## Validation Results
- Typecheck: PASS
- Lint: PASS
- Tests: 351/351 PASS
- orun validate: PASS
- orun plan --changed: 6 jobs (db × 3 envs, db-migrate × 2, db-tests × 1)

## Design Decisions
1. **Hash-only storage**: API keys store SHA-256 hash + prefix, never raw material
2. **No cross-context FKs**: org_id, project_id, created_by are opaque UUIDs — no FK to membership/projects
3. **Denormalized org_id on api_keys**: enables efficient org-scoped queries without joining service_principals
4. **CHECK constraint**: project_id requires org_id (service principal scoped to project must belong to an org)
5. **safeError()**: all repository error paths strip potentially sensitive data before returning

## Files Changed
- `packages/db/src/migrations/060_identity_api_keys/up.sql` — NEW
- `packages/db/src/manifest.ts` — MODIFIED
- `packages/db/src/identity/types.ts` — MODIFIED
- `packages/db/src/identity/repository.ts` — MODIFIED
- `tests/db/src/identity-migration.test.ts` — MODIFIED
- `tests/db/src/identity.test.ts` — MODIFIED
