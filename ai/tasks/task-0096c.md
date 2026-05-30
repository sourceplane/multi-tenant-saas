# Task 0096c

Agent: Implementer

## Current Repo Context

- Track A (Task 0095.1) remains in flight on PR #143
  (`impl/task-0095-edge-idempotency-replay-store`, head `db00843`,
  CONFLICTING vs main). The implementer agent owes the rebase + Phase-5
  fix-up; the verifier prompt at `ai/tasks/task-0095.1-verifier.md` is
  sealed and waits. **This task (0096c) does NOT touch any file under
  `apps/api-edge/**`, `infra/terraform/cloudflare-kv/**`, or
  `tests/api-edge/**`** so it cannot collide with the Track A rebase.
- Track B wave 2 (Task 0096b) closed 2026-05-30: PR #145 squash-merged at
  `6b738c0`, post-merge main-CI `26677189951` 2/2 SUCCESS, 350
  `@typescript-eslint/no-explicit-any` warnings in
  `tests/membership-worker` → 0. Apps-source class-B invariant from Task
  0096 still holds (apps source 0). Global `pnpm -r --no-bail lint`
  residual is **277 warnings, all in `tests/**`**.
- This task is **wave 3 of the class-B warning cleanup** and consumes the
  largest remaining single workspace: `tests/config-worker` —
  **126 / 277 warnings, all `@typescript-eslint/no-explicit-any`**, spread
  across 3 of the 5 test files: `mutation-handlers.test.ts` (47),
  `secret-mutation-handlers.test.ts` (43),
  `encrypted-secret-storage.test.ts` (36). `config-worker.test.ts` and
  `deployment-config.test.ts` are already at 0 anys.
- Deferred candidates (parked, do not touch): notifications-provider-swap;
  Task 0085b (`infra/terraform/cloudflare-domain/**` and the
  `cloudflare ~> 4.52` pin); notifications-worker-dev-reframe.

## Objective

Eliminate every `@typescript-eslint/no-explicit-any` warning inside
`tests/config-worker/src` by replacing `any` with the narrowest accurate
type — preferring real shared types from `@saas/contracts`, `@saas/db/*`,
`apps/config-worker/src/**` exported types, or in-workspace fixture
types — without changing test behaviour, without introducing new
`eslint-disable` / `@ts-ignore` / `@ts-expect-error` / `as unknown as`
escapes, and without modifying any production source.

This satisfies the user's explicit "apps source 0, then drain tests/**"
goal recorded after Tasks 0096 / 0096b, and keeps the orchestrator loop
moving while Track A waits on its implementer.

## PR Boundary

In scope (one PR, one workspace):

1. Edits inside `tests/config-worker/src/**/*.ts` only.
2. New shared test-fixture types may be introduced inside the same
   workspace (`tests/config-worker/src/**/_types.ts` or similar) when
   they materially reduce duplication and improve clarity. Do not create
   a new shared package.
3. The implementer report at `ai/reports/task-0096c-implementer.md` (NEW).

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
  `infra/terraform/cloudflare-kv/**`, `tests/api-edge/**`) so this PR
  cannot conflict with the Track A rebase.

## Read First

- `agents/orchestrator.md` § PR-Sized Task Standard, Implementer Standard.
- `ai/reports/task-0096b-implementer.md` and
  `ai/reports/task-0096b-verifier.md` — the wave-2 precedent. **Match
  the discipline of Task 0096b exactly**: real shared types from
  `@saas/db/*` / `@saas/contracts` / app-exported types replace `any`,
  no escape hatches added, behaviour preserved, suite + test count
  parity.
- `tests/config-worker/src/mutation-handlers.test.ts` (47 anys),
  `tests/config-worker/src/secret-mutation-handlers.test.ts` (43),
  `tests/config-worker/src/encrypted-secret-storage.test.ts` (36) —
  survey before editing to identify recurring `any` shapes (mock repo
  stand-ins like `{ createSetting: (() => {}) as any }`, RPC-result
  envelopes like `{ ok: true, value: ... } as any`, `await res.json() as
  any` JSON parses, and similar). Cluster fixes by shape.
- `apps/config-worker/src/handlers/{create,update}-setting.ts`,
  `apps/config-worker/src/handlers/{create,update}-feature-flag.ts`,
  and the secret-storage / mutation handlers under
  `apps/config-worker/src/**` — for the **real** types of the inputs /
  outputs / repo interfaces the tests are mocking. Prefer importing
  those over inventing new ones.
