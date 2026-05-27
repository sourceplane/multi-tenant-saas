# Task 0012 — Verifier Report

## Result: PASS

## PR Review

- PR #53: https://github.com/sourceplane/multi-tenant-saas/pull/53
- Branch: `codex/task-0012-identity-persistence-foundation`
- Base: `main` at `9272a75f4b4813ef60d46e50edcaf4da062194bb`
- Final head commit (after verifier fix): `1f9495a`
- Merge commit: `088a7bd409542f8c26bb6bc625a9a67b6aac6e5f`
- State: merged at `2026-05-23T17:02:52Z`
- PR CI run: `26338124733` — all 7 checks green (after transient 401 rerun)
- Not draft, was mergeable, no generated artifacts committed

## Scope Review

PR #53 is strictly bounded to Task 0012:

- Worker-safe SQL executor (`packages/db/src/hyperdrive/executor.ts`)
- Identity migration `010_identity_core` (context: `identity`)
- Identity repository adapter (`@saas/db/identity`)
- Migration manifest update and checksum
- `dependsOn: [component: db]` on `db-migrate`
- Tests (85 tests, 6 suites)
- `ai/reports/task-0012-implementer.md`

Not included (verified absent): identity Worker, public auth routes, api-edge
changes, login/session behavior, API keys, organizations, membership, projects,
policy, billing, notifications, webhooks, UI, SDK, CLI, Terraform, Supabase
resources, Cloudflare resources, `specs-v2/**` work.

No generated/ignored artifacts committed: no `.orun/**`, `plan.json`, `dist/`,
`node_modules/`, `.wrangler/`, TypeScript build info.

## Migration Review

- Migration `010_identity_core` present in manifest, ordered after
  `000_control_baseline`, context `identity`.
- Checksum: `f8db63c83e2b1b29e6d0b9b133a7db490e2adcfdf26bfc6ce55c63c8a629075d`
- Creates `identity` schema with 4 tables:
  - `identity.users` — UUID PK, `email_lower` unique index
  - `identity.auth_identities` — UUID PK, unique (provider, subject) index
  - `identity.login_challenges` — UUID PK, `code_hash` column (no raw code)
  - `identity.sessions` — UUID PK, unique `token_hash` index (no raw token)
- All CREATE statements use IF NOT EXISTS — idempotent for autocommit runner
- No extensions required (no citext, pgcrypto)
- All foreign keys stay within identity context
- No cross-context foreign keys
- Schema uses UUID primary keys. The spec's public identity contract examples
  use opaque string IDs like `usr_123`. This is acceptable: the identity Worker
  (Task 0013+) will generate opaque string IDs that wrap UUIDs. The database
  column type `UUID` does not force an externally visible UUID format — it only
  constrains storage format. The identity Worker owns the public ID prefix
  mapping.
- Table/index/comment names are stable and do not collide with cross-schema
  objects.

## Repository Adapter Review

- `@saas/db/identity` is an explicit Worker-safe subpath export in
  `packages/db/package.json`.
- Default `@saas/db` exports remain Worker-safe — no Postgres.js, `pg`, AWS SDK,
  `node:*`, filesystem, or runner imports in `hyperdrive/` or `identity/`.
- Repository does not import API route handlers, Worker code, `api-edge`, or
  Node-only modules.
- All queries use parameterized SQL (`$1`, `$2`, etc.) — no string interpolation
  of untrusted input.
- Repository is persistence-oriented: accepts caller-generated IDs, timestamps,
  hashes. Does not own token generation, code generation, email delivery, or
  crypto.
- Results use discriminated union: `{ ok: true, value } | { ok: false, error }`.
- Errors are safe: `not_found`, `conflict`, `expired`, `already_consumed`,
  `internal` with generic messages. No SQL errors, connection strings, hostnames,
  or hashes in returned errors.
