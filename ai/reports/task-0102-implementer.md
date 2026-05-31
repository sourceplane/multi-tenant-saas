# Task 0102 — Implementer Report

**Branch:** `impl/task-0102-sdk-environments-and-audit-iterator`
**Base:** `feat/cli-task-0101-write-and-cross-read-commands` (Task 0101 PR #155)
**Status:** Ready for verifier
**PR Number:** _(opened after report — see bottom)_

## Summary

- Added `EnvironmentsClient` to `@saas/sdk` (`list`/`get`/`create`/`archive`)
  wired onto `Sourceplane.environments`, mirroring `ProjectsClient`. All
  dynamic URL segments use `encodeURIComponent`; `create`/`archive`
  forward caller-supplied `RequestOptions.idempotencyKey` verbatim — SDK
  never auto-generates a key (Stripe parity preserved).
- Surfaced paginated audit reads at the SDK boundary via
  `EventsClient.iterAuditEntries` (async iterable, drives pages until
  `meta.cursor === null`, capped at `AUDIT_ITERATOR_MAX_PAGES = 1000`,
  aborts on a repeated cursor) plus a single-page primitive
  `EventsClient.listAuditEntriesPage` that exposes `{ entries, cursor }`.
  Both go through a new `Transport.requestWithEnvelope<T>()` helper that
  returns `{ data, meta: { requestId, cursor? } }` without breaking the
  existing `Transport.request<T>()` contract.
- Removed both Task 0101 `transport.*` workaround sites:
  `packages/cli/src/commands/writes.ts` `env create` now calls
  `sdk.environments.create(...)`; `packages/cli/src/commands/cross-reads.ts`
  `audit list` (single-page + `--all`) now drives
  `sdk.events.listAuditEntriesPage(...)`. The hand-rolled
  `AuditEnvelopePage` interface and the `fetchImpl`/auth-header construction
  are gone.
- Public CLI behavior is byte-identical: URL shapes, JSON envelope
  (`{ auditEntries, next_cursor }`), NDJSON `--all` output, human table
  columns and titles, idempotency-key forwarding, `--all` + `--cursor`
  validation. All 44 existing `writes-and-cross-reads.test.ts` it()s
  pass without edits.
- it() counts post-PR: SDK tests **89 passing** (was 70 pre-task, +19
  net: 11 environments + 8 events iterator); CLI tests **95 passing**
  (unchanged from Task 0101 — no test churn needed).

## Iterator Shape Decision

Chose **Option 1** from the proposal: a single async-iterable surface
`iterAuditEntries(orgId, query?, opts?): AsyncIterable<PublicAuditEntry>`.
Rationale:

- Lets the CLI default mode keep its single-page semantics (one fetch,
  return cursor + entries) via the companion `listAuditEntriesPage`.
- Keeps internal concerns out of the public surface: the page-cap
  constant + `seenCursors` Set + `requestWithEnvelope` driver are all
  encapsulated inside the iterator factory.
- `for await (const entry of iter)` is the obvious shape callers want
  for "give me every audit entry" (the `--all` case). For UI/CLI
  pagination that needs the cursor handle, callers use
  `listAuditEntriesPage` instead — exposing `cursor` without the
  iterator's auto-walk.

## Files Changed

**SDK environments client (NEW):**
- `packages/sdk/src/environments.ts` — `EnvironmentsClient` (list/get/create/archive).

**SDK events extension:**
- `packages/sdk/src/events.ts` — added `listAuditEntriesPage`,
  `iterAuditEntries`, `ListAuditEntriesQuery` (discriminated union by
  org / by target), `AUDIT_ITERATOR_MAX_PAGES = 1000`.

**SDK transport helper:**
- `packages/sdk/src/transport.ts` — added `requestWithEnvelope<T>()`,
  refactored shared work into a private `performRequest<T>` so
  `request<T>` is unchanged for existing callers (no breaking change).

**SDK index:**
- `packages/sdk/src/index.ts` — imported `EnvironmentsClient`, wired
  `client.environments`, exported `EnvironmentsClient`,
  `ListAuditEntriesQuery`, `AUDIT_ITERATOR_MAX_PAGES`, and the env
  contract types.

**SDK tests (NEW):**
- `packages/sdk/src/__tests__/environments.test.ts` — 11 it()s covering
  URL shape, `encodeURIComponent`, idempotency-key passthrough on
  create/archive, error surfacing.
- `packages/sdk/src/__tests__/events.test.ts` — 8 it()s covering
  multi-page traversal, single-page termination, query forwarding
  (by org + by target), repeated-cursor abort, mid-iteration network
  error propagation, page-cap export.

**CLI commands:**
- `packages/cli/src/commands/writes.ts` — `env create` now calls
  `sdk.environments.create(...)`. Inline transport workaround + inline
  response shape removed; comment updated.
- `packages/cli/src/commands/cross-reads.ts` — `audit list` (single-page
  + `--all`) now drives `sdk.events.listAuditEntriesPage(...)`. Removed
  `fetchAuditPage` helper, `AuditEnvelopePage` interface, `decodeError`
  + `Sourceplane` imports.

**No CLI test changes.** Existing tests assert public CLI behavior
(URL/method/headers/body verbatim via captured fetch, plus stdout
shape), all of which is unchanged by the SDK rewire.

**Lockfile:** unchanged.

## Checks Run

```
pnpm -r typecheck                → 41 successful, 41 total (0 errors)
pnpm -r lint                     → 35 successful, 35 total (0 errors,
                                   45 warnings — all in tests/api-edge,
                                   matches AC #6 baseline ≤ 45)
pnpm --filter @saas/sdk test     → 4 files, 89 tests passing
pnpm --filter @saas/cli test     → 7 files, 95 tests passing
pnpm -r build                    → 33 successful, 33 total
grep -RnE 'transport\.(request|fetchImpl)' packages/cli/src/commands
                                 → (empty — no matches)
```

Hazard scan: no new `crypto.randomUUID`, `Math.random` for ids, or
hand-rolled idempotency-key generation in `packages/sdk/src/**` or
`packages/cli/src/**`. The SDK iterator's loop guards rely on
deterministic Set membership of server-issued cursor strings, not
random tokens.

`orun validate / plan --changed / run --plan ... --dry-run`: not run
— this PR touches only TypeScript packages (`packages/sdk/**`,
`packages/cli/src/commands/**`); no Terraform components or
`infra/terraform/**` files in scope. The orun lane has nothing
changed to plan against.

Pre-existing test failure note: `tests/db` migration test
(`each migration declares a valid bounded context`) fails on `main`
unrelated to this PR (notifications context not in `VALID_CONTEXTS`
list). Confirmed identical failure on `main@ce63e01` with no Task 0102
changes applied.

## Assumptions

- Both Task 0101 spec proposals
  (`environments-client`, `audit-pagination`) are accepted by the
  orchestrator — this PR is the implementation. No further proposal
  document is required; the proposals are now closed.
- `Transport.requestWithEnvelope` is a non-breaking addition (existing
  `request<T>` keeps unwrapping `data`). Decision: did NOT remove or
  flip the unwrap default to keep the diff scoped and `resources.test.ts`
  unchanged.
- `archive` shipped on `EnvironmentsClient` even though no CLI command
  consumes it yet — the contracts type
  (`ArchiveEnvironmentResponse`) exists in `@saas/contracts/projects`
  and the api-edge route is live, so the SDK surface is complete for
  Task 0103.
- `ListAuditEntriesQuery` is exposed as a discriminated union
  (`by: "org"` vs `by: "target"`) so callers don't have to import
  contract internals; the SDK builds the query string accordingly.

## Spec Proposals

The two existing Task 0101 proposals
(`ai/proposals/task-0101-spec-update-environments-client.md` and
`ai/proposals/task-0101-spec-update-audit-pagination.md`) are
**closed by this PR** — both gaps are now implemented at the SDK
boundary and the CLI no longer carries workarounds.

No new gaps surfaced. The api-edge envelope shape
(`{ data, meta: { requestId, cursor? } }`) maps cleanly onto
`requestWithEnvelope`; no contract edits required.

## Remaining Gaps (Task 0103 candidates)

- Optional spec-13 commands not yet shipped: env list/get/archive,
  api-key list/revoke, webhook list/delete, project list/get/archive.
  All have typed SDK surfaces ready (Projects, Environments, Webhooks,
  ApiKeys clients exist).
- Console U10 routes still pending (`/orgs/.../audit`, etc.).
- SDK publishing (versioning + `npm publish` cadence).
- CLI shell completions for bash/zsh.
- CLI `--profile` flag (multi-environment auth context).

## Next Task Dependencies

None blocking. Track B4 closure decision belongs to the verifier per
the task brief.

## PR Number

PR #156 — opened from `impl/task-0102-sdk-environments-and-audit-iterator`
based on `feat/cli-task-0101-write-and-cross-read-commands` (Task 0101
PR #155 base).
