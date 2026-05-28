# Task 0053 Verifier

Agent: Verifier

## Current Repo Context

- Task 0052 verified PASS and merged via PR #95 at `cdd781c`; web-console API key management UI is live on main.
- Task 0053 Implementer opened PR #96: `https://github.com/sourceplane/multi-tenant-saas/pull/96`.
- PR #96 branch: `codex/task-0053-account-profile-api`; head SHA at orchestration time: `cee032fa6c0dcd798915ac412e1cd5580fcae61d`.
- PR #96 is OPEN, not draft, `mergeStateStatus: CLEAN`.
- PR CI run `26562137078` completed SUCCESS for all 27 jobs.
- PR diff is bounded to identity/profile API work across contracts, db identity repository, identity-worker, api-edge auth facade, focused tests, and `specs/components/02-identity.md`.
- Important known issue from orchestration inspection: `ai/reports/task-0053-implementer.md` exists locally but is not present in the PR #96 file list. The verifier must ensure the implementer report is committed to the PR branch before PASS/merge.

## Objective

Verify PR #96 against Task 0053 and the Verifier Standard in `agents/orchestrator.md` lines 349-392. Confirm that the self-scoped account profile public API is contract-first, session-only, safely validated, event-recorded, and bounded to one PR. If PASS, merge PR #96, sync local `main`, and leave the repo clean. If FAIL, leave the PR open with clear blockers.

## PR Boundary

PR #96 may include only:

1. Minimal `specs/**` updates documenting self-scoped `GET /v1/auth/profile` and `PATCH /v1/auth/profile`.
2. `packages/contracts/src/auth.ts` profile request/response contract types.
3. `packages/db/src/identity/**` repository support for updating `identity.users.display_name`.
4. `apps/identity-worker/src/**` profile handler/service/router wiring and security-event behavior.
5. `apps/api-edge/src/auth-facade.ts` route recognition and GET/PATCH forwarding.
6. Focused tests under `tests/identity-worker/**` and `tests/api-edge/**`.
7. `ai/reports/task-0053-implementer.md`.

No web-console UI, no email-change flow, no account security-settings mutation model, no API-key behavior changes, no migration unless strictly necessary, no live Terraform/infra changes, no unrelated historical `ai/` carryover files, and no `specs-v2/**` work.

## Read First