- **Verifier fix applied**: Removed `codeHash` from `LoginChallenge` output type
  and `tokenHash` from `Session` output type. Added `codeHash` to
  `consumeLoginChallenge` WHERE clause for atomic verification. This ensures no
  hash values cross the repository boundary in outputs.
- `getLoginChallengeById` and `getSessionByTokenHash` now use explicit column
  lists excluding hash columns.
- `consumeLoginChallenge` returns `already_consumed` for both missing challenges
  and already-consumed ones. This is acceptable at the repository layer — the
  identity Worker can call `getLoginChallengeById` first to distinguish
  not-found from already-consumed before attempting consumption.

## Executor Review

- `createSqlExecutor(binding)` accepts `{ connectionString: string }` which maps
  to the Hyperdrive binding's runtime connection string.
- Uses `postgres` (Postgres.js) library with `sql.unsafe(text, params)` — this
  is the correct parameterized query interface. `unsafe` means "not a tagged
  template" but still uses parameter binding via the `params` array. Parameters
  are never string-interpolated.
- `dispose()` is safe: swallows errors silently, calls `sql.end({ timeout: 3 })`.
- Connection string is only passed to the Postgres.js client constructor — never
  logged, returned, or exposed.
- Existing `createHyperdriveAdapter(...).ping()` behavior remains compatible —
  the executor is a separate export that coexists.
- `clientFactory` parameter allows test injection without live connections.

## Tests Review

Tests cover the required Task 0012 surface (85 tests, 6 suites):

- Parameterized query usage for all user/email/session/challenge lookups
- Successful row mapping
- Not-found behavior
- Conflict/duplicate behavior (unique violation, ON CONFLICT)
- Safe error mapping/redaction (SQL errors, connection strings, token hashes)
- No raw code/token values or hashes in repository outputs or errors
- Import isolation from runner-only modules
- Identity migration presence/order/checksum/context
- Identity schema/tables/indexes/secret-storage checks
- Project-scoped invariant applies only to `projects` context migrations
- PR CI does not require a live database for repository unit tests

## Orun And CI Review

- PR CI run `26338124733` (on final commit `1f9495a`):
  - 7 jobs: plan, db (dev/stage/prod Verify), db-tests (dev Verify),
    db-migrate (stage/prod Migrate)
  - All green after transient 401 retries
  - `db-migrate` on PR runs `plan` profile only (read-only, `cli.js plan`)
  - No live migration apply on pull request
- `dependsOn: [component: db]` is valid Orun v2.3.0 syntax (validated locally)
- Local Orun plan: 3 components × environments → 6 jobs
- Post-merge main plan: `db-migrate` stage/prod runs `apply` profile on
  `github-push-main` trigger
- The `dependsOn` edge ensures migration changes under `packages/db/**` select
  `db-migrate` without unsound ordering

## Merge Pipeline Evidence

- Post-merge main CI run: `26338527094`
- Head SHA: `088a7bd409542f8c26bb6bc625a9a67b6aac6e5f`
- Final status: `completed / success` (after transient 401 rerun)
- `db-migrate · stage · Migrate` (job `77536557206`):
  - Mode: `apply`
  - Applied: `010_identity_core`
  - Skipped: `000_control_baseline`
  - Duration: 29.6s
- `db-migrate · prod · Migrate` (job `77536681796`):
  - Mode: `apply`
  - Applied: `010_identity_core`
  - Skipped: `000_control_baseline`
  - Duration: 30.2s

## Live Database Evidence

### Stage (ref: `thielrrsejwhjkdluwqm`)

Query: `SELECT id, context, applied_at FROM _migrations.applied`

| id | context | applied_at |
|----|---------|------------|
| 000_control_baseline | control | 2026-05-21 13:45:08 |
| 010_identity_core | identity | 2026-05-23 17:04:36 |

Schema `identity` exists. Tables: `users`, `auth_identities`,
`login_challenges`, `sessions`.

Sensitive columns: `code_hash` (login_challenges), `token_hash` (sessions).
No raw token/code/password columns.

