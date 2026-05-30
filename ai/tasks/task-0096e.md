# Task 0096e

Agent: Implementer

## Current Repo Context

- `main` tip on `origin/main` is `b565687` (orchestrator scope commit for
  Task 0096d, on top of Task 0096b's verifier bookkeeping `1c6fcba`,
  itself on top of Task 0096b squash `6b738c0`). Working tree clean.
- Tasks 0092 / 0093 / 0096 / 0096b have shipped. Track B class-B
  no-explicit-any cleanup has drained `apps/**` (0096) and
  `tests/membership-worker/**` (0096b → 0). Two parallel waves are in
  flight but **have NOT opened PRs yet**:
  - Task 0096c — `tests/config-worker` 126 → 0 on branch
    `impl/task-0096c-tests-config-worker-class-b` (sealed verifier
    prompt at `ai/tasks/task-0096c-verifier.md`).
  - Task 0096d — `tests/identity-worker` 80 → 0 on branch
    `impl/task-0096d-tests-identity-worker-class-b` (sealed verifier
    prompt at `ai/tasks/task-0096d-verifier.md`).
- PR #143 (Track A — Task 0095.1, edge idempotency replay store) is
  the single open PR. Head still `db00843`, mergeStateStatus
  CONFLICTING vs `main`. Branch territory:
  `apps/api-edge/**`, `infra/terraform/cloudflare-kv/**`,
  `tests/api-edge/**`. Implementer rebase + Phase-5 fix-up not yet
  pushed.
- Residual lint surface as of `b565687` (live measurement, all in
  `tests/**`): config-worker 126, identity-worker 80, api-edge 45,
  projects-worker **10**, events-worker **7**, policy-engine **7**
  (split 2 + 5 across two files), policy-worker **1**,
  webhooks-worker **1** — total **277**. Apps source still 0
  (Task 0096 invariant holds). `pnpm -r typecheck` exit 0
  (Task 0091 baseline holds).
- The five smallest workspaces (projects-worker, events-worker,
  policy-engine, policy-worker, webhooks-worker = **26 anys total**)
  have been reserved for a single mop-up wave. They are listed in
  `ai/context/current.md` lines 100–105 as the wave-5 candidate.
- Deferred candidates parked in `/ai/deferred.md`
  (`notifications-provider-swap`, `Task 0085b cloudflare-domain v4→v5`,
  `notifications-worker-dev-reframe`) — orchestrator skips them; do
  not reach into their territories.

## Objective

Eliminate every `@typescript-eslint/no-explicit-any` warning across the
five smallest residual `tests/**` workspaces — `tests/projects-worker`
(10), `tests/events-worker` (7), `tests/policy-engine` (7),
`tests/policy-worker` (1), `tests/webhooks-worker` (1) — by replacing
each `any` with the narrowest accurate type, preferring real exports
from `@saas/contracts/**`, `@saas/db/**`, and the corresponding
`apps/<worker>/src/**`. Same discipline as Tasks 0096 / 0096b / 0096c /
0096d. **One PR, one mop-up wave, five workspaces.**

## Architect Brief

- **Product bar**: same as 0096b/c/d — types must be load-bearing.
  Real type imports first; small in-file structural types only when no
  exported equivalent exists; **never** `as any`, `as unknown as`,
  `eslint-disable`, `@ts-ignore`, or `@ts-expect-error`.
- **User moment**: `pnpm -r --no-bail lint` exits 0 with **≤ 251**
  residual warnings (277 − 26), and the seven small workspaces are
  no longer noise sources for the next wave's diff review.
- **Latitude**: pick narrowest accurate types per call site; pick the
  appropriate import path (e.g. `@saas/contracts/policy` vs barrel);
  decide whether a structural in-file type is shorter and clearer than
  a wide imported union for a given mock shape.
- **Hard non-latitude**: do NOT change assertion text, fixture data,
  suite ordering, `it()` titles, `describe()` titles, or test count.
  Do NOT touch any other workspace. Do NOT change apps source. Do NOT
  introduce a new dependency.
- **Failure modes that fail the PR even if tests pass**: any new
  `+eslint-disable*`, `+@ts-ignore`, `+@ts-expect-error`, or
  `+as unknown as` on the diff side. Any test count delta. Any cross-
  workspace touch.