- `agents/orchestrator.md` lines 349-392 — Verifier Standard and merge protocol.
- `ai/tasks/task-0053.md` — original implementer contract.
- `ai/reports/task-0053-implementer.md` — implementer report; confirm it is committed to the PR branch before PASS.
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md` — rules 2, 6, 8, 9, 10, 11.
- `specs/product-overview.md` — account settings/profile starter capability.
- `specs/components/01-edge-api.md`
- `specs/components/02-identity.md`
- `specs/contracts/api-guidelines.md`
- PR #96 diff, commits, and CI logs.

## Required Outcomes

- [ ] Inspect PR #96 diff and confirm it maps exactly to Task 0053.
- [ ] Ensure `ai/reports/task-0053-implementer.md` is committed to the PR branch. If missing, add only that report file to the PR branch, push it, and wait for CI again before PASS/merge.
- [ ] Run local focused quality gates and Orun validation commands listed below.
- [ ] Inspect GitHub Actions logs for run `26562137078` or the latest PR run after verifier fixes; do not rely only on status summaries.
- [ ] Inspect implementation code paths for auth boundary, request validation, safe event metadata, and no API-key/service-principal profile mutation.
- [ ] Write `ai/reports/task-0053-verifier.md` with PASS/FAIL, evidence, issues, risk notes, spec proposals, and recommended next move.
- [ ] If PASS and CI is green, merge PR #96, checkout `main`, fast-forward from `origin/main`, and leave local repo clean except for explicitly untracked historical carryover files that existed before verification.
- [ ] If FAIL, leave PR #96 open and document blockers clearly.

## Verification Checklist

### PR and scope inspection

- Confirm PR #96 is open, not draft, mergeable/clean, and based on `main`.
- Run `gh pr diff 96 --name-only` and verify no unrelated files are included.
- Confirm no `specs-v2/**`, web-console UI, Terraform, Cloudflare, Supabase, AWS, migration, API-key behavior, or unrelated `ai/` carryover files are in scope.
- Confirm the implementer report is committed on the PR branch:
  - `git ls-tree -r origin/codex/task-0053-account-profile-api --name-only ai/reports/task-0053-implementer.md`
  - If missing, commit and push `ai/reports/task-0053-implementer.md` only, then wait for the new PR CI run.

### Local checks

Run and record exact results:

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts lint
pnpm --filter @saas/contracts build
pnpm --filter @saas/identity-worker typecheck
pnpm --filter @saas/identity-worker build
pnpm --filter @saas/identity-worker-tests test
pnpm --filter @saas/api-edge typecheck
pnpm --filter @saas/api-edge build
pnpm --filter @saas/api-edge-tests test
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

### Code-path checks

Verify all of these before PASS:

- `GET /v1/auth/profile` requires a valid user-session bearer token and returns only safe public `AuthUser` fields.
- `PATCH /v1/auth/profile` requires a valid user-session bearer token and cannot be performed by API-key/service-principal actors.
- `PATCH` body validation is fail-closed:
  - body must be a JSON object;
  - `displayName` must be present;
  - `displayName` must be string or null;
  - strings are trimmed;
  - empty string clears to null;
  - maximum stored length is 120 characters;
  - unsupported fields such as `email`, `id`, `status`, or arbitrary keys return `validation_failed`.
- Repository update writes only `identity.users.display_name` and `updated_at`; no migration is needed because `display_name` already exists.
- Successful profile updates record `user.profile.updated` identity security events with safe metadata only, such as changed field names, not old/new display-name values, emails, bearer tokens, hashes, or secrets.
- If profile update and security-event recording are not transactionally coupled, confirm the failure mode is conservative and document the residual risk.
- api-edge forwards `GET/PATCH /v1/auth/profile` to identity-worker, forwards PATCH bodies, preserves relevant headers, and leaves existing auth/session/logout/security-events/API-key admin behavior unchanged.

### CI log inspection

- Inspect the latest PR CI run logs with `gh run view` and `gh run view --log` for representative jobs:
  - `plan`
  - `contracts · dev · Verify`
  - `identity-worker-tests · dev · Verify`
  - `api-edge-tests · dev · Verify`
  - `identity-worker · stage/prod · Verify deploy`
  - `api-edge · stage/prod · Verify deploy`
- Confirm CI shows expected Orun plan and run commands, and all required checks are successful.

### Secret and safety review

- Search changed files for accidental token/hash/secret exposure patterns.
- Confirm profile/security-event metadata does not include raw bearer tokens, session secrets, API key material, token hashes, raw internal UUID-only IDs in public responses, or old/new display-name values.
- Confirm no live provider resources are created or changed by this PR beyond normal Worker deploy verification after merge.

## Acceptance Criteria

✅ PR #96 corresponds exactly to Task 0053 and no unrelated scope is included.

✅ `ai/reports/task-0053-implementer.md` is committed to the PR branch before PASS.

✅ Active specs document self-scoped `GET/PATCH /v1/auth/profile` and defer email changes/security settings.

✅ Public contract types for profile read/update exist and preserve auth contract compatibility.

✅ identity-worker serves `GET /v1/auth/profile` for authenticated user-session bearer tokens and returns safe profile fields.

✅ identity-worker serves `PATCH /v1/auth/profile`, validates the body fail-closed, updates `displayName`, and returns the updated safe public user.

✅ API-key/service-principal actors cannot update user profile state.

✅ Successful profile updates record safe `user.profile.updated` identity security events without secret or sensitive value leakage.

✅ api-edge forwards GET/PATCH profile routes and PATCH bodies safely without regressing existing auth/API-key routes.

✅ Focused local checks and Orun validation pass.

✅ Latest PR CI is green and CI logs show the expected commands actually ran.

✅ No unresolved verification blockers remain before merge.

## Verifier Merge Protocol

Follow `agents/orchestrator.md` lines 377-391 exactly:

- Prefer `/Users/irinelinson/.local/bin/kiox` when `kiox` is not on `PATH`.
- If verification adds the report or a small verifier fix, commit it to PR #96, push, and wait for CI again.
- Merge only after local checks and PR CI logs are both acceptable.
- After merge, checkout `main` locally and fast-forward pull from `origin/main`.
- Do not leave the task branch checked out after merge.
- Run `git status --short`; resolve verifier-created local changes before ending verification.
- Never merge a PR with unresolved verification blockers.

## When Done Report

Write `/ai/reports/task-0053-verifier.md` with these sections:

- Result: PASS or FAIL
- Checks
- Issues
- CI Log Review
- Scope / Overreach Review
- Code Path Review
- Secret Handling Review
- Spec Proposals
- Risk Notes
- Recommended Next Move