- `packages/db/src/config/types.ts` (and the wider `@saas/db/config`
  barrel) — for row shapes used in test fixtures (Task 0096 already
  imported `UpdateFeatureFlagInput` from this barrel; the same module
  exposes `CreateSettingInput`, `UpdateSettingInput`, etc.).
- `packages/contracts/src/config/**` (and the `@saas/contracts` barrel) —
  for the request/response contracts the worker exposes.
- `tooling/eslint/index.js` — confirms
  `@typescript-eslint/no-explicit-any` is at `warn`; this task does not
  flip the severity.

## Required Outcomes

- [ ] `pnpm --filter @saas/config-worker-tests lint` exits 0 with
      **0 warnings** (was 126).
- [ ] `pnpm --filter @saas/config-worker-tests test` passes — every test
      file in `tests/config-worker/src` runs and produces the same green
      count and identical assertions as on `main` @ `1c6fcba` (record
      before/after suite + test counts in the report; baseline = 5
      suites / 174 tests, with per-file `it()` counts
      mutation-handlers.test.ts = 39, secret-mutation-handlers.test.ts =
      39, encrypted-secret-storage.test.ts = 29, config-worker.test.ts =
      54, deployment-config.test.ts = 8).
- [ ] `pnpm -r typecheck` exits 0 (Task 0091 baseline holds — must not
      regress).
- [ ] `pnpm -r --no-bail lint` exits 0 with **151 residual warnings**,
      all in `tests/**` *other* workspaces (was 277). Apps-source 0
      invariant from Task 0096 preserved.
- [ ] `git diff origin/main` shows files only under
      `tests/config-worker/src/**` plus the single new
      `ai/reports/task-0096c-implementer.md`.
- [ ] No new `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, or
      `as unknown as` occurrences introduced by this PR (run
      `git diff origin/main -- 'tests/config-worker/**' | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'`
      and confirm empty; record the command + empty result in the
      report).
- [ ] PR opened against `main` from a fresh branch
      `impl/task-0096c-tests-config-worker-class-b`, with the report
      committed to the same branch and the real PR number written into
      the report (no `TBD` / `#[PR]` placeholders after the final push).

## Non-Goals

- Cleaning up other `tests/**` workspaces (`tests/identity-worker` 80,
  `tests/api-edge` 45, `tests/projects-worker` 10, `tests/policy-engine`
  7, `tests/events-worker` 7, `tests/policy-worker` 1,
  `tests/webhooks-worker` 1 — each is a separate future wave).
- Tightening the lint rule from `warn` to `error`.
- Refactoring production code, even when the test reveals an
  opportunity. (If a real bug surfaces, file a follow-up task — do not
  fold a fix into this PR.)
- Touching the `apps/api-edge` / `cloudflare-kv` / `tests/api-edge`
  surface (Track A territory).

## Constraints

1. Behaviour preservation is non-negotiable. If a narrowing forces a
   fixture to change, stop and stage that fixture change separately
   within the same PR with a one-line rationale in the report; never
   silently flip an assertion.
2. Prefer the *real* exported type from the worker / contracts / db
   packages over a handwritten fixture type. Fixture types
   (in-workspace `_types.ts`) are a fallback.
3. `as unknown as T` is forbidden in the diff. `as T` is acceptable only
   when the value is provably a superset of `T` at the call site (note
   in the report when used three or more times).
4. Do not introduce a new tsconfig, vitest config, or workspace-local
   tooling file.
5. Do not change test file names, suite ordering, or `it()` titles.

## Integration Notes

- The lint rule is configured globally at `tooling/eslint/index.js`
  (Task 0092 baseline) and is `warn` for
  `@typescript-eslint/no-explicit-any`. No config change is required.
- `tests/config-worker` is a vitest workspace consuming
  `@saas/contracts`, `@saas/db/config`, and worker-local imports via
  the `@config-worker/*` path alias already; new imports from those
  packages / paths are the expected fix shape.
