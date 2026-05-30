# Task 0096b

Agent: Implementer

## Current Repo Context

- Track A (Task 0095.1) is in flight on PR #143 (`impl/task-0095-edge-idempotency-replay-store`,
  head `db00843`, currently CONFLICTING vs main). It is **the implementer's job** to rebase and
  push fix-up commits; the verifier prompt at `ai/tasks/task-0095.1-verifier.md` is sealed and
  waits for that. **This task (0096b) does not touch any file under `apps/api-edge/**`,
  `infra/terraform/cloudflare-kv/**`, or `tests/api-edge/**`** so it cannot collide with the
  Track A rebase.
- Track B (Task 0096) closed 2026-05-30: PR #144 squash-merged at `e9e432b`, post-merge main-CI
  `26675733754` 10/10 SUCCESS, console smoke unchanged on stage + prod. Apps source class-B
  warnings are now 0 across `config-worker / metering-worker / webhooks-worker`. Residual lint
  surface lives entirely in `tests/**`: 627 warnings across 9 test workspaces (verified by
  `pnpm -r --no-bail lint` on `main` @ `d2187f1`, 2026-05-30).
- This task is **wave 2 of class-B warning cleanup** and consumes the largest single concentration:
  `tests/membership-worker` — **350 / 627 warnings, all `@typescript-eslint/no-explicit-any`**,
  spread across 5 test files (`membership-worker.test.ts` 3637 LOC dominates; siblings
  `accept-invitation-notifications.test.ts`, `authorization-context.test.ts`,
  `create-invitation-notifications.test.ts`, `service-principal-bindings.test.ts`).
- Deferred candidates (parked, do not touch): notifications-provider-swap; Task 0085b
  (`infra/terraform/cloudflare-domain/**` and the `cloudflare ~> 4.52` pin); notifications-
  worker-dev-reframe.

## Objective

Eliminate every `@typescript-eslint/no-explicit-any` warning inside `tests/membership-worker/src`
by replacing `any` with the narrowest accurate type — preferring real shared types from
`@saas/contracts`, `@saas/db/*`, `apps/membership-worker/src/**` exported types, or domain-local
test fixture types — without changing test behaviour, without introducing new
`eslint-disable` / `@ts-ignore` / `@ts-expect-error` / `as unknown as` escapes, and without
modifying any production source.

This satisfies the user's explicit "apps source 0, then drain tests/**" goal recorded in the
state notes after Task 0096, and keeps the orchestrator loop moving while Track A waits on the
implementer.

## PR Boundary

In scope (one PR, one workspace):

1. Edits inside `tests/membership-worker/src/**/*.ts` only.
2. New shared test-fixture types may be introduced inside the same workspace
   (`tests/membership-worker/src/**/_types.ts` or similar) when they materially reduce
   duplication and improve clarity. Do not create a new shared package.
3. The implementer report at `ai/reports/task-0096b-implementer.md` (NEW).

Out of scope (hard non-goals):

- No edits under `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`,
  `infra/terraform/**`, `specs/**`, `tests/<any-other-workspace>/**`.
- No edits to `tooling/eslint/index.js` — the rule stays at `warn` and the workspace
  config stays as-is.
