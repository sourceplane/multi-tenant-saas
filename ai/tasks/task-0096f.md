# Task 0096f

Agent: Implementer

## Current Repo Context

- `main` tip on `origin/main` is `2991229` (orchestrator scope commit
  for Task 0097, on top of `3aaec66` which seeds the Task 0097 prompt,
  on top of `697e2a2` which closed Track A — Task 0095.1 verifier
  PASS). Working tree clean.
- Track A is CLOSED. Track B has drained every `tests/**` workspace
  EXCEPT `tests/api-edge` (still 45 `@typescript-eslint/no-explicit-any`
  residual warnings). PRs #145 (0096b), #146 (0096e), #148 (0096d),
  #149 (0096c) all squash-merged with post-merge main-CI SUCCESS.
- Live measurement on `2991229`:
  - `pnpm -r typecheck` → exit 0 (Task 0091 baseline holds)
  - `pnpm -r --no-bail lint` → exit 0
  - Residual: 45 warnings, **all** in `tests/api-edge/src/*.test.ts`,
    **all** rule `@typescript-eslint/no-explicit-any`, **0**
    `no-console`, apps source class-B still 0 (Task 0096 invariant).
- Per-file distribution in `tests/api-edge/src/` at `2991229`
  (live `eslint` measurement):
  - `org-facade.test.ts` — 15 anys
  - `project-facade.test.ts` — 11 anys
  - `auth-facade.test.ts` — 9 anys
  - `audit-facade.test.ts` — 8 anys
  - `api-key-routes.test.ts` — 2 anys
  - `webhooks-facade.test.ts` — 0 (must stay byte-identical)
  - `idempotency-replay.test.ts` — 0 (must stay byte-identical)
  - `idempotency-edge.test.ts` — 0 (must stay byte-identical)
  - `cors.test.ts` — 0 (must stay byte-identical)
  - `config-facade.test.ts` — 0 (must stay byte-identical)
  - `billing-facade.test.ts` — 0 (must stay byte-identical)
- Single open task in flight in parallel: **Task 0097** (edge per-org +
  per-identity rate limiting) on branch
  `impl/task-0097-edge-rate-limiting`. Task 0097 touches
  `apps/api-edge/src/**`, `apps/api-edge/scripts/verify-bindings.mjs`,
  `apps/api-edge/wrangler.jsonc`, and
  `infra/terraform/cloudflare-kv/**` — **zero overlap** with this
  task's `tests/**`-only surface, so the two PRs are parallel-safe.