- **Recommended pattern**: scan each file's `any` occurrences, group
  by which mock / argument they shadow, lift the corresponding real
  type from the matching `apps/<worker>/src/**` or
  `packages/{contracts,db}/src/**`, and replace.

> The implementer has full latitude on type-source selection, narrowing
> shape, and call-site formatting inside the Constraints below.
> Decisions taken under this latitude must be recorded with one-line
> rationale in the implementer report's Type Sources section.
> Anything outside the listed dimensions requires a spec proposal
> before implementation.

## PR Boundary

**One PR — one Track-B wave-5 mop-up across five `tests/**` workspaces.**

In scope (these files only):

1. `tests/projects-worker/src/projects-worker.test.ts` (10 anys)
2. `tests/events-worker/src/events-worker.test.ts` (7 anys)
3. `tests/policy-engine/src/api-key-policy.test.ts` (2 anys)
4. `tests/policy-engine/src/policy-engine.test.ts` (5 anys)
5. `tests/policy-worker/src/policy-worker.test.ts` (1 any)
6. `tests/webhooks-worker/src/delivery.test.ts` (1 any)

Plus a NEW `ai/reports/task-0096e-implementer.md`.

Note `tests/webhooks-worker/src/webhooks-worker.test.ts` is already at
**0 anys** at baseline and must stay byte-identical vs `main` @
`b565687`.

## Read First

- `agents/orchestrator.md` — Implementer Standard, PR Creation
  Requirement, Architect Brief.
- `ai/reports/task-0096b-implementer.md` — canonical type-source
  table + hazard-scan section shape; mirror this report layout.
- `ai/context/current.md` — wave-5 framing (lines 100–105 + tail
  residual distribution).
- `tooling/eslint/index.js` — sealed config; do not edit.
- `apps/projects-worker/src/**` — real types for projects-worker
  test fixtures (handlers, env, repository).
- `apps/events-worker/src/**` — events-worker handler/repository
  shapes; cross-reference `@saas/db/events` and
  `@saas/contracts/events`.
- `apps/policy-worker/src/**` — policy-worker env, handler,
  evaluator types.
- `apps/webhooks-worker/src/**` — webhook delivery client,
  signing, retry shapes.
- `packages/contracts/src/{policy,events,projects,webhooks,api-key}/**`
  — real exported request/response/payload types.
- `packages/db/src/{policy,events,projects,webhooks}/**` — real
  exported repository input/output types.
- `packages/policy-engine/src/**` — `policy-engine` workspace under
  test consumes its own published types.

## Required Outcomes

- [ ] `pnpm --filter @saas/projects-worker-tests lint` → exit 0,
      **0 warnings** (was 10).
- [ ] `pnpm --filter @saas/events-worker-tests lint` → exit 0,
      **0 warnings** (was 7).
- [ ] `pnpm --filter @saas/policy-engine-tests lint` → exit 0,
      **0 warnings** (was 7).
- [ ] `pnpm --filter @saas/policy-worker-tests lint` → exit 0,
      **0 warnings** (was 1).
- [ ] `pnpm --filter @saas/webhooks-worker-tests lint` → exit 0,
      **0 warnings** (was 1).
- [ ] `pnpm -r typecheck` exit 0 (Task 0091 baseline holds).
- [ ] `pnpm --filter @saas/projects-worker-tests test` → exit 0,
      **1 file / 170 tests** (it=170 unchanged).
- [ ] `pnpm --filter @saas/events-worker-tests test` → exit 0,
      **1 file / 20 tests** (it=20 unchanged).
- [ ] `pnpm --filter @saas/policy-engine-tests test` → exit 0,
      **2 files / 177 tests** (api-key-policy.test.ts it=9 +
      policy-engine.test.ts it=131 unchanged).
- [ ] `pnpm --filter @saas/policy-worker-tests test` → exit 0,
      **1 file / 20 tests** (it=20 unchanged).
- [ ] `pnpm --filter @saas/webhooks-worker-tests test` → exit 0,
      **2 files / 66 tests** (delivery.test.ts it=28 +
      webhooks-worker.test.ts it=38 unchanged).
- [ ] `pnpm -r --no-bail lint` exit 0 with **residual ≤ 251** if
      neither 0096c nor 0096d has merged ahead, **≤ 171** if 0096d
      merged ahead, **≤ 125** if 0096c merged ahead, **≤ 45** if
      both merged ahead. All residual in `tests/api-edge` (45) +
      whichever of `tests/{config,identity}-worker` remain. Apps
      source still 0.
