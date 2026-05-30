# Task 0096c — Verifier

Agent: Verifier

## Status

**Sealed and ready to run as soon as the Task 0096c implementer pushes a
PR.** The orchestrator scopes this prompt up-front (mirroring the
`task-0095.1-verifier.md` and `task-0096b-verifier.md` pattern) so the
verifier loop activates the moment PR-CI rolls up green on the
implementer's PR. If you are reading this and no PR exists yet for
branch `impl/task-0096c-tests-config-worker-class-b`, stop — the
implementer phase is still in flight.

## Current Repo Context

Task 0096c is **wave 3** of class-B lint cleanup (the
`@typescript-eslint/no-explicit-any` drain track). It targets
`tests/config-worker` — the largest single residual `tests/**`
workspace at **126 warnings**, all `no-explicit-any`, concentrated in 3
of the 5 test files.

Implementer prompt: `ai/tasks/task-0096c.md`.
Implementer branch: `impl/task-0096c-tests-config-worker-class-b`.
Expected report path: `ai/reports/task-0096c-implementer.md`.

Reported invariants the implementer must hit (lifted from the prompt):

- 126 `@typescript-eslint/no-explicit-any` warnings inside
  `tests/config-worker/src/**` → 0.
- Workspace-wide residual lint: 277 → **151**, all 151 in other
  `tests/**` workspaces (apps-source still 0 — Task 0096 invariant
  preserved).
- Only the 3 carrying-files modified: `mutation-handlers.test.ts` (47
  → 0), `secret-mutation-handlers.test.ts` (43 → 0),
  `encrypted-secret-storage.test.ts` (36 → 0). The remaining two
  files in the workspace — `config-worker.test.ts` (0 anys baseline,
  54 `it()`) and `deployment-config.test.ts` (0 anys baseline, 8
  `it()`) — must NOT appear in the diff.
- Test surface unchanged: `pnpm --filter @saas/config-worker-tests
  test` reports the same suite + test counts the implementer recorded
  in the report; per-file `it()/test()` count parity vs `main` @
  `1c6fcba` (the orchestrator-bookkeeping HEAD at scope time).
- Hazard scan empty: no `eslint-disable*`, `@ts-ignore`,
  `@ts-expect-error`, or `as unknown as` introduced in the diff.
- 4 files changed (3 modified test files + 1 new implementer report);
  optionally 1 additional in-workspace `_types.ts` if the implementer
  judged it warranted (the prompt allows it).

PR #143 (Track A — Task 0095.1) is unchanged at `db00843` / DIRTY at
the time this prompt was sealed. Track A is out of scope for this
verifier — do not touch any file under `apps/api-edge/**`,
`infra/terraform/cloudflare-kv/**`, or `tests/api-edge/**`.

## Objective

Verify that the Task 0096c PR holds the documented invariants, run the
local quality gates, confirm PR-CI logs show the expected commands
actually ran, and close the loop:

- **PASS** — squash-merge the PR into `main`, fast-forward local `main`
  from `origin/main`, watch post-merge main-CI to SUCCESS, leave the
  local repo clean. Then write
  `ai/reports/task-0096c-verifier.md` and update state.
- **FAIL** — leave the PR OPEN with explicit, reproducible blockers in
  the verifier report. The orchestrator will scope a Task 0096c.1
  follow-up from there.

## PR Boundary You Are Validating

In scope (must hold):

- Diff confined to `tests/config-worker/src/**/*.ts` (max 4 files: the
  three carrying-files, plus an optional in-workspace `_types.ts`)
  plus `ai/reports/task-0096c-implementer.md`. Nothing else.
- No new files outside that path. No deletions of unrelated files.

Out of scope (must NOT appear in the diff):

- `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`,
  `specs/**`.
