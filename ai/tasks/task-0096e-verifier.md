# Task 0096e — Verifier

Agent: Verifier

## Current Repo Context

This prompt is **sealed** at orchestrator scope time and is runnable
the moment the Task 0096e implementer opens a PR on
`impl/task-0096e-class-b-warning-cleanup-wave-5`. It mirrors the
shape of `ai/tasks/task-0096b-verifier.md` and
`ai/tasks/task-0096d-verifier.md`.

Baseline reference SHA: **`b565687`** (orchestrator scope commit for
Task 0096d, the tip of `origin/main` at the moment Tasks 0096c, 0096d,
and 0096e were all scoped). All "vs main" comparisons in this verifier
use this SHA.

In-flight context:
- PR #143 (Track A — Task 0095.1) head still `db00843`,
  CONFLICTING vs main; sealed verifier prompt at
  `ai/tasks/task-0095.1-verifier.md`.
- Task 0096c (`tests/config-worker` 126 → 0) — implementer phase in
  flight on `impl/task-0096c-tests-config-worker-class-b`, no PR
  yet. Sealed verifier prompt at `ai/tasks/task-0096c-verifier.md`.
- Task 0096d (`tests/identity-worker` 80 → 0) — implementer phase in
  flight on `impl/task-0096d-tests-identity-worker-class-b`, no PR
  yet. Sealed verifier prompt at `ai/tasks/task-0096d-verifier.md`.

If any of those merged ahead by the time this verifier runs, the
residual lint expectations at the bottom of Phase 3 shift; treat the
table in the implementer's Required Outcomes as authoritative.

## Objective

Verify that PR #NNNN (the Task 0096e implementer PR) ships **only**
the in-scope diff (six files in five `tests/**` workspaces +
`ai/reports/task-0096e-implementer.md`), holds every Task 0096e
acceptance criterion, leaves apps source warnings at 0, and is
mergeable on a clean fast-forward. PASS → squash merge + main fast-
forward + post-merge main-CI watch + state bookkeeping. FAIL → leave
PR open with clear blockers.

## PR Boundary (must match implementer)

Files allowed in the diff vs `main` @ `b565687`:

1. `tests/projects-worker/src/projects-worker.test.ts`
2. `tests/events-worker/src/events-worker.test.ts`
3. `tests/policy-engine/src/api-key-policy.test.ts`
4. `tests/policy-engine/src/policy-engine.test.ts`
5. `tests/policy-worker/src/policy-worker.test.ts`
6. `tests/webhooks-worker/src/delivery.test.ts`
7. `ai/reports/task-0096e-implementer.md` (NEW)

Anything else in the diff is a hard FAIL.

`tests/webhooks-worker/src/webhooks-worker.test.ts` must be
byte-identical vs `main` @ `b565687`.

## Read First

- `ai/tasks/task-0096e.md` — implementer prompt (scope contract).
- `ai/reports/task-0096e-implementer.md` — implementer's report on
  the PR head.
- `agents/orchestrator.md` — Verifier Standard, Verifier Merge
  Protocol (sections 377–419).
- `ai/reports/task-0096b-verifier.md` — canonical 7-phase shape
  this verifier mirrors.
- `tooling/eslint/index.js` — must remain unchanged on the PR diff.

## Phase 1 — PR sanity

1. Find the PR:
   ```
   gh pr list --head impl/task-0096e-class-b-warning-cleanup-wave-5 \
     --json number,title,headRefOid,mergeable,mergeStateStatus,state \
     --jq '.[]'
   ```
   Record PR number, head SHA, `mergeable`, `mergeStateStatus`.
2. Confirm:
   - PR title starts with `test(class-b-wave-5)` and references
     Task 0096e.
   - PR is OPEN, not draft.
   - `mergeStateStatus` is `CLEAN` or `UNSTABLE` (not
     `DIRTY`/`BEHIND`/`BLOCKED`). If `BEHIND`, instruct rebase and
     re-run.
3. Confirm the implementer report's `PR Number` field matches the
   actual PR number — no `TBD`, no `#[PR]` placeholder.

## Phase 2 — Hazard + boundary scan

Fetch PR head locally:
```
gh pr checkout <PR#>
git fetch origin main
```

1. **File-list boundary**:
   ```
   git diff --name-only origin/main...HEAD
   ```
   Expected exactly: the six source files plus
   `ai/reports/task-0096e-implementer.md`. Anything else → FAIL.

2. **Byte-identical check** for the zero-baseline file:
   ```
   git diff origin/main -- tests/webhooks-worker/src/webhooks-worker.test.ts
   ```
   Must be empty.

3. **Hazard grep** (no new escape hatches):
   ```
   git diff origin/main -- 'tests/projects-worker/**' \
     'tests/events-worker/**' 'tests/policy-engine/**' \
     'tests/policy-worker/**' 'tests/webhooks-worker/**' \
     | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'
   ```
   Must emit nothing. Any `+` line containing those tokens → FAIL.

