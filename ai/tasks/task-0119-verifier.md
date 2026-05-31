# Task 0119 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0119 implementer pass is **complete on PR #174** (HEAD
  `f0ac5cec974c5aa9792a58cf6ede3859180dde07`, OPEN, MERGEABLE, mergeStateStatus
  CLEAN). Base `main`. Sealed snapshot main: `eda4a3a` (Task 0118 squash) →
  scope commits `f350bbf` (ci bump) + `f0ac5ce` (report PR# fixup).
- Diff is EXACTLY 2 files: `.github/workflows/ci.yml` (+5/−5) and
  `ai/reports/task-0119-implementer.md` (+94, NEW). Implementer report is on the
  PR branch with real PR `#174` — **no Phase-0 reconstruction fix-up needed.**
- This is an **infra/tooling-only PR** (CI workflow). It is NOT an Orun
  component change — there is no `component.yaml`, no package, no deploy lane,
  no live-URL surface. Orun changed-plan keys off `intent.yaml` component paths,
  not `.github/**`, so `orun plan --changed` is EXPECTED to be empty (0
  components / 0 jobs) and the `run` job is skipped by the `if: job-matrix != '[]'`
  guard. PR-CI therefore shows only the `plan` job. That is the correct shape —
  do NOT treat an empty changed-plan or a single-job PR-CI run as a failure.
- The verification surface is: (a) the four-token bump is exactly right and
  nothing else moved, and (b) the PR-CI `plan` job ran on the new action majors
  and the Node 20 deprecation banner no longer fires for the four bumped actions.

## Objective

Verify PR #174 against Task 0119 (`ai/tasks/task-0119.md`) and the Verifier
Standard (`agents/orchestrator.md`). On PASS: squash-merge, sync local main,
watch the post-merge main-CI run, and file the verifier report + Phase-8
bookkeeping. On FAIL: leave the PR open with documented blockers.

## PR Boundary (must match exactly)

1. `.github/workflows/ci.yml` — four action-ref token bumps ONLY:
   - line 19 `actions/checkout@v4` → `@v6` (plan job)
   - line 40 `actions/upload-artifact@v4` → `@v7`
   - line 55 `actions/checkout@v4` → `@v6` (run job)
   - line 56 `actions/download-artifact@v4` → `@v8`
   - line 60 `docker/login-action@v3` → `@v4`
2. `ai/reports/task-0119-implementer.md` — NEW.

No other file. No third file. No whitespace/reorder churn inside `ci.yml`.

## Read First

- `ai/tasks/task-0119.md` — original implementer scope, constraints, acceptance.
- `ai/reports/task-0119-implementer.md` — what the implementer did + pin-style
  rationale (floating major) + Remaining Gaps (`actions/cache`, `orun-action`
  transitive Node 20 surface — both out of scope).
- `.github/workflows/ci.yml` on the PR branch — confirm the four refs + byte
  identity of everything else.
- `agents/orchestrator.md` — Verifier Standard + Verifier Merge Protocol.

## Verification (phased)

**Phase 0 — Readiness.** Confirm working tree clean; implementer report present
on the PR branch with real PR `#174` (no reconstruction needed). Confirm
`gh pr view 174 --json state,mergeable,mergeStateStatus` = OPEN / MERGEABLE /
CLEAN.

**Phase 1 — PR sanity / boundary.** `gh pr view 174 --json files` = EXACTLY the
2 files above. `git diff origin/main...impl/task-0119-ci-actions-node24-bump --
.github/workflows/ci.yml` = exactly the four-token bump (5 changed lines),
nothing else.

**Phase 2 — Byte-identity guard (forbidden-zone scan).** Confirm byte-identical
vs `main` for: both `sourceplane/orun-action@v1.2.0` pins (lines 22, 65), both
`orun` step bodies + args, the `env:` block, `permissions:`, the `run`-job
`matrix`/`strategy`, all job names (`plan`, `${{ matrix.job-name }}`), and the
`if:` guard. Confirm NO touch to `intent.yaml`, any `component.yaml`, any
package, any other workflow file, `kiox.lock`, `plan.json`, or lockfiles.

**Phase 3 — Version correctness.** Confirm the four targets ship the Node 24
runtime at the chosen majors: `checkout@v6`, `upload-artifact@v7`,
`download-artifact@v8`, `docker/login-action@v4`. Confirm upload (v7) /
download (v8) are a compatible artifact-handoff pair (the PR-CI plan→artifact
upload succeeding, plus the maintained-in-lockstep family, is the proof; the
`run` job being skipped on an empty changed-plan means the download leg is not
exercised in THIS PR-CI — note that explicitly and rely on the family
compatibility + post-merge runs for the download side).

**Phase 4 — Orun local gates.** Run:
- `kiox -- orun validate --intent intent.yaml` (or
  `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`) → valid.
- `kiox -- orun plan --changed --base origin/main --intent intent.yaml --output plan.json`
  → EXPECTED empty (0 components × 3 envs → 0 jobs). Record verbatim; this is a
  no-op for a `.github/**`-only diff, NOT a failure.
- Revert any `kiox.lock` mutation; do not commit `plan.json`.

**Phase 5 — PR-CI log inspection (the real proof).** `gh pr checks 174` +
`gh run view <run-id> --log`. Confirm:
- The `plan` job is SUCCESS and ran on `actions/checkout@v6` +
  `actions/upload-artifact@v7` (grep the log for `actions/checkout@v6` /
  `upload-artifact@v7` download-action lines — already observed in run
  26711979395).
- The Node 20 deprecation annotation no longer fires for checkout /
  upload-artifact / download-artifact / docker-login. (`actions/cache` may still
  appear — out of scope per the implementer report; that does NOT block.)
- The `run` job is correctly `skipping` (empty changed-plan) — expected shape.

**Phase 6 — Merge (PASS only).** If all green: `gh pr merge 174 --squash
--delete-branch` (use `--admin` only if auto-merge is disabled and checks are
green). If BEHIND main, `gh pr update-branch 174` first and re-confirm PR-CI
green before merging (recurring 0103–0118 pattern).

**Phase 6.5 — Post-merge main-CI watch.** After merge, watch the main-CI run at
the squash SHA. Confirm it is green and that the four bumped actions no longer
carry the Node 20 banner in the main-CI `plan` job log. (No deploy/live-URL
probe — this is a tooling-only change with no deployed component.)

**Phase 7 — Verifier report.** Write `ai/reports/task-0119-verifier.md` with:
Result: PASS|FAIL, Checks, Issues, CI Log Review, Spec Proposals (none
expected), Risk Notes, Recommended Next Move.

**Phase 8 — Bookkeeping (PASS).** On main: update `ai/state.json` (add `0119` to
completed, advance `current_task`, refresh `notes` + `last_verified`),
`ai/context/current.md`, `ai/context/task-ledger.md` (mark Task 0119 verified +
merged), and `ai/context/orchestrator-brief.md` if used. Commit + push on main.
On FAIL: PR comment + report on the PR branch, no merge, document blockers.

## Acceptance Criteria

✅ PR #174 maps EXACTLY to Task 0119 (2-file boundary, four-token bump)
✅ `orun-action@v1.2.0` + both `orun` step bodies + env/permissions/matrix/job
   names byte-identical to main
✅ `kiox -- orun validate` passes; `orun plan --changed` empty/no-op (expected)
✅ PR-CI `plan` job green on the new majors; Node 20 banner gone for the four
   bumped actions (confirmed via `gh run view --log`, not just the summary)
✅ No `kiox.lock`/`plan.json`/lockfile/component drift on the branch
✅ MergeStateStatus CLEAN; post-merge main-CI green with banner dropped
✅ If any check fails → Result: FAIL, PR stays open with clear blockers

## PR Creation Requirement

The Implementer has already created PR #174. Your job is to verify it, and on
PASS merge it and commit the Phase-8 bookkeeping on main.

## When Done Report

`ai/reports/task-0119-verifier.md` — Result, Checks, Issues, CI Log Review,
Spec Proposals, Risk Notes, Recommended Next Move.
