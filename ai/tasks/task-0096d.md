# Task 0096d

Agent: Implementer

## Current Repo Context

- Track A (Task 0095.1) remains in flight on PR #143
  (`impl/task-0095-edge-idempotency-replay-store`, head `db00843`,
  CONFLICTING vs main). The implementer agent owes the rebase + Phase-5
  fix-up; the verifier prompt at `ai/tasks/task-0095.1-verifier.md` is
  sealed and waits. **This task (0096d) does NOT touch any file under
  `apps/api-edge/**`, `infra/terraform/cloudflare-kv/**`, or
  `tests/api-edge/**`** so it cannot collide with the Track A rebase.
- Track B wave 3 (Task 0096c) is in flight on
  `impl/task-0096c-tests-config-worker-class-b` — implementer prompt
  scoped, no PR open yet. **This task (0096d) does NOT touch any file
  under `tests/config-worker/**`** so it cannot collide with the Task
  0096c PR when it opens.
- This task is **wave 4 of the class-B warning cleanup** and consumes
  the next-largest residual `tests/**` workspace that is parallel-safe
  with both Track A and Task 0096c: `tests/identity-worker` —
  **80 / 277 warnings, all `@typescript-eslint/no-explicit-any`**, spread
  across 5 of the 8 source files in the workspace:
  `api-key-admin.test.ts` (33),
  `security-events.test.ts` (22),
  `profile.test.ts` (13),
  `login-start-notifications.test.ts` (8),
  `helpers/fake-repository.ts` (4).
  The remaining three source files — `auth-service.test.ts` (51 `it()`,
  0 anys), `envelope.test.ts` (8 `it()`, 0 anys), and
  `resolve-bearer.test.ts` (12 `it()`, 0 anys) — are already at 0 anys
  baseline and must NOT appear in the diff.
- Note: `tests/api-edge` (45 warnings) is the second-largest residual
  workspace by raw count but is **gated behind Track A's merge** because
  any concurrent edits there would collide with PR #143's rebase
  surface. `tests/identity-worker` is the natural wave-4 target.
- Deferred candidates (parked, do not touch): notifications-provider-swap;
  Task 0085b (`infra/terraform/cloudflare-domain/**` and the
  `cloudflare ~> 4.52` pin); notifications-worker-dev-reframe.

## Objective

Eliminate every `@typescript-eslint/no-explicit-any` warning inside
`tests/identity-worker/src` by replacing `any` with the narrowest
accurate type — preferring real shared types from `@saas/contracts`,
`@saas/db/*`, `apps/identity-worker/src/**` exported types, or
in-workspace fixture types — without changing test behaviour, without
introducing new `eslint-disable` / `@ts-ignore` / `@ts-expect-error` /
`as unknown as` escapes, and without modifying any production source.

This satisfies the user's explicit "apps source 0, then drain tests/**"
goal recorded after Tasks 0096 / 0096b / 0096c, and keeps the
orchestrator loop moving in parallel with Track A and Task 0096c.

## PR Boundary

In scope (one PR, one workspace):

1. Edits inside `tests/identity-worker/src/**/*.ts` only — including
   the non-test fixture helper `helpers/fake-repository.ts`.
2. New shared test-fixture types may be introduced inside the same
   workspace (e.g. `tests/identity-worker/src/_types.ts` or extending
   `tests/identity-worker/src/helpers/`) when they materially reduce
   duplication. Do not create a new shared package.
3. The implementer report at `ai/reports/task-0096d-implementer.md` (NEW).

Out of scope (hard non-goals):

- No edits under `apps/**`, `packages/**`, `infra/**`, `tooling/**`,
  `.github/**`, `specs/**`, `tests/<any-other-workspace>/**`.
- No edits to `tooling/eslint/index.js` — the rule stays at `warn` and
  the workspace config stays as-is.