- No `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, or `as unknown as` introductions in
  the diff. `as <RealType>` is acceptable when the call site genuinely needs a narrowing cast
  and the real type is provably a superset of the value.
- No changes to test assertions, fixture values, or test ordering. Behaviour-preserving
  refactor only.
- No upgrade of `@typescript-eslint/*` or related tooling.
- No touching of PR #143's surface (`apps/api-edge/**`, `infra/terraform/cloudflare-kv/**`,
  `tests/api-edge/**`) so this PR cannot conflict with the Track A rebase.

## Read First

- `agents/orchestrator.md` § PR-Sized Task Standard, Implementer Standard.
- `ai/reports/task-0093-implementer.md` and `ai/reports/task-0096-implementer.md` — the wave-1
  precedent for class-B cleanup. **Match the discipline of Task 0096 exactly**: real shared
  types from `@saas/db/*` / `@saas/contracts` / app-exported types replace `any`, no escape
  hatches added, behaviour preserved.
- `tests/membership-worker/src/membership-worker.test.ts` (largest file, 3637 LOC, ~330 of the
  350 warnings) — survey before editing to identify recurring `any` shapes (mock contexts,
  RPC reply mocks, fetch response stand-ins, partial DB row stand-ins). Cluster fixes by shape.
- `apps/membership-worker/src/index.ts` and surrounding handlers — for the **real** types of the
  inputs/outputs the tests are mocking. Prefer importing those over inventing new ones.
- `packages/db/src/membership/types.ts` (and the wider `@saas/db/membership` barrel) — for row
  shapes used in test fixtures.
- `packages/contracts/src/membership/**` (and the `@saas/contracts` barrel) — for the
  request/response contracts the worker exposes.
- `tooling/eslint/index.js` — confirms `@typescript-eslint/no-explicit-any` is at `warn` and
  this task does not need to flip the severity.

## Required Outcomes

- [ ] `pnpm --filter tests/membership-worker lint` exits 0 with **0 warnings** (was 350).
- [ ] `pnpm --filter tests/membership-worker test` passes — every test file in
      `tests/membership-worker/src` runs and produces the same green count and identical assertions
      as on `main` @ `d2187f1` (record before/after suite + test counts in the report).
- [ ] `pnpm -r typecheck` exits 0 (Task 0091 baseline holds — must not regress).
- [ ] `pnpm -r --no-bail lint` exits 0 with **277 residual warnings**, all in `tests/**`
      *other* workspaces (was 627). Apps-source 0 invariant from Task 0096 preserved.
- [ ] `git diff origin/main` shows files only under `tests/membership-worker/src/**` plus the
      single new `ai/reports/task-0096b-implementer.md`.
- [ ] No new `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, or `as unknown as`
      occurrences introduced by this PR (run
      `git diff origin/main -- 'tests/membership-worker/**' | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'`
      and confirm empty; record the command + empty result in the report).
- [ ] PR opened against `main` from a fresh branch
      `impl/task-0096b-tests-membership-worker-class-b`, with the report committed to the same
      branch and the real PR number written into the report (no `TBD` / `#[PR]` placeholders
      after the final push).

## Non-Goals

- Cleaning up other `tests/**` workspaces (`tests/config-worker` 126, `tests/identity-worker`
  80, `tests/api-edge` 45, `tests/projects-worker` 10, `tests/policy-engine` 7,
  `tests/events-worker` 7, `tests/policy-worker` 1, `tests/webhooks-worker` 1 — each is a
  separate future wave).
- Tightening the lint rule from `warn` to `error`.
- Refactoring production code, even when the test reveals an opportunity.
- Touching the `apps/api-edge` / `cloudflare-kv` / `tests/api-edge` surface (Track A territory).

## Constraints

1. Behaviour preservation is non-negotiable. If a narrowing forces a fixture to change,
   stop and stage that fixture change separately within the same PR with a one-line rationale
   in the report; never silently flip an assertion.
2. Prefer the *real* exported type from the worker / contracts / db packages over a
   handwritten fixture type. Fixture types (in-workspace `_types.ts`) are a fallback.
3. `as unknown as T` is forbidden in the diff. `as T` is acceptable only when the value is
   provably a superset of `T` at the call site (note in the report when used twice or more).
4. Do not introduce a new tsconfig, vitest config, or workspace-local tooling file.
5. Do not change test file names, suite ordering, or `it()` titles.

## Integration Notes

- The lint rule is configured globally at `tooling/eslint/index.js` (Task 0092 baseline) and
  is `warn` for `@typescript-eslint/no-explicit-any`. No config change is required.
- `tests/membership-worker` is a vitest workspace consuming `@saas/contracts` and
  `@saas/db/membership` already; new imports from those packages are the expected fix shape.
- The five test files share clear domains:
    * `membership-worker.test.ts` — RPC handler tests (the bulk of warnings).
    * `accept-invitation-notifications.test.ts` / `create-invitation-notifications.test.ts` —
      notifications adapter wiring.
    * `authorization-context.test.ts` — authz context builder.
    * `service-principal-bindings.test.ts` — SP binding plumbing.
  Cluster the fix by file; avoid cross-file refactors that produce a sprawling diff.

## Acceptance Criteria

✅ `pnpm --filter tests/membership-worker lint` → exit 0, **0 warnings** (was 350).

✅ `pnpm --filter tests/membership-worker test` → exit 0, suite & test count UNCHANGED vs
   `main` @ `d2187f1` (record both numbers in the implementer report).

✅ `pnpm -r typecheck` → exit 0 (Task 0091 baseline).

✅ `pnpm -r --no-bail lint` → exit 0, **277 residual warnings**, all in `tests/**` (apps-source
   still 0, Task 0096 invariant preserved).

✅ `git diff origin/main --stat` shows files ONLY under `tests/membership-worker/src/**` plus
   `ai/reports/task-0096b-implementer.md`.

✅ Hazard scan empty:
   `git diff origin/main -- 'tests/membership-worker/**' | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'`
   → no output.

✅ PR opened: branch `impl/task-0096b-tests-membership-worker-class-b`, report committed,
   real PR number substituted before final push.

## Verification

The verifier (separate task, scoped after PR is open) will:

- Confirm PR scope is exactly `tests/membership-worker/src/**` plus the report (no overreach).
- Re-run all four `pnpm` commands above on the PR head and confirm the numbers match.
- Re-run the hazard scan and confirm empty.
- Spot-check 10–15 fixed sites in `membership-worker.test.ts` against the underlying real
  types (worker handlers, db row types, contracts) to confirm narrowings are accurate, not
  cosmetic widenings.
- Confirm zero file overlap with PR #143 surface.
- Confirm `pnpm -r typecheck` and the workspace test suite remain green.
- On PASS, squash-merge, fast-forward `main`, watch the post-merge main-CI run for any
  test-only fallout (this task does not deploy anything, so a `plan`-only post-merge CI is
  expected; the deploy-gated jobs from Task 0096 should remain unaffected by a tests-only
  diff).

## PR Creation Requirement

You must create branch `impl/task-0096b-tests-membership-worker-class-b`, commit, push, and
open a GitHub PR before reporting complete. `PR Number: TBD` is **not** acceptable. After
`gh pr create` returns the real PR number, update `ai/reports/task-0096b-implementer.md` to
substitute the real number for any `#[PR]` / `TBD` placeholders, then commit and push that
final update on the same branch.

## When Done Report

Save to `ai/reports/task-0096b-implementer.md` with sections:

- Summary (3–5 bullets)
- Files Changed (grouped by test file, with per-file before/after warning counts)
- Checks Run (exact commands + exit codes + warning/test counts)
- Hazard Scan (the grep command + empty result)
- Type Sources Used (which real types from `@saas/contracts` / `@saas/db/*` /
  `apps/membership-worker` were imported, and any in-workspace `_types.ts` introduced and why)
- Assumptions (any narrowing that required a `as T` cast, with one-line justification each)
- Spec Proposals (none expected)
- Remaining Gaps (the still-warned `tests/**` workspaces and their counts, as a roadmap pointer
  for the next wave)
- Next Task Dependencies (none — Task 0097 is independent and gated only on Track A)
- PR Number (real GitHub PR number, never `TBD` on a completed report)
