# Task 0047 Verifier

Agent: Verifier

## Current Repo Context

- Task 0046 is verified PASS and merged via PR #89 at `3892243`. The web console Account Security view is live and main is green.
- Task 0047 implementer work is on PR #90 (`codex/task-0047-api-key-service-principal-foundation`). The PR title is `feat(identity): add service principals and API keys persistence`.
- PR #90 is currently mergeable (`mergeStateStatus: CLEAN`) and all current CI checks passed in run `26548869295`:
  - `plan`
  - `db-tests · dev · Verify`
  - `db · dev · Verify`
  - `db · stage · Verify`
  - `db · prod · Verify`
  - `db-migrate · stage · Migrate`
  - `db-migrate · prod · Migrate`
- Current repo reality shows two verifier cleanup concerns before merge:
  1. `ai/reports/task-0047-implementer.md` exists locally but is not present in the PR file list yet.
  2. The PR file list includes unrelated `ai/` carryover files from older tasks/roadmap work.
- Task 0047 is a persistence-only foundation task. No runtime route, api-edge auth, or web-console behavior belongs in this PR.

## Objective

Verify that PR #90 implements exactly the Task 0047 persistence foundation for identity-owned service principals and API keys, satisfies the spec constraints, and is safe to merge.

If the PR only needs verifier-safe cleanup to become acceptable, make that minimal fix on the PR branch, push it, wait for CI to go green again, then continue verification. If scope drift or correctness issues remain after minimal cleanup, FAIL the task and leave the PR open with explicit blockers.

## PR Boundary

This verifier pass covers exactly:

1. Identity-owned migration `060_identity_api_keys` and manifest wiring.
2. `packages/db/src/identity/**` repository types and persistence methods for service principals and API keys.
3. `tests/db/**` verification for migration shape, repository behavior, and secret-safe storage assumptions.
4. Minimal verifier-only PR cleanup needed to:
   - add the missing implementer report to the PR branch if absent;
   - remove unrelated `ai/` carryover files from the PR branch;
   - add the verifier report and any tiny verification-only correction if required.

Non-goals for this verifier pass:
- no new public or internal API routes
- no `apps/identity-worker` runtime expansion beyond what is strictly needed to verify
- no `apps/api-edge` auth-resolution changes
- no web-console work
- no roadmap reshaping or unrelated docs churn

## Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0047.md`
- `ai/reports/task-0047-implementer.md`
- `ai/state.json`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md`
- `specs/product-overview.md`
- `specs/components/02-identity.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `packages/db/src/manifest.ts`
- `packages/db/src/migrations/060_identity_api_keys/up.sql`
- `packages/db/src/identity/types.ts`
- `packages/db/src/identity/repository.ts`
- `tests/db/src/identity-migration.test.ts`
- `tests/db/src/identity.test.ts`
- PR #90 diff, commits, and CI logs

## Required Outcomes

- [ ] Confirm PR #90 maps to Task 0047 only and does not contain unrelated feature or ai/ carryover scope.
- [ ] Ensure the implementer report is committed on the PR branch.
- [ ] Remove unrelated `ai/` carryover files from the PR branch if they are still present.
- [ ] Verify the migration is identity-owned, idempotent for the autocommit runner, and secret-safe.
- [ ] Verify service principals are organization-bound and may carry optional explicit project scope.
- [ ] Verify API-key rows store only safe derivations and not raw secret material.
- [ ] Verify there are no cross-context foreign keys into `membership.*`, `projects.*`, `events.*`, or billing tables.
- [ ] Verify repository methods provide the intended persistence seam for later API-key admin/runtime work without widening into runtime behavior now.
- [ ] Verify local checks and PR CI evidence are both acceptable.
- [ ] If PASS, merge PR #90, fast-forward local `main`, and leave the repo clean.

## Non-Goals

- No API-key bearer authentication.
- No public API-key create/list/revoke route.
- No membership or policy role-assignment redesign.
- No UI for service principals or API keys.
- No speculative follow-on work for Task 0048.

## Constraints

