# Task 0096b — Verifier

Agent: Verifier

## Current Repo Context

Task 0096b is the second wave of class-B lint cleanup. The implementer
phase landed PR #145 on branch
`impl/task-0096b-tests-membership-worker-class-b` at head
`d68cf19fe785db9d24b0031d998767e7a707114f`, base `main` @ `6f1e65d`.

Implementer report: `ai/reports/task-0096b-implementer.md`.

Reported outcome:

- 350 `@typescript-eslint/no-explicit-any` warnings inside
  `tests/membership-worker/src/**` → 0.
- Workspace-wide residual lint: 627 → 277, all 277 in other `tests/**`
  workspaces (apps-source still 0 — Task 0096 invariant preserved).
- Test surface unchanged: 5 suites / 244 tests pass on PR head, same as
  `main` @ `d2187f1`.
- Hazard scan empty: no `eslint-disable*`, `@ts-ignore`,
  `@ts-expect-error`, or `as unknown as` introduced in the diff.
- 5 files changed: 4 test files + the implementer report (the 5th test
  file `authorization-context.test.ts` had 0 anys at baseline and was
  not modified).
- PR-CI on `d68cf19`: `plan` SUCCESS, `membership-worker-tests · dev ·
  Verify` SUCCESS (2/2).

PR #143 (Track A — Task 0095.1) is unchanged at `db00843` / DIRTY and
out of scope for this verifier. Do not touch it.

## Objective

Verify that PR #145 holds the documented invariants, run the local
quality gates, confirm PR-CI logs show the expected commands actually
ran, and close the loop:

- **PASS** — squash-merge PR #145 into `main`, fast-forward local
  `main` from `origin/main`, watch post-merge main-CI to SUCCESS, and
  leave the local repo clean. Then write
  `ai/reports/task-0096b-verifier.md` and update state.
- **FAIL** — leave PR #145 OPEN with explicit, reproducible blockers
  in the verifier report. The orchestrator will scope Task 0096b.1 from
  there.

## PR Boundary You Are Validating

In scope (must hold):

- Diff confined to `tests/membership-worker/src/**/*.ts` plus
  `ai/reports/task-0096b-implementer.md`. Nothing else.
- No new files outside that path. No deletions of unrelated files.

Out of scope (must NOT appear in the diff):

- `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`,
  `specs/**`.
- Any other `tests/<workspace>/**` directory.
- `pnpm-lock.yaml`, `package.json` (any), `intent.yaml`, `kiox.lock`,
  `tsconfig*.json`.
- Any change to `tests/membership-worker/package.json`,
  `tests/membership-worker/tsconfig*.json`, or
  `tests/membership-worker/eslint.config.*`.

## Read First

- `ai/tasks/task-0096b.md` (the implementer prompt)
- `ai/reports/task-0096b-implementer.md`
- `ai/context/current.md` (Track A vs Track B framing)
- `agents/orchestrator.md` § Verifier Standard + Verifier Merge
  Protocol

## Verification Phases

### Phase 1 — Repo / PR sanity

1. `git fetch origin --prune`.
2. `gh pr view 145 --json
   number,title,headRefName,headRefOid,baseRefName,mergeStateStatus,
   mergeable,changedFiles,additions,deletions,files,statusCheckRollup`.
   Confirm: `headRefOid` matches the head you are about to verify
   (record it), `baseRefName=main`, `mergeable=MERGEABLE`,
   `mergeStateStatus=CLEAN`, exactly 5 files changed, all 5 paths in
   the in-scope set above.
3. `gh pr diff 145 --name-only` — must equal:

   ```
   ai/reports/task-0096b-implementer.md
   tests/membership-worker/src/accept-invitation-notifications.test.ts
   tests/membership-worker/src/create-invitation-notifications.test.ts
   tests/membership-worker/src/membership-worker.test.ts
   tests/membership-worker/src/service-principal-bindings.test.ts
   ```

   If any other path appears → FAIL with exact diff names.
4. `git checkout impl/task-0096b-tests-membership-worker-class-b` (or
   `gh pr checkout 145`). Confirm `git rev-parse HEAD` matches the head
   from step 2.

### Phase 2 — Diff hazard + boundary scan

Run all of these on the PR head and record exact outputs:

1. ```
   git diff origin/main -- 'tests/membership-worker/**' \
     | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'
   ```
   Must produce **no output**. Any hit → FAIL.
2. ```
   git diff origin/main --stat
   ```
   Confirm only `tests/membership-worker/src/**` + the implementer
   report file appear.
3. ```
   git diff origin/main -- ':(exclude)tests/membership-worker/**' \
                            ':(exclude)ai/reports/task-0096b-implementer.md'
   ```
   Must produce **no output**.
4. Confirm the `authorization-context.test.ts` file is **not** in the
   diff (the report says it was already at 0 anys; modifying it would
   contradict the report).

### Phase 3 — Local install + targeted gates

