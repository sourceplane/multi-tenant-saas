# Task 0117 — Verifier

Agent: Verifier

## Current Repo Context

- Implementer completed Task 0117 (stabilize-first): synced the local
  `VALID_CONTEXTS: BoundedContext[]` literal in `tests/db/src/migrations.test.ts`
  with the authoritative `BoundedContext` union in `packages/db/src/types.ts` by
  adding the 10th member `"notifications"` (already declared by a real migration
  at `packages/db/src/manifest.ts:116`).
- PR #172 OPEN, MERGEABLE/CLEAN, base main `5b7bd17` (Task 0116 close + 0117
  scope commit). Two commits: `f15e0b3` (code) + `e6181a5` (impl report).
- This closes the long-standing baseline red test documented across Task
  0113/0115 reports and current.md recommended-next-focus #2.

## Objective

Verify PR #172 maps EXACTLY to Task 0117 scope (single-line test literal sync +
implementer report), confirm `@saas/db-tests` is 516/516 green, no forbidden-zone
touches, PR-CI green, then merge and finalize state.

## PR Boundary

- `tests/db/src/migrations.test.ts` — MODIFIED, +1 line (`"notifications"`)
- `ai/reports/task-0117-implementer.md` — NEW

No other file may appear in the diff.

## Read First

- `ai/tasks/task-0117.md` — original implementer scope
- `ai/reports/task-0117-implementer.md` — what was done
- `agents/orchestrator.md` — Verifier Standard + Merge Protocol
- `packages/db/src/types.ts` — confirm `BoundedContext` union is the source of truth

## Required Outcomes

- [ ] PR diff is EXACTLY the 2-file boundary; single-line literal add
- [ ] No edits to `packages/db/**`, lockfiles, package.json, component.yaml,
      or any other `tests/db/**` source
- [ ] `pnpm --filter @saas/db-tests test` = 516/516 green
- [ ] `pnpm --filter @saas/db typecheck` = 0 errors
- [ ] Orun validate/plan/run-dry-run green; changed-plan selects ONLY db-tests
- [ ] PR-CI 2/2 SUCCESS (plan + db-tests·dev·Verify) verified via `gh run view --log`
- [ ] `kiox.lock` not mutated on the PR branch
- [ ] Verifier report at `ai/reports/task-0117-verifier.md`

## Non-Goals

- No deriving `VALID_CONTEXTS` from the type union (explicitly deferred hygiene item)
- No production source change
- No new test cases

## Constraints

- Single-component turbo PR: db-tests subscribes dev · quick-check only
  (1 component × 1 env = 1 job + plan). Do NOT expect stage/prod lanes.
- If BEHIND main, rebase via `gh pr update-branch 172` before merge.

## Acceptance Criteria

✅ PR #172 corresponds exactly to Task 0117
✅ 2-file boundary, single-line diff
✅ 516/516 db-tests green (was 515/516)
✅ @saas/db typecheck 0
✅ Orun changed-plan = 1 component (db-tests) only
✅ PR-CI 2/2 SUCCESS via gh run view --log
✅ No forbidden-zone hits, no kiox.lock mutation
✅ MergeStateStatus CLEAN

## Verification

Run local db-tests + typecheck, Orun gates, inspect PR diff for boundary,
scan for forbidden-zone hits, confirm PR-CI logs show the Verify step actually
ran. If all green, squash-merge, sync local main, clean branch.

## PR Creation Requirement

The Implementer has already created PR #172. Your job is to verify it.

## When Done Report

`/ai/reports/task-0117-verifier.md` with: Result (PASS|FAIL), Checks, Issues,
CI Log Review, Spec Proposals, Risk Notes, Recommended Next Move.
