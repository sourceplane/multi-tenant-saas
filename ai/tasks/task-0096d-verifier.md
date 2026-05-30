# Task 0096d — Verifier

Agent: Verifier

## Status

**Sealed and ready to run as soon as the Task 0096d implementer pushes
a PR.** The orchestrator scopes this prompt up-front (mirroring the
`task-0095.1-verifier.md`, `task-0096b-verifier.md`, and
`task-0096c-verifier.md` pattern) so the verifier loop activates the
moment PR-CI rolls up green on the implementer's PR. If you are reading
this and no PR exists yet for branch
`impl/task-0096d-tests-identity-worker-class-b`, stop — the
implementer phase is still in flight.

## Current Repo Context

Task 0096d is **wave 4** of class-B lint cleanup (the
`@typescript-eslint/no-explicit-any` drain track). It targets
`tests/identity-worker` — the next-largest residual `tests/**`
workspace that is parallel-safe with both Track A (PR #143) and Task
0096c, at **80 warnings**, all `no-explicit-any`, concentrated in 5
of the 8 source files.

Implementer prompt: `ai/tasks/task-0096d.md`.
Implementer branch: `impl/task-0096d-tests-identity-worker-class-b`.
Expected report path: `ai/reports/task-0096d-implementer.md`.

Reported invariants the implementer must hit (lifted from the prompt):

- 80 `@typescript-eslint/no-explicit-any` warnings inside
  `tests/identity-worker/src/**` → 0.
- Workspace-wide residual lint: 277 → ≤ 197 if Task 0096c has not
  merged yet, or ≤ 71 if it has merged ahead of this PR. Apps-source
  still 0 — Task 0096 invariant preserved.
- Only the 5 carrying-files modified:
  `api-key-admin.test.ts` (33 → 0),
  `security-events.test.ts` (22 → 0),
  `profile.test.ts` (13 → 0),
  `login-start-notifications.test.ts` (8 → 0),
  `helpers/fake-repository.ts` (4 → 0).
- The three zero-baseline source files —
  `auth-service.test.ts` (0 anys, 51 `it()`),
  `envelope.test.ts` (0 anys, 8 `it()`),
  `resolve-bearer.test.ts` (0 anys, 12 `it()`) — must NOT appear in
  the diff and must be byte-identical vs `main` @ `b0bc233`.
- Test surface unchanged: `pnpm --filter @saas/identity-worker-tests
  test` reports the same suite + test counts the implementer recorded
  in the report; per-file `it()/test()` count parity vs `main` @
  `b0bc233` (the orchestrator-scope HEAD).
- Hazard scan empty: no `eslint-disable*`, `@ts-ignore`,
  `@ts-expect-error`, or `as unknown as` introduced in the diff.
- 6 files changed (5 modified source files + 1 new implementer report);
  optionally 1 additional in-workspace `_types.ts` or `helpers/*` file
  if the implementer judged it warranted.

PR #143 (Track A — Task 0095.1) and the in-flight Task 0096c PR (when
opened) are out of scope for this verifier — do not touch any file
under `apps/api-edge/**`, `infra/terraform/cloudflare-kv/**`,
`tests/api-edge/**`, or `tests/config-worker/**`.

## Objective

Verify that the Task 0096d PR holds the documented invariants, run the
local quality gates, confirm PR-CI logs show the expected commands
actually ran, and close the loop:

- **PASS** — squash-merge the PR into `main`, fast-forward local `main`
  from `origin/main`, watch post-merge main-CI to SUCCESS, leave the
  local repo clean. Then write
  `ai/reports/task-0096d-verifier.md` and update state.
- **FAIL** — leave the PR OPEN with explicit, reproducible blockers in
  the verifier report. The orchestrator will scope a Task 0096d.1
  follow-up from there.

## PR Boundary You Are Validating

In scope (must hold):

- Diff confined to `tests/identity-worker/src/**/*.ts` (max 6 files:
  the five carrying-files, plus an optional in-workspace
  `_types.ts` / `helpers/*` shared types file) plus
  `ai/reports/task-0096d-implementer.md`. Nothing else.
- No new files outside that path. No deletions of unrelated files.

Out of scope (must NOT appear in the diff):

- `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`,
  `specs/**`.
- Any other `tests/<workspace>/**` directory (in particular: NOT
  `tests/api-edge/**` — Track A territory; NOT
  `tests/config-worker/**` — Task 0096c territory).
- `pnpm-lock.yaml`, `package.json` (any), `intent.yaml`, `kiox.lock`,
  `tsconfig*.json`.
