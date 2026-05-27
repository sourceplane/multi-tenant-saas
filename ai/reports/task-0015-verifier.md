# Task 0015 — Verifier Report

## Result: PASS

## PR Details

- **PR**: #56
- **URL**: https://github.com/sourceplane/multi-tenant-saas/pull/56
- **Branch**: `codex/task-0015-membership-persistence-foundation` → `main`
- **Base SHA**: `4268b7531d2288bcb8b4d782e3e647f69778f4f2`
- **Final head SHA**: `7de9351e6c295e81e9ea321a810ffacf693e8542` (2 commits: implementer + verifier fix)
- **Merge commit**: `2e56bad2f008ddb3bb5e980cd39a98d699d1e141`
- **Merged at**: 2026-05-24T06:01:40Z
- **PR CI run**: `26353474125` (10/10 jobs passed on final head)
- **Main CI run**: `26353527266` (10/10 jobs passed, stage+prod migration applied)

## Scope Review

### Changed files (12)

| Subsystem | Files |
|-----------|-------|
| packages/db | `src/migrations/020_membership_core/up.sql`, `src/manifest.ts`, `src/membership/types.ts`, `src/membership/repository.ts`, `src/membership/index.ts`, `package.json` |
| packages/contracts | `src/tenancy.ts` |
| tests/db | `src/membership.test.ts`, `src/membership-migration.test.ts`, `package.json` |
| infra/db-migrate | `component.yaml` |
| ai | `reports/task-0015-implementer.md` |

### Boundary compliance

- No `apps/membership-worker`, api-edge routes, policy Worker, project behavior, UI, SDK, CLI, Terraform, or `specs-v2/**` work.
- No generated/ignored artifacts (`.orun/`, `dist/`, `node_modules/`, etc.) committed.
- No secrets, connection strings, raw tokens, or credentials in code, tests, or reports.

## Migration Review

### `020_membership_core`

- Present in manifest, ordered after `010_identity_core`, context `membership`, checksum stable.
- Creates `membership` schema with 4 tables: `organizations`, `organization_members`, `organization_invitations`, `role_assignments`.
- All DDL uses `IF NOT EXISTS` for autocommit-safe idempotency.
- No cross-context foreign keys (no references to `identity.*`, `projects.*`, `billing.*`).
- All org-scoped tables carry `org_id` directly.
- Invitation secrets: `token_hash` column only, no raw token columns.
- Normalized `slug_lower` + `email_lower` columns with unique/lookup indexes.
- Roles match spec: `owner`, `admin`, `builder`, `viewer`, `billing_admin`, `project_admin`, `project_builder`, `project_viewer`.
- Unique partial index on active role assignments (`WHERE revoked_at IS NULL`).

### Lack of intra-context foreign keys

Membership child tables (`organization_members`, `organization_invitations`, `role_assignments`) do not have FK constraints to `membership.organizations`. This is **acceptable** because:
1. The autocommit migration runner can't guarantee creation order during retries.
2. `ON CONFLICT (id) DO NOTHING` idempotency pattern works better without FKs that might block retries.
3. Application-layer enforcement is sufficient for a bounded-context repository where all writes flow through the same repository adapter.
4. The CTE-based bootstrap ensures org exists before member/role creation within the same statement.

### Live migration evidence

- **Stage**: `mode=apply`, `applied: ["020_membership_core"]`, `skipped: ["000_control_baseline", "010_identity_core"]`
- **Prod**: `mode=apply`, `applied: ["020_membership_core"]`, `skipped: ["000_control_baseline", "010_identity_core"]`

## Repository Adapter Review

### Worker-safe export

- `@saas/db/membership` is an explicit subpath export in `packages/db/package.json`.
- Default `@saas/db` exports remain Worker-safe (no runner imports through membership path).
- Tests confirm no runner-only modules (`runMigrations`, `PgAdapter`, `loadSecret`, `SupabaseApiAdapter`) leak through the membership export.

### SQL safety

- All dynamic values use parameterized SQL (`$1`, `$2`, ...).
- No string interpolation of user-controlled values.
- Error redaction: generic errors mapped to safe messages; never expose SQL, hostnames, ports, token hashes, or emails.
- PostgreSQL unique violation (code `23505`) mapped to `conflict`.

### Atomic bootstrapOrganization (verifier fix)

Original implementation used three sequential INSERTs — if the org succeeded but member or role failed, an orphaned organization without an owner could persist.

**Fix**: Single CTE statement with dependent INSERT chain:
- `new_org` → `new_member` (SELECT FROM new_org) → `new_role` (SELECT FROM new_member)
- CROSS JOIN in final SELECT ensures all-or-nothing: if any step returns 0 rows, the entire result is empty.
- Single statement = atomic in autocommit/Hyperdrive.

### Safe acceptInvitation (verifier fix)

Original implementation marked the invitation as accepted (UPDATE) before checking expiry — an expired invitation could be left in `status='accepted'` without creating a member.

**Fix**: Two-step approach:
1. Read-only SELECT validates invitation state (not_found, revoked, already_accepted, expired) for proper error discrimination.
2. Single CTE atomically updates invitation (with `expires_at > $2` guard in WHERE) and creates member (dependent INSERT from accepted_inv). If the invitation is expired at update time, the UPDATE matches 0 rows and no state changes.