- Any other `tests/<workspace>/**` directory (in particular: NOT
  `tests/api-edge/**` — that's Track A territory).
- `pnpm-lock.yaml`, `package.json` (any), `intent.yaml`, `kiox.lock`,
  `tsconfig*.json`.
- Any change to `tests/config-worker/package.json`,
  `tests/config-worker/tsconfig*.json`, or
  `tests/config-worker/eslint.config.*`.
- The two zero-baseline test files — `config-worker.test.ts` and
  `deployment-config.test.ts` — must NOT appear in the diff. If
  either does, FAIL even if the change looks cosmetic; the prompt's
  scope said leave them alone.

## Read First

- `ai/tasks/task-0096c.md` (the implementer prompt)
- `ai/reports/task-0096c-implementer.md`
- `ai/tasks/task-0096b-verifier.md` (the wave-2 verifier precedent —
  this prompt is its sibling)
- `ai/reports/task-0096b-verifier.md` (the PASS shape to match)
- `ai/context/current.md` (Track A vs Track B framing)
- `agents/orchestrator.md` § Verifier Standard + Verifier Merge
  Protocol

## Verification Phases

### Phase 1 — Repo / PR sanity

1. `git fetch origin --prune`.
2. Find the PR: `gh pr list --head
   impl/task-0096c-tests-config-worker-class-b --json
   number,headRefOid,baseRefName,mergeStateStatus,mergeable`. Record
   the PR number — call it `<PR>` for the rest of this prompt.
3. `gh pr view <PR> --json
   number,title,headRefName,headRefOid,baseRefName,mergeStateStatus,
   mergeable,changedFiles,additions,deletions,files,statusCheckRollup`.
   Confirm: `headRefOid` matches the head you are about to verify
   (record it), `baseRefName=main`, `mergeable=MERGEABLE`,
   `mergeStateStatus=CLEAN`, **4 or 5 files changed** (4 if the
   implementer skipped `_types.ts`; 5 if they added it), all paths in
   the in-scope set above.
4. `gh pr diff <PR> --name-only` — must equal one of the two allowed
   shapes:

   Shape A (no `_types.ts`):
   ```
   ai/reports/task-0096c-implementer.md
   tests/config-worker/src/encrypted-secret-storage.test.ts
   tests/config-worker/src/mutation-handlers.test.ts
   tests/config-worker/src/secret-mutation-handlers.test.ts
   ```

   Shape B (with optional `_types.ts`):
   ```
   ai/reports/task-0096c-implementer.md
   tests/config-worker/src/_types.ts
   tests/config-worker/src/encrypted-secret-storage.test.ts
   tests/config-worker/src/mutation-handlers.test.ts
   tests/config-worker/src/secret-mutation-handlers.test.ts
   ```

   (The implementer is also allowed a different filename for the
   shared types file — e.g. `_helpers.ts` — as long as it lives in
   `tests/config-worker/src/` and the report justifies it.) If any
   path falls outside `tests/config-worker/src/**` plus the report,
   or `config-worker.test.ts` / `deployment-config.test.ts` appear,
   FAIL with exact diff names.
5. `gh pr checkout <PR>`. Confirm `git rev-parse HEAD` matches the
   head from step 3.

### Phase 2 — Diff hazard + boundary scan

Run all of these on the PR head and record exact outputs:

1. ```
   git diff origin/main -- 'tests/config-worker/**' \
     | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'
   ```
   Must produce **no output**. Any hit → FAIL.
2. ```
   git diff origin/main --stat
   ```
   Confirm only `tests/config-worker/src/**` + the implementer report
   file appear.
3. ```
   git diff origin/main -- ':(exclude)tests/config-worker/**' \
                            ':(exclude)ai/reports/task-0096c-implementer.md'
   ```
   Must produce **no output**.
4. Confirm `config-worker.test.ts` and `deployment-config.test.ts` are
   **not** in the diff (the prompt said leave them alone; the report
   is expected to confirm 0-anys-baseline for both).

### Phase 3 — Local install + targeted gates

1. `pnpm install --frozen-lockfile` — must be a no-op (no lockfile
   changes since PR didn't touch `package.json` / `pnpm-lock.yaml`).
2. `pnpm --filter @saas/config-worker-tests lint` — exit 0,
   **0 warnings**. Record the exit code and the
   "X problems (Y errors, Z warnings)" line. Anything other than `0
   problems` → FAIL.
3. `pnpm --filter @saas/config-worker-tests test` — exit 0. Record
   the "Test Suites" / "Tests" line. Counts must match the numbers
   the implementer report claims (and the report itself must
   reference the `main` @ `1c6fcba` per-file `it()` baseline:
   `mutation-handlers.test.ts` 39, `secret-mutation-handlers.test.ts`
   39, `encrypted-secret-storage.test.ts` 29, `config-worker.test.ts`
   54, `deployment-config.test.ts` 8 = **5 suites, 169 `it()`**;
   vitest's "Tests" line may be higher if `describe.each` /
   `test.each` expansion applies — record both numbers).
4. `pnpm --filter @saas/config-worker-tests exec tsc --noEmit` —
   exit 0.
5. `pnpm -r typecheck` — exit 0 (Task 0091 baseline must hold).
6. `pnpm -r --no-bail lint` — exit 0, residual must be **151 warnings,
   0 errors**, distributed only across the remaining seven `tests/**`
   workspaces (`tests/identity-worker` 80, `tests/api-edge` 45,
   `tests/projects-worker` 10, `tests/events-worker` 7,
   `tests/policy-engine` 7, `tests/policy-worker` 1,
   `tests/webhooks-worker` 1) and apps-source 0. Record the
   per-workspace breakdown. Acceptable tolerance: **≤151 warnings is
   acceptable** (someone may have done parallel side-cleanup landing
   in `main` further reducing the surface; >151 → FAIL because that
   means the diff regressed lint elsewhere).

### Phase 4 — Behaviour preservation spot-check

Compare per-file `it()/test()` counts on the PR head vs `main` @
`1c6fcba` (the orchestrator-scope commit; the immediate parent
baseline that the diff sits on top of):

```bash
for f in tests/config-worker/src/encrypted-secret-storage.test.ts \
         tests/config-worker/src/mutation-handlers.test.ts \
         tests/config-worker/src/secret-mutation-handlers.test.ts; do
  base=$(git show 1c6fcba:"$f" | grep -cE '^\s*(it|test)\(')
  head=$(git show HEAD:"$f"    | grep -cE '^\s*(it|test)\(')
  echo "$f base=$base head=$head"
done
```

Counts must be equal per file (39/39/29). Repeat for the two
zero-baseline files to confirm they are byte-identical:

```bash
for f in tests/config-worker/src/config-worker.test.ts \
         tests/config-worker/src/deployment-config.test.ts; do
  diff <(git show 1c6fcba:"$f") <(git show HEAD:"$f") && \
    echo "$f IDENTICAL" || echo "$f DRIFTED -> FAIL"
done
```

Any drift in counts on the modified files OR any drift in the
zero-baseline files → FAIL with file name and delta.

### Phase 5 — PR-CI log inspection (not just status)

1. `gh pr checks <PR>` — confirm `plan` and any
   `config-worker-tests · <env> · Verify` jobs are PASS on the latest
   head. (`tests/config-worker` may subscribe to `dev` only, mirroring
   the membership-worker-tests pattern; whatever it subscribes to,
   every leaf must be SUCCESS.)
2. `gh run view <run-id> --log-failed` first for a fast scan; then
   `gh run view <run-id> --log` on the most recent CI run for the PR
   head. Confirm:
   - The `config-worker-tests · ... · Verify` job actually executed
     `pnpm --filter @saas/config-worker-tests test` (or whatever
     command the composition resolves to) and reported the same test
     count as Phase 3.
   - No silent skip / early-exit pattern.
3. Confirm `orun plan --changed --intent intent.yaml --output
   plan.json` ran in the `plan` job and emitted a plan that includes
   `config-worker-tests`. **Zero job count** would mean the plan
   didn't pick up the diff — if so, FAIL.

### Phase 6 — Merge (only if Phases 1–5 PASS)

1. `gh pr merge <PR> --squash --delete-branch --admin=false` — squash
   merge.
2. `git checkout main && git pull --ff-only origin main`. Record the
   new `main` SHA.
3. Watch post-merge main-CI: find with `gh run list --branch main
   --limit 3`, then `gh run watch <run-id>`. All jobs must end in
   SUCCESS. Record the run ID and final job count. (Tests-only diff
   → expect a `plan`-only or `plan + config-worker-tests · dev ·
   Verify` post-merge run; deploy-gated jobs from Tasks 0093/0096
   should not be exercised by a tests-only change.)
4. `git status --short` — must be empty. If anything verifier-created
   sits in the worktree, commit it as a follow-up bookkeeping commit
   on `main` or drop it before ending the task. Do **not** leave
   dirty state.

### Phase 7 — State + report

If PASS:

1. Write `ai/reports/task-0096c-verifier.md` per the orchestrator
   verifier-report template (Result / Checks / Issues / Risk Notes /
   Spec Proposals / Recommended Next Move). Concise — bullet form.
   Recommended-next-move bullet should point at the next class-B
   `tests/**` wave (next-largest after `tests/config-worker` is
   `tests/identity-worker` at 80 warnings, then `tests/api-edge` at
   45 — but `tests/api-edge` is gated by Track A merging) so the
   orchestrator can scope Task 0096d without re-deriving the
   residual breakdown.
2. Update `ai/state.json`:
   - Add `"0096c"` to `completed`.
   - Update `current_task` to `"orchestrator"` (or whatever the
     orchestrator next selects — leaving it as `"orchestrator"` is
     the established post-merge convention).
   - Update `last_verified` to the merge timestamp (UTC ISO).
   - Update `next_focus` to point at the next wave the
     Recommended-next-move bullet identified.
   - Add a `notes` entry summarizing PR `<PR>` merge SHA, post-merge
     CI run ID, residual-warning count, and the "next-largest
     workspace" pointer.
   - Set `task_agent` to `/ai/reports/task-0096c-verifier.md`
     immediately after writing that file.
3. Update `ai/context/current.md` and `ai/context/task-ledger.md` with
   the durable Task 0096c outcome (one paragraph in current.md, one
   ledger entry under `## Task 0096c — Verifier`).
4. Commit those `ai/**` updates directly to `main` (post-merge
   bookkeeping commit) with message:
   `Task 0096c verification PASS: class-B lint cleanup wave 3
   (tests/config-worker) — PR #<PR> merged at <SHA>, post-merge
   main-CI <run-id> SUCCESS, 126 → 0 no-explicit-any, residual lint
   surface 277 → 151`.

If FAIL:

1. Leave the PR OPEN. Do not merge.
2. Write `ai/reports/task-0096c-verifier.md` with explicit,
   copy-pastable reproducer commands for every blocker.
3. Update `ai/state.json.notes` with a one-line "Task 0096c verifier
   FAIL — see report" entry. Do **not** mark completed. Do **not**
   advance `current_task`.
4. Set `task_agent` to `/ai/reports/task-0096c-verifier.md`.
5. Recommended next move in the report: orchestrator scopes Task
   0096c.1 fix-up (same PR, additive commits) with the exact phase
   gates that need re-run.

## Acceptance Criteria

- All Phase 1–5 checks recorded with exact commands and outputs.
- PR squash-merged into main with post-merge main-CI green **OR**
  explicit FAIL report with reproducer commands.
- `git status --short` empty at end of task.
- Local `main` fast-forwarded to `origin/main`.
- `task_agent` in `ai/state.json` points to the verifier report.
- `tests/config-worker` per-workspace lint exits 0 with 0 warnings.
- `pnpm -r --no-bail lint` exits 0 with ≤151 residual warnings, all in
  other `tests/**` workspaces.
- `config-worker.test.ts` and `deployment-config.test.ts` byte-identical
  vs `main` @ `1c6fcba`.
- Hazard scan empty.

## Non-Goals

- Re-litigating the implementer's choice of in-file structural types
  vs a `_types.ts` / `_helpers.ts` shared file. The implementer prompt
  granted that latitude. Verifier checks scope, hazard scan, test
  counts, and quality gates — not taste.
- Touching PR #143 / Track A / `apps/api-edge/**` /
  `infra/terraform/cloudflare-kv/**` / `tests/api-edge/**`.
- Scoping Task 0096d. The verifier only **points at** the next-largest
  workspace; the orchestrator decides what wave 4 actually looks
  like. (And `tests/api-edge` 45 — second-largest by raw count —
  is blocked behind Track A's merge; the natural wave-4 target is
  `tests/identity-worker` 80.)
- Running the orun pipeline locally — this PR is a tests-only no-infra
  change; PR-CI's `plan` job already exercises the orun plan path on
  the diff.

## Verifier Merge Protocol Reminder

Per `agents/orchestrator.md`:

- Use `/Users/irinelinson/.local/bin/kiox -- orun ...` only if local
  orun validation is needed (this task does not require it; PR-CI
  covers the plan path).
- Inspect PR CI logs with `gh`, not just status summaries.
- After merge, fast-forward `main`, leave no branch checked out, leave
  no local diff.
- Never merge with unresolved blockers.

## When Done Report

`ai/reports/task-0096c-verifier.md` per the orchestrator template,
followed by the state-file and context-file updates committed directly
to `main`.