- Recurring `any` shapes you'll encounter (cluster the fix by shape, not
  by file):
    * **Repo mock stand-ins** —
      `{ createSetting: (() => {}) as any }`, etc. The real
      repo interface is exposed by the handler signatures in
      `apps/config-worker/src/handlers/**`. Build a typed `Partial<…>`
      mock helper rather than per-call `as any`.
    * **RPC-result envelopes** —
      `Promise.resolve({ ok: true, value: ... } as any)`. The real
      envelope is the worker's `Result<T, E>` shape (see handler return
      types). Type the resolved value, drop the `as any`.
    * **JSON parse stand-ins** —
      `await res.json() as any`. Type as the contract response from
      `@saas/contracts/config` (or the smallest accurate response shape
      the test asserts on).
    * **Audit / event mock returns** — same pattern as Task 0096b's
      `@saas/db/events` (`AppendEventWithAuditInput`, `StoredEvent`,
      `StoredAuditEntry`); reuse those imports if applicable.
- Cluster the fix by shape; avoid sprawling cross-file refactors. One
  helper file (`tests/config-worker/src/_types.ts` or similar) is
  acceptable IF it materially deduplicates; otherwise keep types local
  to the test file.

## Acceptance Criteria

✅ `pnpm --filter @saas/config-worker-tests lint` → exit 0, **0 warnings**
   (was 126).

✅ `pnpm --filter @saas/config-worker-tests test` → exit 0, suite & test
   count UNCHANGED vs `main` @ `1c6fcba` (5 suites / 174 tests; per-file
   `it()` counts unchanged: 39 / 39 / 29 / 54 / 8). Record both numbers
   in the implementer report.

✅ `pnpm -r typecheck` → exit 0 (Task 0091 baseline).

✅ `pnpm -r --no-bail lint` → exit 0, **151 residual warnings**, all in
   `tests/**` (apps-source still 0, Task 0096 invariant preserved).

✅ `git diff origin/main --stat` shows files ONLY under
   `tests/config-worker/src/**` plus
   `ai/reports/task-0096c-implementer.md`.

✅ Hazard scan empty:
   `git diff origin/main -- 'tests/config-worker/**' | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'`
   → no output.

✅ PR opened: branch `impl/task-0096c-tests-config-worker-class-b`,
   report committed, real PR number substituted before final push.

## Verification

The verifier (separate task, scoped after PR is open) will:

- Confirm PR scope is exactly `tests/config-worker/src/**` plus the
  report (no overreach).
- Re-run all four `pnpm` commands above on the PR head and confirm the
  numbers match.
- Re-run the hazard scan and confirm empty.
- Spot-check 10–15 fixed sites across the three modified test files
  against the underlying real types (worker handlers, db row types,
  contracts) to confirm narrowings are accurate, not cosmetic widenings.
- Confirm zero file overlap with PR #143 surface.
- Confirm `pnpm -r typecheck` and the workspace test suite remain green.
- On PASS, squash-merge, fast-forward `main`, watch the post-merge
  main-CI run for any test-only fallout (this task does not deploy
  anything, so a `plan`-only post-merge CI is expected; the
  deploy-gated jobs from Task 0096 should remain unaffected by a
  tests-only diff).

## PR Creation Requirement

You must create branch `impl/task-0096c-tests-config-worker-class-b`,
commit, push, and open a GitHub PR before reporting complete.
`PR Number: TBD` is **not** acceptable. After `gh pr create` returns the
real PR number, update `ai/reports/task-0096c-implementer.md` to
substitute the real number for any `#[PR]` / `TBD` placeholders, then
commit and push that final update on the same branch.

## When Done Report

Save to `ai/reports/task-0096c-implementer.md` with sections:

- Summary (3–5 bullets)
- Files Changed (grouped by test file, with per-file before/after
  warning counts: 47 → 0, 43 → 0, 36 → 0, plus any helper file added)
- Checks Run (exact commands + exit codes + warning/test counts)
- Hazard Scan (the grep command + empty result)
- Type Sources Used (which real types from `@saas/contracts` /
  `@saas/db/config` / `apps/config-worker` were imported, and any
  in-workspace `_types.ts` introduced and why)
- Assumptions (any narrowing that required a `as T` cast, with one-line
  justification each)
- Spec Proposals (none expected)
- Remaining Gaps (the still-warned `tests/**` workspaces and their
  counts, as a roadmap pointer for the next wave — expected residual:
  tests/identity-worker 80, tests/api-edge 45, tests/projects-worker 10,
  tests/events-worker 7, tests/policy-engine 7, tests/policy-worker 1,
  tests/webhooks-worker 1 = 151 total)
- Next Task Dependencies (none — Task 0097 rate-limiting remains
  independent and gated only on Track A; next lint wave 0096d targets
  `tests/identity-worker` 80)
- PR Number (real GitHub PR number, never `TBD` on a completed report)