- Any change to `tests/identity-worker/package.json`,
  `tests/identity-worker/tsconfig*.json`, or
  `tests/identity-worker/eslint.config.*`.
- The three zero-baseline source files —
  `auth-service.test.ts`, `envelope.test.ts`,
  `resolve-bearer.test.ts` — must NOT appear in the diff. If any
  do, FAIL even if the change looks cosmetic; the prompt's scope said
  leave them alone.

## Read First

- `ai/tasks/task-0096d.md` (the implementer prompt)
- `ai/reports/task-0096d-implementer.md`
- `ai/tasks/task-0096c-verifier.md` and the wave-2/3 verifier
  precedents (`ai/tasks/task-0096b-verifier.md`,
  `ai/reports/task-0096b-verifier.md`) — this prompt is their sibling.
- `ai/context/current.md` (Track A vs Track B framing)
- `agents/orchestrator.md` § Verifier Standard + Verifier Merge
  Protocol

## Verification Phases

### Phase 1 — Repo / PR sanity

1. `git fetch origin --prune`.
2. Find the PR: `gh pr list --head
   impl/task-0096d-tests-identity-worker-class-b --json
   number,headRefOid,baseRefName,mergeStateStatus,mergeable`. Record
   the PR number — call it `<PR>` for the rest of this prompt.
3. `gh pr view <PR> --json
   number,title,headRefName,headRefOid,baseRefName,mergeStateStatus,
   mergeable,changedFiles,additions,deletions,files,statusCheckRollup`.
   Confirm: `headRefOid` matches the head you are about to verify
   (record it), `baseRefName=main`, `mergeable=MERGEABLE`,
   `mergeStateStatus=CLEAN`, **6 or 7 files changed** (6 if the
   implementer skipped the optional shared-types helper; 7 if they
   added it), all paths in the in-scope set above.
4. `gh pr diff <PR> --name-only` — must equal one of the two allowed
   shapes:

   Shape A (no shared-types helper):
   ```
   ai/reports/task-0096d-implementer.md
   tests/identity-worker/src/api-key-admin.test.ts
   tests/identity-worker/src/helpers/fake-repository.ts
   tests/identity-worker/src/login-start-notifications.test.ts
   tests/identity-worker/src/profile.test.ts
   tests/identity-worker/src/security-events.test.ts
   ```

   Shape B (with optional shared-types helper):
   ```
   ai/reports/task-0096d-implementer.md
   tests/identity-worker/src/_types.ts        # or helpers/<something>.ts
   tests/identity-worker/src/api-key-admin.test.ts
   tests/identity-worker/src/helpers/fake-repository.ts
   tests/identity-worker/src/login-start-notifications.test.ts
   tests/identity-worker/src/profile.test.ts
   tests/identity-worker/src/security-events.test.ts
   ```

   (The optional shared-types file may have a different name — e.g.
   `_helpers.ts` or `helpers/types.ts` — as long as it lives in
   `tests/identity-worker/src/` and the report justifies it.) If any
   path falls outside `tests/identity-worker/src/**` plus the report,
   or `auth-service.test.ts` / `envelope.test.ts` /
   `resolve-bearer.test.ts` appear, FAIL with exact diff names.
5. `gh pr checkout <PR>`. Confirm `git rev-parse HEAD` matches the
   head from step 3.

### Phase 2 — Diff hazard + boundary scan

Run all of these on the PR head and record exact outputs:

1. ```
   git diff origin/main -- 'tests/identity-worker/**' \
     | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'
   ```
   Must produce **no output**. Any hit → FAIL.
2. ```
   git diff origin/main --stat
   ```
   Confirm only `tests/identity-worker/src/**` + the implementer report
   file appear.
3. ```
   git diff origin/main -- ':(exclude)tests/identity-worker/**' \
                            ':(exclude)ai/reports/task-0096d-implementer.md'
   ```
   Must produce **no output**.
4. Confirm `auth-service.test.ts`, `envelope.test.ts`, and
   `resolve-bearer.test.ts` are **not** in the diff, and verify their
   byte-identical-ness via Phase 4 below.

### Phase 3 — Local install + targeted gates