4. **No cross-territory touches**: confirm no file under
   `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`,
   `specs/**`, `tests/membership-worker/**`,
   `tests/config-worker/**`, `tests/identity-worker/**`, or
   `tests/api-edge/**` appears in the diff. Any such file → FAIL.

## Phase 3 — Local gates

Run from repo root with the PR head checked out:

1. Per-workspace lint, must each exit 0 with 0 warnings:
   ```
   pnpm --filter @saas/projects-worker-tests lint
   pnpm --filter @saas/events-worker-tests   lint
   pnpm --filter @saas/policy-engine-tests   lint
   pnpm --filter @saas/policy-worker-tests   lint
   pnpm --filter @saas/webhooks-worker-tests lint
   ```

2. Per-workspace test, must each exit 0 with the parity counts:
   ```
   pnpm --filter @saas/projects-worker-tests test
     # 1 file / 170 tests
   pnpm --filter @saas/events-worker-tests   test
     # 1 file / 20 tests
   pnpm --filter @saas/policy-engine-tests   test
     # 2 files / 177 tests (9 + 131 + 37 in the policy-engine.test.ts
     # baseline already includes some non-it tests; rely on file count
     # and total)
   pnpm --filter @saas/policy-worker-tests   test
     # 1 file / 20 tests
   pnpm --filter @saas/webhooks-worker-tests test
     # 2 files / 66 tests (28 + 38)
   ```

