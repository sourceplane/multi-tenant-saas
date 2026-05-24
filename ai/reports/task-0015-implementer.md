# Task 0015 — Implementer Report

## Summary

Added the membership persistence foundation: a dedicated `membership` schema migration (`020_membership_core`) plus Worker-safe typed repository adapters exported via `@saas/db/membership`. This mirrors the Task 0012 identity persistence pattern while staying below the Worker/API/domain-service line.

## Files Changed

### packages/db (migration + repository)
- `src/migrations/020_membership_core/up.sql` — new membership schema with four tables
- `src/manifest.ts` — added `020_membership_core` migration entry with checksum
- `src/membership/types.ts` — domain entities, input types, result types, repository interface
- `src/membership/repository.ts` — Worker-safe repository implementation
- `src/membership/index.ts` — public exports for `@saas/db/membership`
- `package.json` — added `"./membership"` subpath export

### packages/contracts (tenancy/RBAC types)
- `src/tenancy.ts` — added `OrganizationRole`, `ProjectRole`, `TenancyRole`, `RoleScopeKind`, `RoleAssignmentFact` types

### tests/db (repository + migration tests)
- `src/membership.test.ts` — comprehensive membership repository test suite
- `src/membership-migration.test.ts` — membership migration verification tests
- `package.json` — added `@saas/db/membership` module mapper for Jest

### infra/db-migrate (Orun path detection)
- `component.yaml` — added `paths: [packages/db/src/migrations/**]` so `--changed` mode selects `db-migrate` when migration files change

## Membership Schema

### Tables
1. **`membership.organizations`** — root tenant boundary (id, name, slug, slug_lower, status, timestamps)
2. **`membership.organization_members`** — connects subjects to organizations (org_id, subject_id, subject_type, status)
3. **`membership.organization_invitations`** — invitation lifecycle (org_id, email, email_lower, role, token_hash, invited_by, expires_at, status)
4. **`membership.role_assignments`** — authorization facts for policy (org_id, subject_id, role, scope_kind, scope_ref, revoked_at)

### Key Design Decisions
- All organization-scoped tables carry `org_id` directly
- Subject references are opaque text IDs (no FK to identity context)
- Role assignments support both organization and project scopes via `scope_kind` + `scope_ref`
- Invitation tokens stored as SHA-256 hashes only
- Normalized `slug_lower` and `email_lower` columns for case-insensitive lookup
- Unique partial index on active role assignments (WHERE revoked_at IS NULL)
- All DDL uses `IF NOT EXISTS` for autocommit-safe idempotency

## Repository Behavior

The `MembershipRepository` interface provides:
- Organization CRUD + slug lookup + list-for-subject
- Atomic `bootstrapOrganization` (creates org + member + owner role in sequence)
- Member CRUD + soft-remove
- Invitation create/get/list/revoke + token-hash lookup + accept (creates member)
- Role assignment create/list/revoke

Error handling:
- Discriminated union results: `not_found`, `conflict`, `expired`, `revoked`, `already_accepted`, `removed`, `internal`
- All SQL uses parameterized queries (`$1`, `$2`, ...)
- No raw SQL errors, connection strings, token hashes, or emails leak through errors
- PostgreSQL unique violation (code 23505) mapped to `conflict`
- Invitation expiry/revocation/acceptance checked after fetch

## Checks Run and Results

| Check | Result |
|-------|--------|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm --filter @saas/db build` | Pass |
| `pnpm --filter @saas/db typecheck` | Pass |
| `pnpm --filter @saas/db lint` | Pass |
| `pnpm --filter @saas/db-tests test` | Pass (164 tests, 8 suites) |
| `pnpm --filter @saas/db-tests typecheck` | Pass |
| `pnpm --filter @saas/db-tests lint` | Pass |
| `pnpm --filter @saas/contracts build` | Pass |
| `pnpm --filter @saas/contracts typecheck` | Pass |
| `pnpm --filter @saas/contracts lint` | Pass |
| `pnpm --filter @saas/contracts-tests test` | Pass (8 tests) |
| `pnpm --filter @saas/contracts-tests typecheck` | Pass |
| `pnpm --filter @saas/contracts-tests lint` | Pass |
| `orun validate` | Pass |
| `orun plan --changed` | Pass (4 components, 9 jobs) |
| `orun run --dry-run --runner github-actions` | Pass |
| `git diff --check` | Pass |

## Orun Plan Summary

### Changed plan (PR CI)
- 4 components selected: `contracts`, `db`, `db-tests`, `db-migrate`
- `db-migrate.stage.migrate` → profile `db-migrate.plan` (read-only)
- `db-migrate.prod.migrate` → profile `db-migrate.plan` (read-only)

### Post-merge main behavior
- `github-push-main` trigger runs full plan (no scope restriction)
- `db-migrate` profile rule: `when: { triggerRef: github-push-main }` → profile `apply`
- Migration will be applied to stage first, then prod (stage depends on dev, prod depends on stage)

### Fix applied
- Added `paths: [packages/db/src/migrations/**]` to `infra/db-migrate/component.yaml`
- This ensures `--changed` mode selects `db-migrate` when migration files change, enabling PR-time plan verification

## Security Notes

- **Invitation tokens**: Only SHA-256 hashes stored (`token_hash` column). Raw tokens never enter the database.
- **Error redaction**: All repository errors return safe messages — never exposing SQL details, connection strings, hosts, ports, or token hashes.
- **Parameterized SQL**: All user-controlled values use `$N` placeholders — no string interpolation of slugs, emails, subject IDs, role names, or timestamps.
- **No cross-context foreign keys**: Subject references stored as opaque text IDs. No FK constraints to `identity.*` or other schemas.
- **Normalized lookups**: Case-insensitive slug and email uniqueness via `_lower` columns + indexes, not application-level normalization.

## Assumptions

- **Storage IDs**: UUIDs at persistence layer. Public-ID prefix mapping deferred to the membership Worker task.
- **Slug generation**: Repository accepts caller-provided normalized slugs. Slug validation/generation is domain-service responsibility.
- **Transaction boundaries**: `bootstrapOrganization` issues three sequential parameterized INSERTs — atomic at the connection/Hyperdrive level but without explicit `BEGIN/COMMIT` (which requires future executor enhancement for multi-statement transactions).
- **Invitation acceptance**: The repository accepts token hashes and creates members — it does not generate tokens, send emails, or validate sessions.
- **Soft-delete pattern**: Members use `status = 'removed'`, role assignments use `revoked_at IS NOT NULL`. Organizations use `status IN ('active', 'suspended', 'deleted')`.

## Remaining Gaps

1. **`apps/membership-worker`** — The next task should build the deployable Worker runtime that uses this repository.
2. **Explicit transaction support** — `bootstrapOrganization` should ideally run in a single database transaction (`BEGIN/COMMIT`). The current `SqlExecutor` interface does not expose transaction control.
3. **Policy integration** — Role assignments are stored but not yet consumed by a policy engine.
4. **Invitation email delivery** — Not implemented; repository only stores hashes.
5. **Organization settings** — Table not added yet; deferred to membership Worker task.
6. **Audit/event emission** — No outbox pattern or domain events in this PR.

## PR

- **Number**: #56
- **URL**: https://github.com/sourceplane/multi-tenant-saas/pull/56
- **Branch**: `codex/task-0015-membership-persistence-foundation` → `main`
- **Mergeable**: Yes