### Prod (ref: `npbvrxkrlyrpnhrqucxa`)

Query: `SELECT id, context, applied_at FROM _migrations.applied`

| id | context | applied_at |
|----|---------|------------|
| 000_control_baseline | control | 2026-05-21 13:45:55 |
| 010_identity_core | identity | 2026-05-23 17:11:58 |

Schema `identity` exists. Tables: `users`, `auth_identities`,
`login_challenges`, `sessions`.

Sensitive columns: `code_hash` (login_challenges), `token_hash` (sessions).
No raw token/code/password columns.

## Api Edge Health Evidence

```
GET https://api-edge-stage.rahulvarghesepullely.workers.dev/health
→ {"status":"ok","service":"api-edge","environment":"stage","timestamp":"2026-05-23T17:13:33.772Z","checks":{"database":{"configured":true,"reachable":true}}}

GET https://api-edge-prod.rahulvarghesepullely.workers.dev/health
→ {"status":"ok","service":"api-edge","environment":"prod","timestamp":"2026-05-23T17:13:34.044Z","checks":{"database":{"configured":true,"reachable":true}}}
```

Both stage and prod: database configured and reachable. Migration did not break
existing Worker connectivity.

## Secret Handling Review

- No raw connection strings, database passwords, Supabase API keys, Cloudflare
  API tokens, AWS credentials, raw login codes, raw bearer tokens, raw API keys,
  signing secrets, or encryption secrets committed, logged, or returned.
- Migration stores only `code_hash` and `token_hash` columns.
- Repository methods accept pre-hashed values — no crypto ownership in
  `packages/db`.
- **Verifier fix**: `codeHash` and `tokenHash` no longer appear in repository
  output types. Hashes are passed IN for lookup/verification but never come OUT.
- Error mapping never includes SQL error details, hostnames, or hash values.
- Tests verify: no raw token/code values or hashes in repository outputs or
  thrown errors.

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm --filter @saas/db build` | PASS |
| `pnpm --filter @saas/db typecheck` | PASS |
| `pnpm --filter @saas/db lint` | PASS |
| `pnpm --filter @saas/db-tests test` | PASS (85 tests, 6 suites) |
| `pnpm --filter @saas/db-tests typecheck` | PASS |
| `pnpm --filter @saas/db-tests lint` | PASS |
| Worker-safe import isolation (rg) | PASS (no forbidden imports) |
| `orun validate` | PASS |
| `orun plan --changed` | PASS (3 components, 6 jobs) |
| `orun run --dry-run` | PASS |
| `git diff --check` | PASS |
| PR CI (run 26338124733) | PASS (all 7 green) |
| Main CI (run 26338527094) | PASS (all green after rerun) |
| Stage live DB query | PASS |
| Prod live DB query | PASS |
| Stage health check | PASS |
| Prod health check | PASS |

## Issues

- Transient GitHub Actions 401 errors with `pnpm/action-setup@v4` resolution
  affected both PR CI and main CI runs. Required reruns. Not a code issue — this
  is a known GitHub infrastructure flake.

## Spec Proposals

None required. The UUID primary key choice is compatible with the identity
contract's opaque string ID format — the identity Worker will own the `usr_`
prefix mapping at the domain layer.

## Risk Notes

- The `consumeLoginChallenge` method returns `already_consumed` for both
  "challenge not found" and "challenge already consumed" cases. The identity
  Worker should call `getLoginChallengeById` first to distinguish these at the
  domain layer. This is acceptable at the repository layer.
- UUID primary keys are compatible with but not identical to the `usr_123` format
  in specs. The identity Worker will own the prefix/format mapping.
- GitHub Actions Node.js 20 deprecation warning is noted but not blocking.

## Recommended Next Move

Task 0013: Identity Worker implementation (`apps/identity-worker`) with public
auth routes using the repository adapters established by Task 0012.

## PR Number

**53** — merged as `088a7bd409542f8c26bb6bc625a9a67b6aac6e5f`
