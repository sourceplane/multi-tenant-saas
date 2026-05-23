# Task 0012 — Implementer Report

## Summary

Added the identity persistence foundation: a Worker-safe parameterized SQL
executor, the first identity-owned schema migration, and a typed repository
adapter that future identity Worker code can use without knowing about
Hyperdrive internals, Postgres.js, or raw SQL.

## PR Number

**53** — https://github.com/sourceplane/multi-tenant-saas/pull/53

Branch: `codex/task-0012-identity-persistence-foundation`

## Files Changed

### New Files
- `packages/db/src/hyperdrive/executor.ts` — Worker-safe parameterized SQL executor
- `packages/db/src/identity/types.ts` — Repository types, domain entities, error types
- `packages/db/src/identity/repository.ts` — Repository implementation
- `packages/db/src/identity/index.ts` — Subpath export barrel
- `packages/db/src/migrations/010_identity_core/up.sql` — Identity schema migration
- `tests/db/src/executor.test.ts` — SQL executor tests
- `tests/db/src/identity.test.ts` — Identity repository adapter tests
- `tests/db/src/identity-migration.test.ts` — Identity migration SQL validation tests

### Modified Files
- `packages/db/package.json` — Added `./identity` export
- `packages/db/src/hyperdrive/index.ts` — Re-exports executor types
- `packages/db/src/manifest.ts` — Added `010_identity_core` entry
- `infra/db-migrate/component.yaml` — Added `dependsOn: [component: db]`
- `tests/db/package.json` — Added identity moduleNameMapper
- `tests/db/tsconfig.json` — Added paths, disabled composite/incremental for tests

## Identity Migration Behavior

Migration `010_identity_core` (context: `identity`):
- Creates `identity` schema
- Creates `identity.users` with `email_lower` unique index for case-insensitive lookup
- Creates `identity.auth_identities` with unique (provider, subject) index
- Creates `identity.login_challenges` with `code_hash` (no raw codes stored)
- Creates `identity.sessions` with unique `token_hash` index (no raw tokens stored)
- All CREATE statements use IF NOT EXISTS for idempotent apply
- All foreign keys stay within the identity context
- No extensions required (no citext, pgcrypto, etc.)
- Checksum: `f8db63c83e2b1b29e6d0b9b133a7db490e2adcfdf26bfc6ce55c63c8a629075d`

## Repository Adapter Behavior

`@saas/db/identity` exports `createIdentityRepository(executor)` which provides:
- `createUser` / `getUserById` / `getUserByEmail`
- `createAuthIdentity` / `getAuthIdentityByProviderSubject`
- `createLoginChallenge` / `getLoginChallengeById` / `consumeLoginChallenge`
- `createSession` / `getSessionByTokenHash` / `revokeSession`

Design properties:
- All queries use parameterized SQL ($1, $2, ...) — no string interpolation
- Caller supplies IDs, timestamps, hashes — repository does not generate secrets
- Results are typed discriminated unions: `{ ok: true, value } | { ok: false, error }`
- Error kinds: `not_found`, `conflict`, `expired`, `already_consumed`, `internal`
- Internal errors use safe messages — never expose SQL errors, connection strings, or hashes
- ON CONFLICT DO NOTHING for idempotent inserts
- Consumed/revoked guards use WHERE clauses for atomic state transitions

## Orun Plan/Migration Apply Behavior

Changed plan (PR): `db` (dev/stage/prod Verify) + `db-tests` (dev Verify) + `db-migrate` (stage/prod Migrate)

- PR CI runs `db-migrate` in `plan` profile (read-only, no apply)
- Post-merge main push runs `db-migrate` in `apply` profile for stage and prod
- The `dependsOn: [component: db]` edge ensures `db-migrate` is selected whenever
  `packages/db/**` files change (including new migrations)

Post-merge verification:
- Query `_migrations.applied` for row: `id = '010_identity_core'`, `context = 'identity'`
- Verify `identity` schema exists in stage/prod with tables: `users`, `auth_identities`, `login_challenges`, `sessions`

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/db build` | ✓ |
| `pnpm --filter @saas/db typecheck` | ✓ |
| `pnpm --filter @saas/db lint` | ✓ |
| `pnpm --filter @saas/db-tests test` | ✓ (83 tests, 6 suites) |
| `pnpm --filter @saas/db-tests typecheck` | ✓ |
| `pnpm --filter @saas/db-tests lint` | ✓ |
| Worker-safe import isolation (rg) | ✓ (no node:/pg/@aws-sdk/runner in hyperdrive/identity) |
| `orun validate` | ✓ |
| `orun plan --changed` | ✓ (3 components × 3 envs → 6 jobs: db, db-tests, db-migrate) |
| `orun run --dry-run` | ✓ |
| `git diff --check` | ✓ |

## Secret Handling Notes

- No raw connection strings, tokens, codes, passwords, or API keys in source
- Migration stores only `code_hash` and `token_hash` columns
- Repository methods accept pre-hashed values — no crypto ownership in packages/db
- Error mapping never includes SQL error details, hostnames, or hash values
- Tests verify: no raw token/code values in repository outputs or thrown errors

## Assumptions

- The `dependsOn` relationship format `- component: db` is the correct Orun v2.3.0
  syntax for component-level dependency edges (validated locally)
- The existing `SupabaseApiAdapter` autocommit behavior is sufficient for the identity
  migration's IF NOT EXISTS idempotency guarantees
- Future identity Worker code will create its own `SqlExecutor` instance via
  `createSqlExecutor(env.HYPERDRIVE)` at request time

## Spec Proposals

None. The current architecture supports the identity persistence foundation
without spec changes.

## Remaining Gaps

- No dev environment migration apply (dev Supabase intentionally unprovisioned)
- The `db-tests` component subscribes only to `dev` environment; it cannot
  currently depend on `db-migrate` without environment mismatch (known from
  open-risks.md, deferred)
- Login challenges and sessions do not yet have cleanup/expiry background jobs

## Next Task Dependencies

Task 0012 unblocks:
- Identity Worker implementation (`apps/identity-worker`) with auth routes
- Passwordless login flow using the repository adapters
- Session resolution middleware consuming `getSessionByTokenHash`