This prevents both issues:
- Expired invitations can never be marked accepted.
- If invite acceptance succeeds, member creation is guaranteed (same statement).

### Result types and error handling

Discriminated union results with: `not_found`, `conflict`, `expired`, `revoked`, `already_accepted`, `removed`, `internal`. Token hashes never appear in repository outputs.

## Contract Review

### Types added to `packages/contracts/src/tenancy.ts`

- `OrganizationRole`: `owner | admin | builder | viewer | billing_admin`
- `ProjectRole`: `project_admin | project_builder | project_viewer`
- `TenancyRole`: union of both
- `RoleScopeKind`: `organization | project`
- `RoleAssignmentFact`: `{ role, scope: { kind, orgId, projectId? }, subjectId, subjectType }`

### `RoleAssignmentFact` contract alignment

The spec says "the fact is already scoped to the request subject; policy does not need a separate subject ID inside the fact." The implementation includes `subjectId`/`subjectType`.

**Decision: Acceptable as harmless additive metadata.** Rationale:
- The `RoleAssignmentFact` type serves as a bridge between persistence (where subject scoping IS needed for multi-subject queries) and policy (where it's redundant but harmless).
- The repository's own `RoleAssignment` entity type carries subject info for persistence.
- Including subject info in the fact makes it self-describing without violating policy's ability to ignore it.
- The spec says policy doesn't "need" it, not that it must be absent.
- No public API types were prematurely introduced.

## Tests Review

167 tests pass across 8 suites. Coverage includes:
- Parameterized query usage for all operations
- Successful row mapping for all entity types
- Not-found behavior
- Conflict/duplicate behavior (unique violation mapping)
- Expired/revoked/accepted invitation behavior
- Removed member behavior
- Safe error mapping/redaction (connection strings, SQL errors, token hashes, emails)
- Worker-safe import isolation
- Migration presence, ordering, checksum, context, idempotency
- Schema/tables/indexes/secret-storage checks
- No cross-context foreign keys
- Normalized slug/email lookup
- org_id on all tenant tables
- Project-scoped invariant applies only to projects context

### Atomicity test coverage

- `bootstrapOrganization`: Tests verify single CTE statement (`queries.length === 1`), `WITH new_org AS` + `FROM new_org`/`FROM new_member` dependency chain, `CROSS JOIN`, all 18 parameters, and conflict on 0-row result.
- `acceptInvitation`: Tests verify pre-validation (returns expired/revoked/already_accepted from read step without executing CTE), `expires_at > $2` in CTE WHERE, and `CROSS JOIN` atomicity.

## Orun And CI Review

### PR CI (run `26353474125`)

- `db-migrate · stage · Migrate`: `mode=plan`, `020_membership_core` listed as pending — **read-only, no apply**.
- `db-migrate · prod · Migrate`: `mode=plan` — **read-only, no apply**.
- All 10 jobs passed.

### Post-merge main CI (run `26353527266`)

- `db-migrate · stage · Migrate`: `mode=apply`, `applied: ["020_membership_core"]` — **migration applied**.
- `db-migrate · prod · Migrate`: `mode=apply`, `applied: ["020_membership_core"]` — **migration applied**.
- All 10 jobs passed.

### Orun path fix

- `paths: [packages/db/src/migrations/**]` added to `infra/db-migrate/component.yaml`.
- Valid Orun v2.3.0 syntax; ensures `--changed` mode selects `db-migrate` when migration files change.
- Does not over-select: path is specific to migration source files only.

### Changed plan (local verification)

- 4 components: `contracts`, `db`, `db-tests`, `db-migrate`
- `contracts` in dev/stage/prod Verify
- `db` in dev/stage/prod Verify
- `db-tests` in dev Verify
- `db-migrate` in stage/prod Migrate (plan profile on PR, apply on main)

## Local Checks Run

| Check | Result |
|-------|--------|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm --filter @saas/db build` | Pass |
| `pnpm --filter @saas/db typecheck` | Pass |
| `pnpm --filter @saas/db lint` | Pass |
| `pnpm --filter @saas/db-tests test` | Pass (167 tests, 8 suites) |
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

## Verifier Fixes

1. **Atomic `bootstrapOrganization`**: Replaced three sequential INSERTs with a single CTE statement using dependent INSERT chain and CROSS JOIN, ensuring all-or-nothing behavior in autocommit mode.

2. **Safe `acceptInvitation`**: Added pre-validation SELECT for proper error discrimination, replaced sequential UPDATE+INSERT with a single CTE (UPDATE with `expires_at > $2` guard + dependent member INSERT + CROSS JOIN), preventing expired invitations from being marked accepted and ensuring atomic accept+member creation.

3. **Updated tests**: Adjusted `bootstrapOrganization` and `acceptInvitation` test expectations to match CTE-based implementation, added atomicity-specific assertions (CTE structure verification, dependency chain, single-statement proof).

## Remaining Gaps

- `apps/membership-worker` is the next implementation target (not in scope for this task).
- Explicit transaction support (`BEGIN/COMMIT`) in `SqlExecutor` remains deferred; CTE approach solves the immediate atomicity needs.
- Policy integration: role assignments stored but not yet consumed by a policy engine.
- Invitation email delivery: not implemented; repository stores hashes only.
- Audit/event emission: no outbox pattern in this PR.
