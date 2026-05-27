# Task 0023 — Verifier Report

## Result: PASS

## PR

- PR: #64
- Branch: `task-0023/events-audit-foundation`
- Merge commit: `de89408` (squash merge into `main`)
- Post-merge main CI run: `26379294370` — all green (9/9 jobs)
- PR CI run (final head with verifier fix): `26379248053` — all green (9/9 jobs)

## Verifier Fix

**UNION ALL column mismatch in `appendEventWithAudit`** — The original
implementation used `SELECT 'event' AS _row_type, e.* ... UNION ALL SELECT
'audit' AS _row_type, a.*` to return both event and audit rows. This is invalid
PostgreSQL because `events.event_log` has 22 columns and `events.audit_entries`
has 21 columns; UNION ALL requires identical column counts.

Fixed by replacing the UNION ALL with a single-row SELECT returning
`row_to_json(e.*) AS _event, row_to_json(a.*) AS _audit` via a `FULL JOIN` on
the two CTEs. The repository code now parses the JSON columns back into typed
objects. This preserves atomicity (CTE dependency chain) while producing a valid
single-row result regardless of column differences.

Updated test fixtures to match the new `{_event, _audit}` row shape.

## Checks

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/contracts typecheck` | pass |
| `pnpm --filter @saas/contracts-tests test` | pass (18 tests) |
| `pnpm --filter @saas/db typecheck` | pass |
| `pnpm --filter @saas/db build` | pass |
| `pnpm --filter @saas/db-tests test` | pass (222 tests, 10 suites) |
| `orun validate --intent intent.yaml` | pass |
| `orun plan --changed --intent intent.yaml` | 4 components x 3 envs → 8 jobs |
| `orun run --plan plan.json --dry-run --runner github-actions` | pass (8/8) |
| `git diff --check` | pass |
| Migration checksum verification | match (388aa634...) |
| PR CI run `26379248053` (post-fix head) | 9/9 pass |
| Post-merge main CI `26379294370` | 9/9 pass |

## Issues

- **UNION ALL column mismatch** — Fixed before merge (see above).
- **`membership.test.ts` TS2307** — Initial local run showed a transient
  failure. Confirmed this does NOT exist on `main` and does NOT reproduce
  consistently on the branch. Caused by stale ts-jest cache; subsequent runs
  pass all 222 tests including membership tests. Not a regression.

## Contract Review

- Event envelope fields match `specs/contracts/event-envelope.schema.yaml`:
  all required fields are required in TypeScript, actor type enum matches,
  tenant requires `orgId` with optional `projectId`/`environmentId`, trace
  requires `requestId`, payload is `Record<string, unknown>` (JSON-safe, no
  unsafe `any`).
- Audit entry and query types expose only domain-safe fields; no DB row coupling,
  platform clients, or implementation-only types.
- `packages/contracts/src/index.ts` exports `./events.js`.

## Migration Review

- `030_events_audit_core` ordered after `020_membership_core`, context `events`.
- Checksum `388aa634380200595ff3a3d15c638e696bf9b93e46330327e84ef10cec8a3f58`
  matches manifest.
- DDL is fully idempotent (`IF NOT EXISTS` throughout), no extensions required.
- Both tables include direct `org_id` column.
- Both tables include `project_id` and `environment_id` for future scoping.
- FK from `audit_entries.event_id` → `event_log.id` is same-context and
  migration-safe.
- Indexes: org+time, idempotency key, org+target, category filter — all present.
- JSON payload (`JSONB`) and redaction paths (`JSONB`) stored appropriately.
- Safe under autocommit: all CREATE statements are individually idempotent.

## Repository Review

- Imports only `SqlExecutor` seam and local types; no platform clients.
- All SQL is parameterized (`$1`, `$2`, etc.); no interpolation.
- Duplicate event IDs handled via `ON CONFLICT (id) DO NOTHING` + zero-row check.
- `appendEventWithAudit` atomicity: CTE chain ensures audit INSERT selects FROM
  `inserted_event`; if event conflicts (zero rows), audit SELECT returns nothing,
  both CTEs produce empty results, and repository returns conflict.
- UNION ALL risk: fixed to `row_to_json` approach (verified valid).
- Audit queries always scope by `org_id` first; target queries add `subject_kind`
  + `subject_id` within org scope.
- Cursor pagination uses `(occurred_at DESC, id DESC)` with `limit+1` detection.
- Cursor condition uses row-value comparison `(occurred_at, id) < ($N, $N+1)`.
- JSON payloads and redaction paths round-trip for both string and pre-parsed
  object values.

## Risk Notes

- No live Supabase inspection available locally. Migration application to
  stage/prod is confirmed via CI logs (`db · stage · Verify` and
  `db · prod · Verify` both passed in post-merge run `26379294370`).
- `SqlExecutor` still lacks explicit transaction control; CTE atomicity is
  the mechanism here and is correct for this use case.
- `queryAuditByOrg` does not currently filter by `category` even though the
  `AuditQueryByOrg` contract includes an optional `category` field and an index
  exists. This is a minor gap; the index exists for when category filtering is
  wired.

## Spec Proposals

None required.

## Recommended Next Move

- Wire existing membership/identity mutations to emit events through the new
  `appendEventWithAudit` seam.
- Add member removal and role-update routes (now unblocked by audit foundation).
- Add public `/v1/organizations/{orgId}/audit` read API using
  `queryAuditByOrg`/`queryAuditByTarget`.
- Consider adding `category` filter to `queryAuditByOrg` SQL.