- [ ] `git diff origin/main --stat` shows files only under
      `tests/{projects,events,policy,policy-worker,webhooks}-worker/src/**`
      (six files exact) plus the report.
- [ ] Hazard scan empty:
      ```
      git diff origin/main -- 'tests/projects-worker/**' \
        'tests/events-worker/**' 'tests/policy-engine/**' \
        'tests/policy-worker/**' 'tests/webhooks-worker/**' \
        | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'
      ```
      → no output.
- [ ] `tests/webhooks-worker/src/webhooks-worker.test.ts`
      byte-identical vs `main` @ `b565687`
      (`git diff origin/main -- tests/webhooks-worker/src/webhooks-worker.test.ts`
      empty).
- [ ] PR opened on
      `impl/task-0096e-class-b-warning-cleanup-wave-5`. Real PR
      number substituted in the report before the final push.

## Non-Goals

- No `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`,
  `specs/**`, or `ai/specs/**` edits.
- No touching of any **other** `tests/**` workspace
  (`tests/membership-worker`, `tests/config-worker`,
  `tests/identity-worker`, `tests/api-edge`).
- No assertion / fixture / suite-ordering / `it()`-title / mock-data
  changes.
- No new dependencies, no devDependency bumps, no
  `package.json`/`pnpm-lock.yaml` edits.
- No touching of PR #143's surface (`apps/api-edge/**`,
  `infra/terraform/cloudflare-kv/**`, `tests/api-edge/**`).
- No touching of Task 0096c's surface (`tests/config-worker/**`).
- No touching of Task 0096d's surface (`tests/identity-worker/**`).
- No spec changes; if a real type genuinely cannot be located, write
  a small in-file structural type and note it in the report — do not
  invent a contract change.

## Constraints

1. Only the six listed source files plus
   `ai/reports/task-0096e-implementer.md` may change.
2. No new `eslint-disable*` / `@ts-ignore` / `@ts-expect-error` /
   `as unknown as` introductions in the diff (`+` lines must be
   clean).
3. Test count parity per file vs `main` @ `b565687`:
   - `tests/projects-worker/src/projects-worker.test.ts`: it=170
   - `tests/events-worker/src/events-worker.test.ts`: it=20
   - `tests/policy-engine/src/api-key-policy.test.ts`: it=9
   - `tests/policy-engine/src/policy-engine.test.ts`: it=131
   - `tests/policy-worker/src/policy-worker.test.ts`: it=20
   - `tests/webhooks-worker/src/delivery.test.ts`: it=28
4. `tests/webhooks-worker/src/webhooks-worker.test.ts` byte-identical
   vs `main` @ `b565687`.
5. Apps source class-B warnings must remain at 0 (Task 0096
   invariant): `pnpm -r --no-bail lint 2>&1 | grep
   '@typescript-eslint/no-explicit-any\|no-console' |
   grep -v 'tests/'` → no output.
6. Branch: `impl/task-0096e-class-b-warning-cleanup-wave-5`.
7. PR Creation Requirement: you must create the branch, commit,
   push, and open a GitHub PR via `gh pr create` before reporting
   complete. `PR Number: TBD` is not acceptable. After
   `gh pr create` returns the real PR number, substitute it into
   `ai/reports/task-0096e-implementer.md`, commit + push the
   report update.

## Integration Notes

- `policy-engine` is also the workspace name of the runtime package
  under test; the **tests** workspace is `@saas/policy-engine-tests`
  with package path `tests/policy-engine`. Do not confuse the two.
- `tests/policy-engine/src/policy-engine.test.ts` exercises pure
  evaluator paths exported from `@saas/policy-engine`. Prefer
  `import type { ... } from '@saas/policy-engine'` for shapes that
  package exports; only fall back to `@saas/contracts/policy` or an
  in-file structural type if the engine doesn't export the shape.
- `tests/projects-worker/src/projects-worker.test.ts` is the largest
  file in scope (170 tests, 10 anys); the most likely sources are
  `@saas/db/projects` (repository inputs/outputs) and
  `apps/projects-worker/src/env` (Env binding shape).
- `tests/webhooks-worker/src/delivery.test.ts` 1 any most likely
  shadows a delivery-handler arg or a signed-payload object — pull
  from `apps/webhooks-worker/src/delivery` or
  `@saas/contracts/webhooks`.
