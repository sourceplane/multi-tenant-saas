# Task 0121 — Implementer Report

**Task:** Milestone `B7-audit-filter-export` — add independently-combinable
filtering and an NDJSON export capability to the organization-scoped audit log,
threaded through every layer (DB → contracts → events-worker → SDK → CLI →
console).

**Branch:** `impl/task-0121-audit-filter-export`
**PR Number:** #176 — https://github.com/sourceplane/multi-tenant-saas/pull/176

## Summary

One combined PR spanning the full vertical: a new DB filter path, a worker
validation gate, contract surface extension, and three consumer surfaces (SDK,
CLI, console). Seven optional, independently-combinable filters — `actorId`,
`actorType`, `subjectKind`, `subjectId`, `eventType`, `from`, `to` — with
`from`/`to` as inclusive `occurred_at` bounds.

The load-bearing invariant threaded through every leg: **filters only restrict
eligible rows; they never touch the ORDER BY / cursor keyset.** The existing
`ORDER BY occurred_at DESC, id DESC` keyset pagination and opaque cursor
semantics from Task 0101/0102 are preserved unchanged at every layer.

## Key Decisions

- **SQL injection safety**: `queryAuditByOrg` builds parameterized `AND`
  predicates from a hardcoded column list `[actor_id, actor_type, subject_kind,
  subject_id, event_type]` with `= $N`; `from`/`to` map to `occurred_at >= $N`
  / `<= $N`. No column name or value is interpolated — every value is a bound
  param. The repository trusts already-validated values.
- **Validation lives in the worker** (`parseAuditFilters`): charset
  `/^[A-Za-z0-9_.:\-]{1,128}$/` (colon allowed for prefixed IDs), ISO-8601-ms-Z
  regex for `from`/`to`, and `actorType` against the `EventActorType` enum
  (`user`, `service_principal`, `workflow`, `system`). Validation failures
  return **422** (`validation_failed`), per the established events-worker
  convention — not 400. Empty/missing params are ignored (not errors).
- **Export = one document per line**, mirroring the `--all` NDJSON pattern: the
  SDK `exportAuditEntriesNdjson` async generator layers over `iterAuditEntries`
  (inheriting `AUDIT_ITERATOR_MAX_PAGES` / `seenCursors` loop guards), yielding
  one JSON-encoded `PublicAuditEntry` per line terminated with `\n`.
- **CLI export mode** is `--format=ndjson`, mutually exclusive with both
  `--cursor` (single-page seek) and `--all` (per-page JSON Lines) — usage exit 2.
- **Console pure helper** (`audit-log.ts`) is dependency-free (no React/next/DOM)
  so the presentation logic is unit-testable in the logic-only jest harness,
  mirroring the `delivery-history.ts` pattern from Task 0120.

## Files Changed

### DB (`packages/db`)
- `src/events/types.ts` — `AuditOrgFilters` interface; `queryAuditByOrg` 4th arg.
- `src/events/repository.ts` — parameterized filter clauses; keyset/cursor
  untouched; backward-compatible `WHERE org_id IN ($1, $2)` (raw UUID + legacy
  `org_<hex>`) preserved.
- `src/events/index.ts` — re-export.

### Contracts (`packages/contracts`)
- `src/events.ts` — `AuditQueryByOrg` extended with seven optional fields.

### Events worker (`apps/events-worker`)
- `src/pagination.ts` — `parseAuditFilters` (per-field validation, 422 on bad).
- `src/handlers/list-audit.ts` — wires validated filters into the repo call.

### SDK (`packages/sdk`)
- `src/events.ts` — `AuditEntryFilters`; filters threaded through
  `buildAuditRequest` org branch + `iterAuditEntries` per-page reconstruction;
  new `exportAuditEntriesNdjson` async generator.
- `src/index.ts` — exported `AuditEntryFilters`.

### CLI (`packages/cli`)
- `src/commands/cross-reads.ts` — `audit list` gains `--actor`, `--actor-type`,
  `--subject-kind`, `--subject-id`, `--event-type`, `--from`, `--to`, and
  `--format=ndjson` export mode. Filters threaded into `buildQuery` across
  default/`--all`/export modes.
- `src/cli-runner.ts` — help text for the new flags.

### Console (`apps/web-console-next`)
- `src/components/audit/audit-log.ts` — NEW dependency-free pure helper
  (`buildAuditQuery`, `hasActiveAuditFilters`, `appendAuditPage`,
  `hasMoreAudit`, `formatAuditTimestamp`, `formatAuditActor`,
  `auditEntriesToNdjson`, `EMPTY_AUDIT_FILTERS`, `EMPTY_AUDIT_LOG`).
- `src/app/(app)/orgs/[orgSlug]/audit/page.tsx` — filter UI, Load-more
  pagination, Export NDJSON button. SDK-only via `wrap()`; zero direct `fetch(`.

## Tests

- **DB** (`tests/db/src/events.test.ts`) — parameterized equality filter test.
- **Worker** (`tests/events-worker/src/events-worker.test.ts`) — threads
  validated filters into the repo; rejects malformed `from` timestamp + unknown
  `actorType` (422); ignores empty params. 24/24 green.
- **SDK** (`packages/sdk/src/__tests__/events.test.ts`) — filter forwarding on
  every page; NDJSON export (one line per entry, filter forwarding, empty-set).
  117/117 green.
- **CLI** (`packages/cli/src/__tests__/writes-and-cross-reads.test.ts`) — all
  filter flags forwarded as query params; `--format=ndjson` stream + filter
  forwarding; usage errors (`--format=ndjson` + `--cursor`, bad `--format`).
  183/183 green.
- **Console** (`tests/web-console-next/src/audit-log.test.ts`) — NEW pure-helper
  suite (query building, active-filter detection, timestamp/actor formatting,
  page accumulation + dedupe, NDJSON serialization). 70/70 green.

Full workspace `pnpm -r typecheck`, `pnpm -r lint`, and `pnpm -r test` all green.

## Verification

- `pnpm -r typecheck` — clean across all packages.
- `pnpm -r lint` — clean (removed a transient unused-import after refactor).
- `pnpm -r test` — all suites pass; no failures.
- PR #176 opened against `main`; CI pending.