1. `pnpm install --frozen-lockfile` — must be a no-op (no lockfile
   changes since PR didn't touch `package.json` / `pnpm-lock.yaml`).
2. `pnpm --filter @saas/identity-worker-tests lint` — exit 0,
   **0 warnings**. Record the exit code and the
   "X problems (Y errors, Z warnings)" line. Anything other than
   `0 problems` → FAIL.
3. `pnpm --filter @saas/identity-worker-tests test` — exit 0. Record
   the "Test Suites" / "Tests" line. Counts must match the numbers
   the implementer report claims (and the report itself must
   reference the `main` @ `b0bc233` per-file `it()` baseline:
   `api-key-admin.test.ts` 15, `auth-service.test.ts` 51,
   `envelope.test.ts` 8, `login-start-notifications.test.ts` 4,
   `profile.test.ts` 15, `resolve-bearer.test.ts` 12,
   `security-events.test.ts` 17 = **7 suites, 122 `it()`**).
4. `pnpm --filter @saas/identity-worker-tests exec tsc --noEmit` —
   exit 0.
5. `pnpm -r typecheck` — exit 0 (Task 0091 baseline must hold).
6. `pnpm -r --no-bail lint` — exit 0. Acceptable residual depends on
   whether Task 0096c has already merged ahead of this PR:
   - If Task 0096c has merged: residual must be **≤ 71 warnings, 0
     errors** (the remaining 6 `tests/**` workspaces:
     `tests/api-edge` 45, `tests/projects-worker` 10,
     `tests/events-worker` 7, `tests/policy-engine` 7,
     `tests/policy-worker` 1, `tests/webhooks-worker` 1).
   - If Task 0096c has NOT merged: residual must be **≤ 197 warnings,
     0 errors** (`tests/config-worker` 126 still present).
   - Apps-source must remain 0.
   - Record the per-workspace breakdown. Acceptable tolerance is
     "≤ expected"; **>** the relevant cap → FAIL because that means
     the diff regressed lint elsewhere.

### Phase 4 — Behaviour preservation spot-check

Compare per-file `it()/test()` counts on the PR head vs `main` @
`b0bc233` (the orchestrator-scope commit; the immediate parent
baseline that the diff sits on top of):

```bash
for f in tests/identity-worker/src/api-key-admin.test.ts \
         tests/identity-worker/src/login-start-notifications.test.ts \
         tests/identity-worker/src/profile.test.ts \
         tests/identity-worker/src/security-events.test.ts; do
  base=$(git show b0bc233:"$f" | grep -cE '^\s*(it|test)\(')
  head=$(git show HEAD:"$f"    | grep -cE '^\s*(it|test)\(')
  echo "$f base=$base head=$head"
done
```

Counts must be equal per file (15/4/15/17). Repeat for the three
zero-baseline files and the fake-repository helper to confirm:

```bash
for f in tests/identity-worker/src/auth-service.test.ts \
         tests/identity-worker/src/envelope.test.ts \
         tests/identity-worker/src/resolve-bearer.test.ts; do
  diff <(git show b0bc233:"$f") <(git show HEAD:"$f") && \
    echo "$f IDENTICAL" || echo "$f DRIFTED -> FAIL"
done
```

Any drift in counts on the modified files OR any drift in the three
zero-baseline files → FAIL with file name and delta. The
fake-repository helper has no `it()`/`test()` counts, so just confirm
it appears in the diff with sensible structural changes (typed repo
interface replacing `any`).

### Phase 5 — PR-CI log inspection (not just status)

1. `gh pr checks <PR>` — confirm `plan` and any
   `identity-worker-tests · <env> · Verify` jobs are PASS on the
   latest head. (`tests/identity-worker` may subscribe to `dev`
   only, mirroring the membership-worker-tests pattern; whatever it
   subscribes to, every leaf must be SUCCESS.)
2. `gh run view <run-id> --log-failed` first for a fast scan; then
   `gh run view <run-id> --log` on the most recent CI run for the PR
   head. Confirm:
   - The `identity-worker-tests · ... · Verify` job actually executed
     `pnpm --filter @saas/identity-worker-tests test` (or whatever
     command the composition resolves to) and reported the same test
     count as Phase 3.
   - No silent skip / early-exit pattern.
3. Confirm `orun plan --changed --intent intent.yaml --output
   plan.json` ran in the `plan` job and emitted a plan that includes
   `identity-worker-tests`. **Zero job count** would mean the plan
   didn't pick up the diff — if so, FAIL.

### Phase 6 — Merge (only if Phases 1–5 PASS)

1. `gh pr merge <PR> --squash --delete-branch --admin=false` — squash
   merge.
2. `git checkout main && git pull --ff-only origin main`. Record the
   new `main` SHA.
3. Watch post-merge main-CI: find with `gh run list --branch main
   --limit 3`, then `gh run watch <run-id>`. All jobs must end in
   SUCCESS. Record the run ID and final job count. (Tests-only diff
   → expect a `plan`-only or `plan + identity-worker-tests · dev ·
   Verify` post-merge run; deploy-gated jobs from Tasks 0093/0096
   should not be exercised by a tests-only change.)
4. `git status --short` — must be empty. If anything verifier-created
   sits in the worktree, commit it as a follow-up bookkeeping commit
   on `main` or drop it before ending the task. Do **not** leave
   dirty state.

### Phase 7 — State + report

If PASS:

1. Write `ai/reports/task-0096d-verifier.md` per the orchestrator
   verifier-report template (Result / Checks / Issues / Risk Notes /
   Spec Proposals / Recommended Next Move). Concise — bullet form.
   Recommended-next-move bullet should point at the next class-B
   `tests/**` wave. Selection rule:
   - If Track A (PR #143 / Task 0095.1) has merged by the time you
     are writing this report, **next-largest is `tests/api-edge` 45**
     (now unblocked) for Task 0096e.
   - If Track A still has not merged, **next-largest unblocked is
     `tests/projects-worker` 10** for Task 0096e — the others below
     it (events 7, policy-engine 7, policy-worker 1, webhooks-worker
     1) are tiny enough to bundle into a single mop-up wave behind
     it.
2. Update `ai/state.json`:
   - Add `"0096d"` to `completed`.
   - Update `current_task` to `"orchestrator"` (the established
     post-merge convention).
   - Update `last_verified` to the merge timestamp (UTC ISO).
   - Update `next_focus` to point at the next wave the
     Recommended-next-move bullet identified.
   - Add a `notes` entry summarizing PR `<PR>` merge SHA, post-merge
     CI run ID, residual-warning count, and the "next-largest
     workspace" pointer.
   - Set `task_agent` to `/ai/reports/task-0096d-verifier.md`
     immediately after writing that file.
3. Update `ai/context/current.md` and `ai/context/task-ledger.md` with
   the durable Task 0096d outcome (one paragraph in current.md, one
   ledger entry under `## Task 0096d — Verifier`).
4. Commit those `ai/**` updates directly to `main` (post-merge
   bookkeeping commit) with message:
   `Task 0096d verification PASS: class-B lint cleanup wave 4
   (tests/identity-worker) — PR #<PR> merged at <SHA>, post-merge
   main-CI <run-id> SUCCESS, 80 → 0 no-explicit-any`.

If FAIL:

1. Leave the PR OPEN. Do not merge.
2. Write `ai/reports/task-0096d-verifier.md` with explicit,
   copy-pastable reproducer commands for every blocker.
3. Update `ai/state.json.notes` with a one-line "Task 0096d verifier
   FAIL — see report" entry. Do **not** mark completed. Do **not**
   advance `current_task`.
4. Set `task_agent` to `/ai/reports/task-0096d-verifier.md`.
5. Recommended next move in the report: orchestrator scopes Task
   0096d.1 fix-up (same PR, additive commits) with the exact phase
   gates that need re-run.

## Acceptance Criteria

- All Phase 1–5 checks recorded with exact commands and outputs.
- PR squash-merged into main with post-merge main-CI green **OR**
  explicit FAIL report with reproducer commands.
- `git status --short` empty at end of task.
- Local `main` fast-forwarded to `origin/main`.
- `task_agent` in `ai/state.json` points to the verifier report.
- `tests/identity-worker` per-workspace lint exits 0 with 0 warnings.
- `pnpm -r --no-bail lint` exits 0 with residual ≤ the threshold
  selected by Task 0096c's merge state (≤ 71 if 0096c merged, ≤ 197
  if not).
- `auth-service.test.ts`, `envelope.test.ts`, and
  `resolve-bearer.test.ts` byte-identical vs `main` @ `b0bc233`.
- Hazard scan empty.

## Non-Goals

- Re-litigating the implementer's choice of in-file structural types
  vs a shared `_types.ts` / `helpers/*` file. The implementer prompt
  granted that latitude. Verifier checks scope, hazard scan, test
  counts, and quality gates — not taste.
- Touching PR #143 / Track A / `apps/api-edge/**` /
  `infra/terraform/cloudflare-kv/**` / `tests/api-edge/**`.
- Touching Task 0096c's PR / `tests/config-worker/**`.
- Scoping Task 0096e. The verifier only **points at** the next-largest
  workspace; the orchestrator decides what wave 5 actually looks like.
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

`ai/reports/task-0096d-verifier.md` per the orchestrator template,
followed by the state-file and context-file updates committed directly
to `main`.