- All five workspaces are independently lint-clean today except for
  the listed `no-explicit-any` warnings; if your diff introduces any
  other rule violation (`no-unused-vars`, `prefer-const`, etc.) the
  workspace lint exits non-zero and the task fails.

## Acceptance Criteria

✅ `pnpm --filter @saas/projects-worker-tests lint` exits 0 with 0
   warnings; same for `events-worker-tests`, `policy-engine-tests`,
   `policy-worker-tests`, `webhooks-worker-tests`.

✅ `pnpm -r typecheck` exit 0.

✅ `pnpm -r --no-bail lint` exit 0; residual matches the table in
   Required Outcomes given which other waves have or haven't merged
   ahead.

✅ Per-file `it()` count parity vs `main` @ `b565687` holds for all
   six modified files (170 / 20 / 9 / 131 / 20 / 28).

✅ `tests/webhooks-worker/src/webhooks-worker.test.ts` byte-identical
   vs `main` @ `b565687`.

✅ Hazard scan (`grep -E ...` from Required Outcomes) emits nothing.

✅ `git diff origin/main --name-only` lists exactly the six source
   files plus `ai/reports/task-0096e-implementer.md`.

✅ Apps source class-B warnings still 0 (Task 0096 invariant).

✅ PR opened on `impl/task-0096e-class-b-warning-cleanup-wave-5` and
   the implementer report records the real PR number (no `TBD`,
   no `#[PR]` placeholder).

✅ PR-CI rollup: only `plan` + the relevant `*-tests · dev · Verify`
   profiles fire; all green. (No deploy-gated jobs trigger because
   no `apps/**` or `infra/**` files change.)

## Verification

A separate sealed verifier prompt at
`ai/tasks/task-0096e-verifier.md` (created alongside this prompt)
will run after the PR opens. The verifier executes a 7-phase
script: PR sanity → hazard+boundary scan → local gates →
behaviour-preservation `it()` count parity vs `main` @ `b565687` →
PR-CI log inspection → squash merge + post-merge main-CI watch →
state bookkeeping. Track A territory (PR #143) and Task
0096c/0096d territories are explicitly out of scope for this
verifier.

## PR Creation Requirement

You must create branch `impl/task-0096e-class-b-warning-cleanup-wave-5`,
commit the source changes + the implementer report (initially with
`PR Number: TBD`), push the branch, then run `gh pr create
--title "test(class-b-wave-5): drain 26 no-explicit-any across five
small tests/** workspaces (Task 0096e)" --body-file <path>` (body
should summarize: scope, type sources by workspace, hazard-scan
result, baseline parity).

After `gh pr create` returns a PR number, substitute it into
`ai/reports/task-0096e-implementer.md`, commit + push that update.
**PR Number: TBD is not an acceptable completed implementer state.**

## When Done Report

Write `ai/reports/task-0096e-implementer.md` with these sections,
mirroring `ai/reports/task-0096b-implementer.md`'s shape:

- **Summary** (3–5 bullets): scope, residual delta, invariants held.
- **Files Changed** (grouped by workspace; one bullet per workspace
  with file list and warning count delta, e.g. `tests/projects-worker
  10 → 0`).
- **Type Sources** (table or bullets): for each `any` removed, the
  real export or in-file structural type that replaced it, with a
  one-line rationale when discretion was exercised.
- **Checks Run**: exact commands (per-workspace lint × 5,
  per-workspace test × 5, `pnpm -r typecheck`, `pnpm -r --no-bail
  lint`, hazard-scan grep, byte-identical check) and their results.
- **Hazard Scan**: paste the `grep` command and confirm no output.
- **Assumptions**: any narrow type-source decisions that needed a
  judgment call.
- **Spec Proposals**: links only, with one-line reason. (Likely
  none.)
- **Remaining Gaps**: what wave-6 will need to address (likely just
  the post-merge residual surface — `tests/api-edge` 45 if Track A
  hasn't merged plus whichever of 0096c/0096d hasn't shipped).
- **Next Task Dependencies**: pointer to the residual surface and
  whichever of 0096c / 0096d / Track-A-Task-0095.1 is still open.
- **PR Number**: real number from `gh pr create`. No `TBD`, no
  `#[PR]`.