- No `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, or
  `as unknown as` introductions in the diff. `as <RealType>` is acceptable
  when the call site genuinely needs a narrowing cast and the real type
  is provably a superset of the value.
- No changes to test assertions, fixture values, suite ordering, or
  `it()` titles. Behaviour-preserving refactor only.
- No upgrade of `@typescript-eslint/*` or related tooling.
- No touching of PR #143's surface (`apps/api-edge/**`,
  `infra/terraform/cloudflare-kv/**`, `tests/api-edge/**`).
- No touching of Task 0096c's surface (`tests/config-worker/**`).
- The three zero-baseline source files —
  `tests/identity-worker/src/auth-service.test.ts`,
  `tests/identity-worker/src/envelope.test.ts`, and
  `tests/identity-worker/src/resolve-bearer.test.ts` — must remain
  byte-identical vs `main` @ `b0bc233`.

## Read First

- `agents/orchestrator.md` § PR-Sized Task Standard, Implementer
  Standard.
- `ai/reports/task-0096b-implementer.md` and
  `ai/reports/task-0096b-verifier.md` — wave-2 precedent that PASSed
  cleanly.
- `ai/reports/task-0096c-implementer.md` (when present) — sibling
  wave 3 reference; may have already established repo-mock helper
  patterns worth mirroring.
- `tests/identity-worker/src/api-key-admin.test.ts` (33 anys, 15
  `it()`),
  `tests/identity-worker/src/security-events.test.ts` (22 anys, 17
  `it()`),
  `tests/identity-worker/src/profile.test.ts` (13 anys, 15 `it()`),
  `tests/identity-worker/src/login-start-notifications.test.ts` (8 anys,
  4 `it()`),
  `tests/identity-worker/src/helpers/fake-repository.ts` (4 anys,
  non-test fixture) — survey before editing to identify recurring `any`
  shapes (mock repo stand-ins, RPC-result envelopes, `await res.json()
  as any` JSON parses, fake-repository row types). Cluster fixes by
  shape.
- `apps/identity-worker/src/**` — for the **real** types of inputs /
  outputs / repo interfaces the tests are mocking. Prefer importing
  those over inventing new ones. Likely-relevant areas:
    * `apps/identity-worker/src/handlers/api-key/**` for the
      api-key-admin handler signatures.
    * `apps/identity-worker/src/handlers/profile/**` for profile shapes.
    * `apps/identity-worker/src/handlers/login-start.ts` (or similar)
      for login-start notification flow shapes.
    * `apps/identity-worker/src/handlers/security-events/**` for the
      audit/security-events flow.
- `packages/db/src/identity/types.ts` (and the wider `@saas/db/identity`
  barrel) — for row shapes used in the fake-repository helper and test
  fixtures.
- `packages/contracts/src/identity/**` (and the `@saas/contracts`
  barrel) — for the request/response contracts the worker exposes.
- `packages/db/src/events/types.ts` (`@saas/db/events`) — Task 0096b
  established that audit + event mock returns import
  `AppendEventWithAuditInput`, `StoredEvent`, `StoredAuditEntry` from
  here; reuse those imports if applicable in
  `security-events.test.ts`.
- `tooling/eslint/index.js` — confirms
  `@typescript-eslint/no-explicit-any` is at `warn`; this task does not
  flip the severity.

## Required Outcomes

- [ ] `pnpm --filter @saas/identity-worker-tests lint` exits 0 with
      **0 warnings** (was 80).
- [ ] `pnpm --filter @saas/identity-worker-tests test` passes — every
      test file in `tests/identity-worker/src` runs and produces the
      same green count and identical assertions as on `main` @
      `b0bc233`. Baseline = **7 suites / 122 tests**, with per-file
      `it()` counts: api-key-admin.test.ts = 15,
      auth-service.test.ts = 51, envelope.test.ts = 8,
      login-start-notifications.test.ts = 4, profile.test.ts = 15,
      resolve-bearer.test.ts = 12, security-events.test.ts = 17 (sum =
      122). Record before/after counts in the report.
- [ ] `pnpm -r typecheck` exits 0 (Task 0091 baseline holds — must not
      regress).
- [ ] `pnpm -r --no-bail lint` exits 0 with **≤ 197 residual warnings**
      (was 277 at orchestrator-scope time; if Task 0096c lands first it
      will further reduce by 126 to 71 expected residual — record
      whatever the actual residual is on the PR-head and confirm it is
      consistent with `tests/identity-worker` 80 → 0). Apps-source 0
      invariant from Task 0096 preserved.
- [ ] `git diff origin/main` shows files only under
      `tests/identity-worker/src/**` plus the single new
      `ai/reports/task-0096d-implementer.md`.
- [ ] No new `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, or
      `as unknown as` occurrences introduced by this PR (run
      `git diff origin/main -- 'tests/identity-worker/**' | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'`
      and confirm empty; record the command + empty result in the
      report).
- [ ] PR opened against `main` from a fresh branch
      `impl/task-0096d-tests-identity-worker-class-b`, with the report
      committed to the same branch and the real PR number written into
      the report (no `TBD` / `#[PR]` placeholders after the final push).

## Non-Goals

- Cleaning up other `tests/**` workspaces (`tests/config-worker` 126
  is Task 0096c's wave; `tests/api-edge` 45 is gated by Track A;
  `tests/projects-worker` 10, `tests/events-worker` 7,
  `tests/policy-engine` 7, `tests/policy-worker` 1,
  `tests/webhooks-worker` 1 are each future waves).
- Tightening the lint rule from `warn` to `error`.
- Refactoring production code, even when the test reveals an
  opportunity. (If a real bug surfaces, file a follow-up task — do not
  fold a fix into this PR.)
- Touching the Track A or Task 0096c surfaces (see PR Boundary).

## Constraints

1. Behaviour preservation is non-negotiable. If a narrowing forces a
   fixture to change, stop and stage that fixture change separately
   within the same PR with a one-line rationale in the report; never
   silently flip an assertion.
2. Prefer the *real* exported type from the worker / contracts / db
   packages over a handwritten fixture type. Fixture types
   (in-workspace `_types.ts` or under `helpers/`) are a fallback.
3. `as unknown as T` is forbidden in the diff. `as T` is acceptable only
   when the value is provably a superset of `T` at the call site (note
   in the report when used three or more times).
4. Do not introduce a new tsconfig, vitest config, or workspace-local
   tooling file.
5. Do not change test file names, suite ordering, or `it()` titles.
6. The three zero-baseline source files
   (`auth-service.test.ts`, `envelope.test.ts`,
   `resolve-bearer.test.ts`) must stay byte-identical vs `main` @
   `b0bc233`.

## Integration Notes

- The lint rule is configured globally at `tooling/eslint/index.js`
  (Task 0092 baseline) and is `warn` for
  `@typescript-eslint/no-explicit-any`. No config change is required.
- `tests/identity-worker` is a vitest workspace consuming
  `@saas/contracts`, `@saas/db/identity`, and worker-local imports;
  new imports from those packages / paths are the expected fix shape.
- `helpers/fake-repository.ts` is a non-test fixture file that ships
  4 of the 80 anys. Treat it as a typed in-memory test double — the
  real repository interface lives at
  `apps/identity-worker/src/repositories/**` (or wherever the
  identity-worker imports its repo contract from). Replace the 4 anys
  with the actual repo interface(s) so the fake stays a
  drop-in test double.
- Recurring `any` shapes you'll likely encounter (cluster the fix by
  shape, not by file):
    * **Repo mock stand-ins** —
      `{ getApiKeyById: (() => {}) as any }`, etc. The real repo
      interface is exposed by handler signatures in
      `apps/identity-worker/src/handlers/**` and the fake-repository
      helper itself. Build a typed `Partial<…>` mock helper rather
      than per-call `as any`.
    * **RPC-result envelopes** —
      `Promise.resolve({ ok: true, value: ... } as any)`. Type the
      resolved value, drop the `as any`.
    * **JSON parse stand-ins** —
      `await res.json() as any`. Type as the contract response from
      `@saas/contracts/identity` (or the smallest accurate response
      shape the test asserts on).
    * **Audit / security-event mock returns** — same pattern as Task
      0096b's `@saas/db/events` (`AppendEventWithAuditInput`,
      `StoredEvent`, `StoredAuditEntry`); reuse those imports in
      `security-events.test.ts`.
    * **Notification-client mock returns** — likely a
      `NotificationsClientContext`-shaped pattern for
      `login-start-notifications.test.ts`, mirroring the membership-worker
      precedent in Task 0096b's report.
- Cluster the fix by shape; avoid sprawling cross-file refactors. One
  helper file (`tests/identity-worker/src/_types.ts` or extending
  `helpers/`) is acceptable IF it materially deduplicates; otherwise
  keep types local to the test file.

## Acceptance Criteria

✅ `pnpm --filter @saas/identity-worker-tests lint` → exit 0,
   **0 warnings** (was 80).

✅ `pnpm --filter @saas/identity-worker-tests test` → exit 0, suite &
   test count UNCHANGED vs `main` @ `b0bc233` (7 suites / 122 tests;
   per-file `it()` counts unchanged: 15 / 51 / 8 / 4 / 15 / 12 / 17).
   Record both numbers in the implementer report.

✅ `pnpm -r typecheck` → exit 0 (Task 0091 baseline).

✅ `pnpm -r --no-bail lint` → exit 0, residual warnings ≤ 197 (or ≤ 71
   if Task 0096c has merged ahead of this PR), all in other `tests/**`
   workspaces (apps-source still 0 — Task 0096 invariant preserved).
   Record exact number on the PR head.

✅ `git diff origin/main --stat` shows files ONLY under
   `tests/identity-worker/src/**` plus
   `ai/reports/task-0096d-implementer.md`.

✅ Hazard scan empty:
   `git diff origin/main -- 'tests/identity-worker/**' | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'`
   → no output.

✅ Three zero-baseline files (`auth-service.test.ts`,
   `envelope.test.ts`, `resolve-bearer.test.ts`) byte-identical vs
   `main` @ `b0bc233`.

✅ PR opened: branch `impl/task-0096d-tests-identity-worker-class-b`,
   report committed, real PR number substituted before final push.

## Verification

The verifier (separate task, sealed at `ai/tasks/task-0096d-verifier.md`)
will:

- Confirm PR scope is exactly `tests/identity-worker/src/**` plus the
  report (no overreach).
- Re-run all four `pnpm` commands above on the PR head and confirm the
  numbers match.
- Re-run the hazard scan and confirm empty.
- Spot-check 10–15 fixed sites across the four modified test files +
  fake-repository helper against the underlying real types (worker
  handlers, db row types, contracts) to confirm narrowings are
  accurate, not cosmetic widenings.
- Confirm zero file overlap with PR #143 surface and Task 0096c's PR
  surface.
- Confirm `pnpm -r typecheck` and the workspace test suite remain green.
- On PASS, squash-merge, fast-forward `main`, watch the post-merge
  main-CI run for any test-only fallout (this task does not deploy
  anything, so a `plan`-only post-merge CI is expected).

## PR Creation Requirement

You must create branch `impl/task-0096d-tests-identity-worker-class-b`,
commit, push, and open a GitHub PR before reporting complete.
`PR Number: TBD` is **not** acceptable. After `gh pr create` returns the
real PR number, update `ai/reports/task-0096d-implementer.md` to
substitute the real number for any `#[PR]` / `TBD` placeholders, then
commit and push that final update on the same branch.

## When Done Report

Save to `ai/reports/task-0096d-implementer.md` with sections:

- Summary (3–5 bullets)
- Files Changed (grouped by source file, with per-file before/after
  warning counts: api-key-admin.test.ts 33 → 0,
  security-events.test.ts 22 → 0, profile.test.ts 13 → 0,
  login-start-notifications.test.ts 8 → 0,
  helpers/fake-repository.ts 4 → 0, plus any helper file added)
- Checks Run (exact commands + exit codes + warning/test counts)
- Hazard Scan (the grep command + empty result)
- Type Sources Used (which real types from `@saas/contracts` /
  `@saas/db/identity` / `@saas/db/events` / `apps/identity-worker`
  were imported, and any in-workspace `_types.ts` introduced and why)
- Assumptions (any narrowing that required a `as T` cast, with one-line
  justification each)
- Spec Proposals (none expected)
- Remaining Gaps (the still-warned `tests/**` workspaces and their
  counts, as a roadmap pointer for the next wave — expected residual
  if Task 0096c has merged: tests/api-edge 45 (Track-A-gated),
  tests/projects-worker 10, tests/events-worker 7,
  tests/policy-engine 7, tests/policy-worker 1,
  tests/webhooks-worker 1 = 71 total; if Task 0096c has not merged:
  tests/config-worker 126 + above = 197 total)
- Next Task Dependencies (none — Task 0097 rate-limiting remains
  independent and gated only on Track A; the next lint wave 0096e
  targets `tests/projects-worker` 10 if Track A still hasn't merged,
  or `tests/api-edge` 45 once Track A ships)
- PR Number (real GitHub PR number, never `TBD` on a completed report)