- `tests/api-edge/src/idempotency-replay.test.ts` was added by Task
  0095 (PR #143) and lives in the byte-identical set — do not edit.
- Deferred candidates parked in `/ai/deferred.md` (`0085b`,
  `notifications-provider-swap`, `notifications-worker-dev-reframe`)
  — orchestrator skips them; do not reach into their territories.

## Objective

Eliminate every `@typescript-eslint/no-explicit-any` warning in
`tests/api-edge/src/**` by replacing each `any` with the narrowest
accurate type, preferring real exports from `@saas/contracts/**`,
`@saas/db/**`, and the corresponding `apps/api-edge/src/**`. Same
discipline as Tasks 0096 / 0096b / 0096c / 0096d / 0096e. Closes
Track B globally — after this PR, `pnpm -r --no-bail lint` exits 0
with **0** residual warnings repo-wide.

## Architect Brief

- **Product bar**: same as 0096b/c/d/e — types must be load-bearing.
  Real type imports first; small in-file structural types only when
  no exported equivalent exists; **never** `as any`, `as unknown as`,
  `eslint-disable`, `@ts-ignore`, or `@ts-expect-error`.
- **User moment**: `pnpm -r --no-bail lint` exits 0 with **0**
  residual `@typescript-eslint/no-explicit-any` warnings repo-wide
  (closes Track B globally). Track A invariants are untouched —
  `apps/api-edge/src/**` source must not change.
- **Latitude**: pick narrowest accurate types per call site; pick the
  appropriate import path (e.g. `@saas/contracts/api-edge` vs barrel,
  or a local `apps/api-edge/src/handlers/*` shape); decide whether a
  structural in-file type is shorter and clearer than a wide imported
  union for a given mock shape; group similar mock shapes into a local
  helper type when it reduces repetition.
- **Hard non-latitude**: do NOT change assertion text, fixture data,
  suite ordering, `it()` / `describe()` titles, or test counts. Do
  NOT touch `apps/api-edge/src/**` (Track A territory; Task 0097 is
  in flight there). Do NOT touch
  `apps/api-edge/scripts/verify-bindings.mjs` or
  `apps/api-edge/wrangler.jsonc` (Task 0097 territory). Do NOT touch
  `infra/terraform/cloudflare-kv/**` (Task 0097 territory). Do NOT
  edit any other `tests/**` workspace. Do NOT introduce a new
  dependency. Do NOT modify `tooling/eslint/**` (sealed).
- **Failure modes that fail the PR even if tests pass**: any new
  `+eslint-disable*`, `+@ts-ignore`, `+@ts-expect-error`, or
  `+as unknown as` on the diff side. Any `it()` / `test()` count
  delta on any file in `tests/api-edge/src/`. Any change to a
  byte-identical-locked file. Any change outside `tests/api-edge/`.
- **Recommended pattern**: scan each file's `any` occurrences, group
  by which mock / argument they shadow, lift the corresponding real
  type from `apps/api-edge/src/**` (handler params, env shape,
  facade-context types) or `@saas/contracts/**`, and replace.

> The implementer has full latitude on type-source selection,
> narrowing shape, in-file helper-type extraction, and call-site
> formatting inside the Constraints below. Decisions taken under
> this latitude must be recorded with one-line rationale in the
> implementer report's Type Sources section. Anything outside the
> listed dimensions requires a spec proposal before implementation.

## PR Boundary

**One PR — one workspace mop-up, closes Track B globally.**

In scope (these files only):

1. `tests/api-edge/src/org-facade.test.ts` (15 anys)
2. `tests/api-edge/src/project-facade.test.ts` (11 anys)
3. `tests/api-edge/src/auth-facade.test.ts` (9 anys)
4. `tests/api-edge/src/audit-facade.test.ts` (8 anys)
5. `tests/api-edge/src/api-key-routes.test.ts` (2 anys)

Plus a NEW `ai/reports/task-0096f-implementer.md`.

The following `tests/api-edge/src/` files are at **0 anys** at
baseline and must stay byte-identical vs `main` @ `2991229`:

- `webhooks-facade.test.ts`
- `idempotency-replay.test.ts`
- `idempotency-edge.test.ts`
- `cors.test.ts`
- `config-facade.test.ts`
- `billing-facade.test.ts`

## Read First

- `agents/orchestrator.md` — Implementer Standard, PR Creation
  Requirement, Architect Brief.
- `ai/reports/task-0096b-implementer.md` and
  `ai/reports/task-0096e-implementer.md` — canonical type-source
  table + hazard-scan section shape; mirror this report layout.
- `ai/context/current.md` — Track B drain summary; this task closes
  the last residual workspace.
- `ai/tasks/task-0097.md` — sibling task in flight on
  `apps/api-edge/src/**`. Read the PR Boundary section to confirm
  the parallel-safety claim. Do not modify any file 0097 owns.
- `tooling/eslint/index.js` — sealed config; do not edit.
- `apps/api-edge/src/**` — real types for the five facades under test
  (handlers, env, facade context, route signature). **Read only —
  do not modify.**
- `packages/contracts/src/api-edge/**` and any `@saas/contracts/**`
  exports referenced by the facades — preferred type sources before
  reaching for in-file structural types.

## Required Outcomes

1. `pnpm --filter @saas/api-edge-tests lint` exits 0 with **0**
   warnings.
2. `pnpm -r typecheck` exit 0.
3. `pnpm -r --no-bail lint` exit 0 with **0** residual warnings
   repo-wide. (Track B globally CLOSED.)
4. Per-file `it()` / `test()` count parity vs `main` @ `2991229`
   holds for all 11 files in `tests/api-edge/src/`:
   - `org-facade.test.ts`: it+test = **64**
   - `project-facade.test.ts`: it+test = **42**
   - `auth-facade.test.ts`: it+test = **38**
   - `audit-facade.test.ts`: it+test = **12**
   - `api-key-routes.test.ts`: it+test = **7**
   - `webhooks-facade.test.ts`: it+test = **19**  (byte-identical)
   - `idempotency-replay.test.ts`: it+test = **12**  (byte-identical)
   - `idempotency-edge.test.ts`: it+test = **9**  (byte-identical)
   - `cors.test.ts`: it+test = **37**  (byte-identical)
   - `config-facade.test.ts`: it+test = **26**  (byte-identical)
   - `billing-facade.test.ts`: it+test = **16**  (byte-identical)
5. The six byte-identical files listed above must produce empty
   diff vs `main` @ `2991229` (`git diff origin/main --
   tests/api-edge/src/<file>` empty).
6. Hazard scan emits nothing on the diff side:
   ```
   git diff origin/main -- tests/api-edge/ \
     | grep -E '^\+' \
     | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as unknown as'
   ```
7. `git diff origin/main --name-only` lists exactly the five
   modified test files plus `ai/reports/task-0096f-implementer.md`
   — nothing else.
8. Apps source class-B warnings must remain at 0 (Task 0096
   invariant): `pnpm -r --no-bail lint 2>&1 |
   grep '@typescript-eslint/no-explicit-any\|no-console' |
   grep -v 'tests/'` → no output.
9. Branch: `impl/task-0096f-tests-api-edge-class-b`.
10. PR Creation Requirement: you must create the branch, commit,
    push, and open a GitHub PR via `gh pr create` before reporting
    complete. `PR Number: TBD` is not acceptable. After
    `gh pr create` returns the real PR number, substitute it into
    `ai/reports/task-0096f-implementer.md`, commit + push the
    report update.

## Non-Goals

- No `apps/api-edge/src/**` changes (Track A / Task 0097 territory).
- No `apps/api-edge/scripts/**` changes.
- No `apps/api-edge/wrangler.jsonc` changes.
- No `infra/**` changes.
- No other `tests/**` workspace touches.
- No `tooling/eslint/**` edits.
- No new dependencies.
- No assertion / fixture / suite-title edits.

## Constraints

- Test count parity per file (see Required Outcomes #4).
- Six byte-identical files (see Required Outcomes #5).
- Hazard-scan must emit nothing (see Required Outcomes #6).
- Apps source class-B invariant holds (see Required Outcomes #8).

## Integration Notes

- `tests/api-edge/src/org-facade.test.ts` is the largest file in
  scope (64 it/test, 15 anys). Most likely sources are
  `apps/api-edge/src/org-facade` (handler signatures) and
  `@saas/contracts/api-edge` (request/response envelope shapes).
  Read the actual facade module to find the exported handler arg
  types before resorting to a structural mock.
- `tests/api-edge/src/project-facade.test.ts` (11 anys) — facade
  pattern mirrors `org-facade`. Same type-source heuristic applies.
- `tests/api-edge/src/auth-facade.test.ts` (9 anys) — auth-facade
  exports plus `@saas/contracts/auth` are the likely sources;
  identity / actor envelope types may live under
  `apps/api-edge/src/identity*` or a contracts subpath.
- `tests/api-edge/src/audit-facade.test.ts` (8 anys) — audit-facade
  exports plus `@saas/contracts/audit` (or wherever the audit envelope
  is declared) are the likely sources.
- `tests/api-edge/src/api-key-routes.test.ts` (2 anys) — smallest
  remaining file; expect a single mock-arg shadow plus possibly a
  `Response`-shaped helper.
- All five workspaces are independently lint-clean today except for
  the listed `no-explicit-any` warnings; if your diff introduces any
  other rule violation (`no-unused-vars`, `prefer-const`, etc.) the
  workspace lint exits non-zero and the task fails.

## Acceptance Criteria

✅ `pnpm --filter @saas/api-edge-tests lint` → exit 0, 0 warnings.

✅ `pnpm --filter @saas/api-edge-tests test` → exit 0, all suites
   pass, count parity per file (64 / 42 / 38 / 12 / 7 / 19 / 12 / 9
   / 37 / 26 / 16 = 252 it/test total).

✅ `pnpm -r typecheck` → exit 0.

✅ `pnpm -r --no-bail lint` → exit 0 with 0 residual warnings
   repo-wide. (Track B globally CLOSED.)

✅ Six byte-identical files produce empty `git diff origin/main`.

✅ Hazard scan emits nothing.

✅ `git diff origin/main --name-only` lists exactly the five
   modified test files plus `ai/reports/task-0096f-implementer.md`.

✅ Apps source class-B warnings still 0 (Task 0096 invariant).

✅ PR opened on `impl/task-0096f-tests-api-edge-class-b` and the
   implementer report records the real PR number (no `TBD`, no
   `#[PR]` placeholder).

✅ PR-CI rollup: only `plan` + the relevant `*-tests · dev · Verify`
   profiles fire; all green. (No deploy-gated jobs trigger because
   no `apps/**` or `infra/**` files change.)

## Verification

A separate sealed verifier prompt at
`ai/tasks/task-0096f-verifier.md` (created alongside this prompt)
will run after the PR opens. The verifier executes a 7-phase script:
PR sanity → hazard+boundary scan → local gates →
behaviour-preservation `it()` count parity vs `main` @ `2991229` →
PR-CI log inspection → squash merge + post-merge main-CI watch →
state bookkeeping. Task 0097 territory (`apps/api-edge/src/**`,
`infra/terraform/cloudflare-kv/**`,
`apps/api-edge/scripts/verify-bindings.mjs`,
`apps/api-edge/wrangler.jsonc`) is explicitly out of scope for this
verifier.

## PR Creation Requirement

You must create branch `impl/task-0096f-tests-api-edge-class-b`,
commit the source changes + the implementer report (initially with
`PR Number: TBD`), push the branch, then run
`gh pr create --title "test(api-edge): drain 45 no-explicit-any in
tests/api-edge — closes Track B (Task 0096f)" --body-file <path>`
(body should summarize: scope, type sources by file, hazard-scan
result, baseline parity, and explicitly state "closes Track B
class-B drain globally").

After `gh pr create` returns a PR number, substitute it into
`ai/reports/task-0096f-implementer.md`, commit + push that update.
**PR Number: TBD is not an acceptable completed implementer state.**

## When Done Report

Write `ai/reports/task-0096f-implementer.md` with these sections,
mirroring `ai/reports/task-0096b-implementer.md` /
`ai/reports/task-0096e-implementer.md` shape:

- **Summary** (3–5 bullets): scope, residual delta (45 → 0,
  Track B globally CLOSED), invariants held.
- **Files Changed** (grouped by file; one bullet per file with
  warning count delta, e.g. `org-facade.test.ts 15 → 0`). Six
  byte-identical files explicitly noted.
- **Type Sources** (table or bullets): for each `any` removed, the
  real export or in-file structural type that replaced it, with a
  one-line rationale when discretion was exercised.
- **Checks Run**: exact commands (per-workspace lint,
  per-workspace test, `pnpm -r typecheck`, `pnpm -r --no-bail
  lint`, hazard-scan grep, byte-identical check) and their results.
- **Hazard Scan**: paste the `grep` command and confirm no output.
- **Assumptions**: any narrow type-source decisions that needed a
  judgment call.
- **Spec Proposals**: links only, with one-line reason. (Likely
  none.)
- **Remaining Gaps**: explicitly state "Track B class-B drain CLOSED;
  no residual `@typescript-eslint/no-explicit-any` warnings repo-wide".
- **Next Task Dependencies**: pointer to Task 0097 (parallel sibling)
  if still open.
- **PR Number**: real number from `gh pr create`. No `TBD`, no
  `#[PR]`.
