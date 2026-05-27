# Task 0043 — Implementer Report

## Summary

Added identity-owned security-event source persistence foundation:
migration `050_identity_security_events`, repository types, repository
methods with cursor pagination, and focused tests. This creates the
durable persistence seam for pre-organization user-scoped security
history, unblocking identity-worker runtime event recording.

## Files Changed

| File | Change |
|------|--------|
| `packages/db/src/migrations/050_identity_security_events/up.sql` | New migration — `identity.security_events` table with UUID PK, event type/outcome, nullable user/session/challenge IDs, trace fields, IP, user agent, JSONB metadata/redact_paths, three indexes |
| `packages/db/src/identity/types.ts` | Added `SecurityEvent`, `CreateSecurityEventInput`, `SecurityEventCursorPosition`, `SecurityEventPageQueryParams`, `SecurityEventPagedResult` types; extended `IdentityRepository` interface |
| `packages/db/src/identity/repository.ts` | Added `mapSecurityEvent` mapper, `recordSecurityEvent` (parameterized INSERT with JSON serialization), `querySecurityEventsByUser` (cursor pagination with `(occurred_at DESC, id DESC)` and limit+1 pattern) |
| `packages/db/src/identity/index.ts` | Exported new types |
| `packages/db/src/manifest.ts` | Added `050_identity_security_events` entry with SHA256 checksum |
| `tests/db/src/identity-migration.test.ts` | Added `050_identity_security_events` schema validation block: table/column existence, no secret columns, idempotency, no cross-context FKs, index verification, UUID PK, JSONB fields |
| `tests/db/src/identity.test.ts` | Added `recordSecurityEvent` tests (parameterized SQL, row mapping, JSON serialization/parsing, nullable defaults, conflict, safe errors, no secret leakage), `querySecurityEventsByUser` tests (pagination, cursor filtering, ordering, nextCursor behavior), and `security event secret safety` tests |

## Checks Run

| Command | Result |
|---------|--------|
| `pnpm --filter @saas/db typecheck` | Pass |
| `pnpm --filter @saas/db-tests test` | 310 tests pass, 11 suites |
| `kiox -- orun validate --intent intent.yaml` | Valid |
| `kiox -- orun plan --changed --intent intent.yaml --output plan.json` | 3 components (db, db-tests, db-migrate) × 3 envs → 6 jobs |
| `kiox -- orun plan --intent intent.yaml --view dag` | 25 components × 3 envs → 53 jobs |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | 6 jobs preview OK |

## Plan/DAG Impact

Changed-plan correctly selects:
- `db` — verify (dev → stage → prod)
- `db-tests` — quick-check (dev)
- `db-migrate` — plan/apply (stage → prod)

Migration-file changes trigger `db-migrate` stage/prod apply jobs on
`github-push-main` per Task 0029 watch rules.

## Database Migration Notes

- Migration `050_identity_security_events` adds `identity.security_events`
  table under the existing `identity` schema (schema already created by
  `010_identity_core`).
- No `org_id` column — events are user-scoped and may exist before
  organization context.
- No cross-context foreign keys. `user_id`, `session_id`, `challenge_id`
  are opaque UUID references without REFERENCES constraints.
- Three indexes: `(user_id, occurred_at DESC, id DESC)` for cursor
  pagination, `(event_type, occurred_at DESC)` for type queries,
  `(request_id)` filtered for trace lookups.
- Fully idempotent (IF NOT EXISTS on table and all indexes).
- No raw secret columns: no code, token, bearer_token, token_hash,
  code_hash, api_key, or secret columns.

## Assumptions

1. The `identity` schema already exists from `010_identity_core` and
   does not need to be re-created in `050`.
2. `user_id` is nullable to support pre-authentication events (e.g.,
   `login.started` before the user is identified).
3. `session_id` and `challenge_id` are opaque references without FKs
   to keep bounded-context extraction clean.
4. JSONB metadata may contain any domain-specific payload; the
   `redact_paths` field carries compliance redaction pointers matching
   the shared event envelope pattern.
5. Cursor pagination uses `(occurred_at DESC, id DESC)` ordering,
   consistent with the events repository pattern.

## Spec Proposals

None required. The implementation aligns with the existing identity
and event specs without behavioral changes.

## Remaining Gaps

- Identity-worker runtime event recording (login/start, login/complete,
  session/create, session/revoke, logout) is not yet implemented.
- No public `GET /v1/auth/security-events` route or api-edge forwarding.
- No web-console security-event UI.
- No org-scoped audit copies (identity will emit org-scoped
  event+audit records only when organization context exists, in a
  follow-up task).
- Post-merge migration apply to stage and prod requires CI/verifier
  confirmation.

## Next Task Dependencies

- Identity-worker login/session/logout security-event recording can
  now use `recordSecurityEvent` from the identity repository.
- Public security-event query route can use
  `querySecurityEventsByUser` once api-edge forwarding is wired.
- Org-scoped audit copy emission depends on this persistence seam
  plus the transactional event wiring from Task 0024.

## PR Number

PR #86 — https://github.com/sourceplane/multi-tenant-saas/pull/86