3. Workspace-wide gates:
   ```
   pnpm -r typecheck
   pnpm -r --no-bail lint
   ```
   - `typecheck` exit 0 (Task 0091 baseline).
   - `lint` exit 0. Residual warning count interpretation:
     - All three other waves still open: ≤ 251.
     - Task 0096d already merged: ≤ 171.
     - Task 0096c already merged: ≤ 125.
     - Both merged: ≤ 45.
     - Track A merged: subtract 45.
     The exact number must be consistent with the union of merged
     waves; any tests/** other than the eight known workspaces
     showing warnings → FAIL.

4. Apps-source invariant (Task 0096):
   ```
   pnpm -r --no-bail lint 2>&1 \
     | grep -E '@typescript-eslint/no-explicit-any|no-console' \
     | grep -v 'tests/'
   ```
   No output → PASS. Any output → FAIL.

5. Per-file `it()` count parity vs `main` @ `b565687`:
   ```
   for f in tests/projects-worker/src/projects-worker.test.ts \
            tests/events-worker/src/events-worker.test.ts \
            tests/policy-engine/src/api-key-policy.test.ts \
            tests/policy-engine/src/policy-engine.test.ts \
            tests/policy-worker/src/policy-worker.test.ts \
            tests/webhooks-worker/src/delivery.test.ts; do
     base=$(git show origin/main:$f 2>/dev/null | grep -cE '^\s*it\(')
     head=$(grep -cE '^\s*it\(' "$f")
     echo "$f base=$base head=$head $([ $base -eq $head ] && echo OK || echo MISMATCH)"
   done
   ```
   Expected: 170 / 20 / 9 / 131 / 20 / 28 unchanged. Any MISMATCH →
   FAIL.

## Phase 4 — Behaviour-preservation review

1. Read each touched file's diff vs `b565687`. Confirm:
   - No assertion text edited.
   - No fixture data values mutated (only the *types annotating*
     them).
   - No `it()` / `describe()` titles changed.
   - No suite ordering changed.
   - No new mocks added or existing mocks removed.
2. Spot-check the implementer's Type Sources table: for at least
   three replacements, open the cited source export and confirm
   the type genuinely exists with the claimed shape.
3. If any in-file structural type was introduced (vs imported from a
   real export), the report must explain why. Missing rationale →
   FAIL with "type-source rationale gap" blocker.

## Phase 5 — PR-CI log inspection

```
gh pr checks <PR#>
gh run list --branch impl/task-0096e-class-b-warning-cleanup-wave-5 \
  --limit 5 --json databaseId,name,conclusion,event,headSha
```

Required:
- The latest run on the PR head is conclusion `success`.
- Jobs that fired: `plan` + `*-tests · dev · Verify` profiles for
  the five affected test workspaces. **No deploy-gated jobs** should
  fire (no `apps/**` or `infra/**` changes).
- Inspect the `plan` job log; the change-detected component list
  should include exactly the five test workspaces (or their pinned
  components per `intent.yaml`).
- If any job failed or was skipped unexpectedly → FAIL with the run
  ID and job name in the blocker.

## Phase 6 — Squash merge + post-merge main-CI watch

If Phases 1–5 all PASS:

1. Squash-merge the PR:
   ```
   gh pr merge <PR#> --squash --delete-branch \
     --subject "test(class-b-wave-5): drain 26 no-explicit-any across five small tests/** workspaces (Task 0096e) (#NNNN)"
   ```
2. Sync local main:
   ```
   git checkout main
   git pull --ff-only origin main
   git status --short    # must be empty
   ```
3. Capture the squash SHA on `origin/main`:
   ```
   git log --oneline -1
   ```
4. Watch the post-merge main-CI run:
   ```
   gh run list --branch main --limit 5 \
     --json databaseId,headSha,name,conclusion,event,createdAt \
     --jq '.[] | select(.event=="push") | .'
   ```
   - Wait for the run on the new squash SHA to reach `completed`.
   - Required: all jobs `success`. The class-B-wave-5 PR touches
     no `apps/**`/`infra/**`, so post-merge main-CI should be the
     same shape as the PR-CI rollup (plan + 5 `*-tests · dev ·
     Verify`). If extra jobs fire, that's a state drift signal —
     investigate before declaring PASS.

## Phase 7 — State bookkeeping

On PASS, update in this order:

1. Write `ai/reports/task-0096e-verifier.md` with sections:
   - **Result**: PASS
   - **Checks**: every command from Phases 2–5 with its outcome.
   - **CI Log Review**: PR-CI rollup SHA + run ID; post-merge
     main-CI SHA + run ID + total job count + all-success line.
   - **Issues**: none (or non-blocking notes).
   - **Risk Notes**: residual surface state; which other waves are
     still open.
   - **Spec Proposals**: links only.
   - **Recommended Next Move**: dynamically pick the next wave
     based on what's still open (priority order):
     a. Track A / Task 0095.1 verifier resumption if PR #143 has
        finally been rebased.
     b. The remaining open Track-B wave (whichever of 0096c /
        0096d hasn't merged yet) — verifier prompt already sealed.
     c. Task 0097 (rate limiting, B3 second half) — gated on
        Track A merging.
     d. If only `tests/api-edge` (45) remains and Track A has
        merged, scope a new wave-6 prompt for it.
2. Append a `## Task 0096e` entry to
   `ai/context/task-ledger.md` (status `verified and merged
   (PASS)`, agent Verifier, PR number, squash SHA, post-merge
   main-CI run ID, type-source summary in 1–2 bullets).
3. Update `ai/state.json`:
   - Append `"0096e"` to `completed`.
   - `current_task` → next selected (orchestrator's call after
     this verifier closes; safe placeholder is the same wave-5
     residual phrasing).
   - `task_agent` → `/ai/reports/task-0096e-verifier.md`.
   - `last_verified` → ISO timestamp at squash-merge time.
   - `repo_health` → `green` if post-merge main-CI was 100%
     success.
   - Append a one-line `notes[]` entry summarizing the verify +
     merge.
4. Update `ai/context/current.md`:
   - Move Task 0096e from "Active task" / open-PR-track section to
     a "Recently completed — Task 0096e" block (mirror the 0096b
     block's shape).
   - Update the residual-warning distribution table at the tail to
     reflect the post-0096e numbers (subtract 26).
5. Commit + push to main:
   ```
   git add ai/reports/task-0096e-verifier.md \
           ai/context/task-ledger.md \
           ai/state.json \
           ai/context/current.md
   git commit -m "chore(ai): record Task 0096e verifier PASS + merge bookkeeping"
   git push origin main
   git status --short    # must be empty
   ```

On FAIL: leave PR open. Write the same verifier report with
`Result: FAIL`, populated `Issues` (each blocker with file/line/
command output), and `Recommended Next Move` = "Task 0096e
implementer fix-up". Do NOT merge. Do NOT delete the branch. Do
NOT update `state.json` `completed`. Update `ai/context/current.md`
to reflect the FAIL and the open PR. Commit + push the report and
context updates only.

## Acceptance Criteria

- ✅ Phase 1 PR sanity passes (CLEAN/UNSTABLE, real PR number in
  report).
- ✅ Phase 2 boundary + hazard grep clean; zero-baseline file
  byte-identical.
- ✅ Phase 3 all five per-workspace lints exit 0/0; all five
  per-workspace tests at parity counts; `pnpm -r typecheck` exit 0;
  `pnpm -r --no-bail lint` exit 0 with residual matching the wave-
  state table; apps-source class-B still 0.
- ✅ Phase 4 behaviour preservation review: no assertion / fixture /
  ordering / title drift; type-source rationale present.
- ✅ Phase 5 PR-CI: latest run success; only `plan` + the five
  `*-tests · dev · Verify` jobs fired.
- ✅ Phase 6 squash-merge clean; main fast-forward; post-merge main-
  CI all success.
- ✅ Phase 7 state files updated and committed; verifier report
  filed.

## Verifier Pitfalls (carry-over from 0096b/c/d)

- Implementer report not committed to the PR branch is a recurring
  gap. If `git ls-tree origin/<head> --name-only
  ai/reports/task-0096e-implementer.md` returns empty, commit + push
  it to the PR branch and re-run Phase 5 before merging.
- `pnpm -r --no-bail lint` residual count drifts as 0096c / 0096d /
  Track A merge. Don't FAIL on a number; FAIL on (a) wrong
  workspaces appearing or (b) apps-source warnings reappearing.
- Don't merge until both PR-CI **and** post-merge expectations are
  understood. For this PR there are no deploy-gated jobs, so post-
  merge main-CI is the same shape as PR-CI; if extra jobs fire on
  main-CI but not on PR-CI, treat that as a state drift and pause.