1. `pnpm install --frozen-lockfile` — must be a no-op (no lockfile
   changes since PR didn't touch `package.json` / `pnpm-lock.yaml`).
2. `pnpm --filter @saas/membership-worker-tests lint` — exit 0,
   **0 warnings**. Record the exit code and the
   "X problems (Y errors, Z warnings)" line. Anything other than `0
   problems` → FAIL.
3. `pnpm --filter @saas/membership-worker-tests test` — exit 0. Record
   the "Test Suites" / "Tests" line. Must be **5 passed, 5 total** /
   **244 passed, 244 total** (the report's claim). Any drift → FAIL.
4. `pnpm --filter @saas/membership-worker-tests exec tsc --noEmit` —
   exit 0.
5. `pnpm -r typecheck` — exit 0 (Task 0091 baseline must hold).
6. `pnpm -r --no-bail lint` — exit 0, residual must be **277 warnings,
   0 errors**, distributed only across `tests/<workspace>` packages
   (apps-source 0). Record the per-workspace breakdown. Acceptable
   tolerance: **≤277 warnings is acceptable** (someone may have done
   side-cleanup on a different branch landing in `main` that further
   reduced the surface; greater-than-277 → FAIL because that means the
   diff regressed lint elsewhere).

### Phase 4 — Behaviour preservation spot-check

Sample-check 3 representative `it(...)` titles from the diff against
`main` @ `d2187f1`:

```
git show d2187f1:tests/membership-worker/src/membership-worker.test.ts \
  | grep -cE "^\s*(it|test)\("
git show HEAD:tests/membership-worker/src/membership-worker.test.ts \
  | grep -cE "^\s*(it|test)\("
```

Counts must be equal. Repeat for the other three modified files.

If any count differs → the diff added or removed test cases (forbidden
by the prompt) → FAIL with the file name and the delta.

### Phase 5 — PR-CI log inspection (not just status)

1. `gh pr checks 145` — confirm both `plan` and
   `membership-worker-tests · dev · Verify` are PASS on the latest head.
2. `gh run view <run-id> --log` (or `--log-failed` for a quick scan
   first) on the most recent CI run for `d68cf19` — confirm:
   - The `membership-worker-tests · dev · Verify` job actually executed
     `pnpm --filter @saas/membership-worker-tests test` (or whatever
     command the composition resolves to) and reported 244 passed.
   - No silent skip / early-exit pattern.
3. Confirm `orun plan --changed --intent intent.yaml --output
   plan.json` ran in the `plan` job and emitted a single-component
   plan (membership-worker-tests). Run-of-the-mill non-zero job count
   is fine; **zero job count would mean the plan didn't pick up the
   diff** — if so, FAIL.

### Phase 6 — Merge (only if Phases 1-5 PASS)

1. `gh pr merge 145 --squash --delete-branch --admin=false` — squash
   merge.
2. `git checkout main && git pull --ff-only origin main`. Record the
   new `main` SHA.
3. Watch post-merge main-CI: `gh run watch <run-id>` (find with
   `gh run list --branch main --limit 3`). All jobs must end in
   SUCCESS. Record the run ID and final job count.
4. `git status --short` — must be empty. If anything verifier-created
   sits in the worktree, commit it to a follow-up or drop it before
   ending the task. Do **not** leave dirty state.

### Phase 7 — State + report

If PASS:

1. Write `ai/reports/task-0096b-verifier.md` per the orchestrator
   verifier-report template (Result / Checks / Issues / Risk Notes /
   Spec Proposals / Recommended Next Move). Concise — bullet form.
   Recommended-next-move bullet should point at the next class-B
   tests/** wave (next-largest after membership-worker is
   `tests/config-worker` at 126 warnings, then `tests/identity-worker`
   at 80) so the orchestrator can scope Task 0096c without re-reading
   the residual breakdown.
2. Update `ai/state.json`:
   - Add `"0096b"` to `completed`.
   - Update `current_task` to the orchestrator's next scoping (the
     orchestrator will overwrite this; just don't leave it stale —
     blank or `"orchestrator"` is acceptable).
   - Update `last_verified` to the merge timestamp.
   - Add a `notes` entry summarizing PR #145 merge SHA, post-merge CI
     run ID, residual-warning count, and the "next-largest workspace"
     pointer.
   - Set `task_agent` to `/ai/reports/task-0096b-verifier.md`
     immediately after writing that file.
3. Update `ai/context/current.md` and `ai/context/task-ledger.md` with
   the durable Task 0096b outcome (one paragraph in current.md, one
   ledger entry).
4. Commit those `ai/**` updates directly to `main` (post-merge
   bookkeeping commit).

If FAIL:

1. Leave PR #145 OPEN. Do not merge.
2. Write `ai/reports/task-0096b-verifier.md` with explicit, copy-pastable
   reproducer commands for every blocker.
3. Update `ai/state.json.notes` with a one-line "Task 0096b verifier
   FAIL — see report" entry. Do **not** mark completed.
4. Set `task_agent` to `/ai/reports/task-0096b-verifier.md`.

## Acceptance Criteria

- All Phase 1–5 checks recorded with exact commands and outputs.
- PR #145 squash-merged into main with post-merge main-CI green
  **OR** explicit FAIL report with reproducer commands.
- `git status --short` empty at end of task.
- Local `main` fast-forwarded to `origin/main`.
- `task_agent` in `ai/state.json` points to the verifier report.

## Non-Goals

- Re-litigating the implementer's choice of in-file structural types
  vs. `_types.ts`. The Architect Brief in `ai/tasks/task-0096b.md`
  granted that latitude. Verifier checks Constraints, hazard scan,
  test counts, and quality gates — not taste.
- Touching PR #143 / Track A / `apps/api-edge/**` /
  `infra/terraform/cloudflare-kv/**` / `tests/api-edge/**`.
- Scoping Task 0096c. The verifier only **points at** the next-largest
  workspace; the orchestrator decides what wave 3 actually looks like.
- Running the orun pipeline locally — this PR is a
  test-only no-infra change; PR-CI's `plan` job already exercises the
  orun plan path on the diff.

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

`ai/reports/task-0096b-verifier.md` per the orchestrator template,
followed by the state-file and context-file updates committed directly
to `main`.