1. Follow Constitution rule 8: raw API-key secrets, token material, and hashes must not appear in reports, logs, or public outputs beyond the stored hash/prefix design required by the persistence seam.
2. Follow Constitution rule 11: no cross-context foreign keys or direct coupling into membership/projects/events/billing tables.
3. Follow `specs/contracts/tenancy-and-rbac.md`: service principals and API keys must be organization-bound; project-scoped automation must also carry explicit organization + project semantics.
4. Treat PR hygiene as part of verification. Do not merge while unrelated `ai/` carryover files remain on the PR branch.
5. Merge only after both local verification and GitHub Actions CI are green.

## Acceptance Criteria

✅ PR #90 corresponds exactly to Task 0047 persistence-foundation scope.

✅ `ai/reports/task-0047-implementer.md` is committed on the PR branch.

✅ Unrelated `ai/` carryover files are removed from the PR branch before merge. At minimum inspect and clean any remaining copies of:
- `ai/reports/task-0044-implementer.md`
- `ai/reports/task-0044-verifier.md`
- `ai/tasks/task-0042-verifier.md`
- `ai/tasks/task-0043.md`
- `ai/tasks/task-0043-verifier.md`
- `ai/tasks/task-0044.md`
- `ai/tasks/task-0044-verifier.md`
- `ai/tasks/task-0046.md`
- `ai/tasks/task-0046-verifier.md`
- `ai/tasks/task-roadmap-2026-05-28.md`
- any other unrelated `ai/` file not required for Task 0047 verification artifacts

✅ `packages/db/src/manifest.ts` includes migration `060_identity_api_keys` in the correct order after `050_identity_security_events`.

✅ `packages/db/src/migrations/060_identity_api_keys/up.sql` is idempotent, identity-owned, and stores no raw API-key secrets.

✅ The schema keeps organization scope explicit and optional project scope explicit, without cross-context foreign keys to membership/projects/events/billing tables.

✅ `packages/db/src/identity/types.ts` and `packages/db/src/identity/repository.ts` expose a persistence seam for later API-key admin/runtime tasks without implementing public routes now.

✅ `pnpm --filter @saas/db typecheck` passes.

✅ `pnpm --filter @saas/db lint` passes.

✅ `pnpm --filter @saas/db-tests test` passes.

✅ `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml` passes.

✅ `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json` reflects the expected db/db-tests/db-migrate impact, or the verifier report documents the exact observed output.

✅ `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions` succeeds.

✅ PR CI logs show the expected checks actually ran successfully, including the plan job and the db/db-tests/db-migrate jobs.

✅ If the verifier makes a cleanup or fix commit, the rerun CI is green before merge.

✅ MergeStateStatus is `CLEAN` at merge time.

## Verification

Run and record exact results:

- `git status --short`
- `gh pr view 90 --json files,commits,statusCheckRollup,mergeStateStatus,url`
- `git ls-tree origin/codex/task-0047-api-key-service-principal-foundation --name-only ai/reports/task-0047-implementer.md`
- `pnpm --filter @saas/db typecheck`
- `pnpm --filter @saas/db lint`
- `pnpm --filter @saas/db-tests test`
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag`
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- `gh run view 26548869295 --json name,conclusion,jobs`
- any focused inspection commands needed to confirm schema/index/constraint behavior

If the report is missing or the PR contains unrelated `ai/` files, fix that on the PR branch first, push, and wait for CI again before final PASS/FAIL.

## PR Merge Protocol

- If PASS: merge PR #90, checkout `main`, fast-forward pull from `origin/main`, ensure `git status --short` is clean, and update orchestration state files for the next cycle.
- If FAIL: leave PR #90 open and document exact blockers.
- Never merge a PR with unresolved verification blockers or failing CI.

## When Done Report

Write `ai/reports/task-0047-verifier.md` with sections:

- Result: PASS or FAIL
- Checks
- Issues
- CI Log Review
- Secret Handling Review
- Risk Notes
- Spec Proposals
- Recommended Next Move
- PR Number
