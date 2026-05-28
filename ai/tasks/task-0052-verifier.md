# Task ID

Task 0052 Verifier

# Agent

Verifier

# Current Repo Context

Task 0051 is verified PASS and merged via PR #94 at `d74b7f6`. The public tenant-scoped API-key admin runtime is live:

- `POST /v1/organizations/{orgId}/api-keys`
- `GET /v1/organizations/{orgId}/api-keys`
- `DELETE /v1/organizations/{orgId}/api-keys/{apiKeyId}`

Task 0052 implementer work is now in review:

- PR: #95
- URL: https://github.com/sourceplane/multi-tenant-saas/pull/95
- Branch: `codex/task-0052-web-console-api-key-management-ui`
- Head commit observed by the orchestrator: `ad002b0`
- PR title: `feat(web-console): add org-scoped API key management UI`
- Latest observed PR CI run: `26560148990`, green across 7 jobs:
  - `plan`
  - `contracts` verify for dev/stage/prod
  - `web-console` verify deploy for dev/stage/prod

Observed PR file scope is narrow and implementation-shaped:

- `apps/web-console/src/api.ts`
- `apps/web-console/src/main.ts`
- `apps/web-console/src/style.css`
- `packages/contracts/package.json`
- `packages/contracts/src/api-keys.ts`
- `packages/contracts/src/index.ts`

Important repo-reality notes for verification:

- The implementer report exists locally at `ai/reports/task-0052-implementer.md`, but the PR file list does not currently include it. This must be corrected before merge if still missing from the PR branch.
- `ai/tasks/task-0052.md` and other historical `ai/` files are local carryover and are not part of the PR. Do not stage unrelated task, report, roadmap, context, or waiting-for-input files while verifying.
- The current diff stores the just-created raw API-key secret in module-level state named `apiKeysCreatedSecret`. Verification must prove the secret is shown only in the immediate create-success path and is cleared on dismiss, tab navigation/re-entry, reload, and any other route back into the list. If it persists longer than the task allows, fix it in the PR branch or FAIL with exact evidence.

# Objective

Verify that PR #95 implements exactly the Task 0052 web-console API-key management UI slice, uses only the already-live public tenant-scoped API routes, preserves secret-safety, and is safe to merge.

This verifier task is complete only when one of these outcomes occurs:

1. PASS: PR #95 is verified, any required verifier-safe cleanup is pushed, CI is green, the PR is merged, local `main` is fast-forwarded to `origin/main`, and post-merge CI is checked.
2. FAIL: PR #95 remains open and the verifier report documents clear blockers with exact evidence.

# PR Boundary

Verify only the Task 0052 surface:

- `apps/web-console/src/api.ts` API-client methods for org-scoped API-key list/create/revoke
- `apps/web-console/src/main.ts` API Keys tab, list/create/revoke state, secret display lifecycle, pagination, and existing workspace tab behavior
- `apps/web-console/src/style.css` styling needed for the API-key surface
- `packages/contracts/src/api-keys.ts`, `packages/contracts/src/index.ts`, and `packages/contracts/package.json` only for minimal typed public API-key contract exports
- `ai/reports/task-0052-implementer.md` and `ai/reports/task-0052-verifier.md` as task-scoped reports

Minimal verifier-safe fixes are allowed if required to satisfy the task, such as:

- adding the missing implementer report to the PR branch
- fixing one-time secret lifecycle issues in the API Keys tab
- repairing a small UI/client contract mismatch discovered during verification

Out of scope:

- backend route, persistence, worker-binding, policy, or migration changes
- `/v1/auth/api-keys` revival
- generic service-principal lifecycle management
- account profile, security-setting mutation, notification, SDK, or CLI work
- broad web-console redesign, design-system extraction, or frontend framework adoption
- unrelated `ai/` cleanup
- `specs-v2/**` work

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0052.md`
- `ai/reports/task-0052-implementer.md`
- `ai/state.json`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md`
- `specs/product-overview.md`
- `specs/components/12-web-console.md`
- `specs/components/02-identity.md`
- `specs/components/01-edge-api.md`
- `specs/contracts/api-guidelines.md`
- `apps/web-console/src/api.ts`
- `apps/web-console/src/main.ts`
- `apps/web-console/src/state.ts`
- `apps/web-console/src/style.css`
- `packages/contracts/src/api-keys.ts`
- `packages/contracts/src/index.ts`
- `apps/api-edge/src/org-facade.ts`
- `apps/identity-worker/src/handlers/api-key-admin.ts`
- `tests/api-edge/src/api-key-routes.test.ts`
- `tests/identity-worker/src/api-key-admin.test.ts`
- PR #95 diff, commits, and CI logs

# Required Outcomes

1. Confirm repo and PR state.
   - Verify PR #95 is the correct Task 0052 PR and is still mergeable.
   - Verify the reviewed branch is `codex/task-0052-web-console-api-key-management-ui`.
   - Confirm the PR maps to one UI/client task and does not include backend runtime changes.

2. Confirm report hygiene.
   - Verify `ai/reports/task-0052-implementer.md` is committed on the PR branch before merge.
   - If it is missing, commit only that report and the verifier report or required verifier fix artifacts. Do not stage unrelated local `ai/` carryover.

3. Verify public API boundary.
   - Confirm the console calls only:
     - `GET /v1/organizations/{orgId}/api-keys`
     - `POST /v1/organizations/{orgId}/api-keys`
     - `DELETE /v1/organizations/{orgId}/api-keys/{apiKeyId}`
   - Confirm it keeps using bearer auth through the existing public api-edge client.
   - Confirm it does not call internal Workers, service-binding-only routes, or `/v1/auth/api-keys`.
   - Confirm request/response handling preserves standard envelope, request ID, and cursor metadata behavior.

4. Verify typed contract fit.
   - Confirm new `@saas/contracts/api-keys` exports are minimal and match the Task 0051 backend response shape.
   - Confirm list responses never type or expose raw secrets.
   - Confirm create response types isolate the one-time `secret` to the create result only.
   - Confirm no internal persistence-only IDs, hashes, or bearer material are added to public contract types.

5. Verify API Keys UI behavior.
   - The selected-organization workspace exposes a clear `API Keys` tab or equivalent org-scoped entry point.
   - List view handles loading, empty, success, error, revoked, and pagination states.
   - Rows show safe fields: `id`, `label`, `prefix`, timestamps, revoked state, and service-principal metadata.
   - Create supports `label`, `role`, optional `projectId`, and optional `expiresAt`.
   - Project-scoped role requirements are understandable and backend validation errors are shown clearly.
   - Revoke uses an explicit confirmation and updates the visible state after success.
   - Existing Members, Invitations, Projects, Audit, and Account Security flows still work.

6. Verify one-time secret safety.
   - The raw secret appears only immediately after successful create.
   - The raw secret is not stored in `localStorage`, `sessionStorage`, URL parameters, durable app state, reports, logs, or screenshots.
   - The raw secret does not appear in list rows, after list reload, after tab navigation away and back, after selected-organization navigation, or after browser reload.
   - The copy affordance does not log or persist the secret and has a safe fallback.

7. Verify browser behavior, not only build output.
   - Use local preview and/or stage console credentials where available to exercise list/create/revoke.
   - On stage, perform a real create/list/revoke only if credentials and authorization are available, and do not record the raw secret in the report.
   - On prod, limit verification to safe UI presence and target-lock behavior unless an explicit production mutation is justified. Do not create unnecessary production API keys.
   - Check desktop and narrow mobile widths for overlapping controls, clipped text, or unreadable rows.

8. Verify local quality gates and PR CI logs.
   - Contracts and web-console package checks pass locally.
   - Orun validate, changed plan, and dry-run pass.
   - GitHub Actions logs show expected `contracts` and `web-console` jobs actually ran successfully.

# Non-Goals

- Do not expand Task 0052 into backend API-key behavior.
- Do not add account profile, security-settings mutation, notification, webhook, billing, CLI, or SDK work.
- Do not create a generic service-principal management surface.
- Do not add a frontend test framework or browser harness as part of this verification unless a tiny existing-script adjustment is strictly required.
- Do not stage unrelated historical `ai/` files.

# Constraints

1. Follow Constitution rule 5: the web console is a replaceable client of the public platform API, not a privileged internal surface.
2. Follow Constitution rule 8: raw API keys, bearer tokens, hashes, and other credential material must never be logged or persisted. The create response may display the raw key exactly once.
3. Follow Task 0050 and `specs/components/02-identity.md`: public API-key admin is tenant-scoped under `/v1/organizations/{orgId}/api-keys[/{apiKeyId}]`.
4. Follow `specs/contracts/api-guidelines.md`: use standard envelopes, request IDs, cursor pagination, and explicit organization path scope.
5. Treat PR hygiene as part of verification. Missing task reports and unrelated `ai/` carryover are verification issues.
6. Merge only after local checks and PR CI logs are acceptable.

# Integration Notes

- `apps/identity-worker/src/handlers/api-key-admin.ts` is the source of truth for live Task 0051 response shapes and secret boundaries.
- `apps/web-console/src/api.ts` should remain the single API client seam.
- `apps/web-console/src/main.ts` uses a lightweight DOM rendering style. Verifier fixes should stay consistent with that style.
- The current app stores active workspace tab in `sessionStorage`; make sure no secret material is written there.
- `packages/contracts/src/security-events.ts` is a useful reference for public UI-facing contract style.
- The deployed consoles are environment-specific. Stage must call the stage api-edge target; prod must call the prod api-edge target.

# Acceptance Criteria

PASS requires all of the following:

- PR #95 exists, is the Task 0052 PR, is mergeable, and is reviewed against this verifier prompt.
- `ai/reports/task-0052-implementer.md` is committed on the PR branch before merge.
- PR scope is bounded to web-console client/UI plus minimal API-key contract exports and task reports.
- The console uses only the public org-scoped API-key routes through api-edge.
- A selected-organization user can list, create, and revoke API keys from the web console.
- The one-time raw secret is shown only immediately after create and disappears on dismiss, navigation away/re-entry, list reload, and browser reload.
- Raw secret material is never shown in list state and is not persisted in browser storage, URLs, reports, logs, or screenshots.
- Cursor pagination works and preserves previously loaded rows when loading more.
- Existing Members, Invitations, Projects, Audit, and Account Security console flows remain intact.
- Local checks pass:
  - `pnpm --filter @saas/contracts typecheck`
  - `pnpm --filter @saas/contracts lint`
  - `pnpm --filter @saas/contracts build`
  - `pnpm --filter @saas/web-console typecheck`
  - `pnpm --filter @saas/web-console lint`
  - `pnpm --filter @saas/web-console build`
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- PR CI logs for run `26560148990` or a later rerun show expected jobs ran and passed.
- If PASS, PR #95 is merged, local `main` is fast-forwarded to `origin/main`, post-merge main CI is checked, and the local repo is clean.
- If FAIL, PR #95 remains open and blockers are documented with exact evidence.

# Verification

Run and record exact results.

## 1. Confirm repo state and PR metadata

```bash
git status --short
git branch --show-current
gh pr view 95 --json number,title,state,mergeable,mergeStateStatus,headRefName,baseRefName,url,files,commits,statusCheckRollup
gh pr diff 95 --name-only
```

## 2. Confirm the implementer report is committed on the PR branch

```bash
git fetch origin main codex/task-0052-web-console-api-key-management-ui
git ls-tree origin/codex/task-0052-web-console-api-key-management-ui --name-only ai/reports/task-0052-implementer.md
```

If missing, add only the Task 0052 implementer report and any verifier-required artifact:

```bash
git add ai/reports/task-0052-implementer.md
git commit -m "task-0052: add implementer report"
git push origin codex/task-0052-web-console-api-key-management-ui
```

Wait for PR CI to rerun and pass before continuing to PASS.

## 3. Review code and contract scope

Inspect at minimum:

```bash
git diff origin/main...origin/codex/task-0052-web-console-api-key-management-ui -- apps/web-console/src/api.ts
git diff origin/main...origin/codex/task-0052-web-console-api-key-management-ui -- apps/web-console/src/main.ts
git diff origin/main...origin/codex/task-0052-web-console-api-key-management-ui -- apps/web-console/src/style.css
git diff origin/main...origin/codex/task-0052-web-console-api-key-management-ui -- packages/contracts/src/api-keys.ts packages/contracts/src/index.ts packages/contracts/package.json
rg -n "api-keys|auth/api-keys|localStorage|sessionStorage|clipboard|apiKeysCreatedSecret|secret" apps/web-console/src packages/contracts/src
```

Confirm no backend runtime, policy, migration, or unrelated context files remain in the PR.

## 4. Run local validation

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts lint
pnpm --filter @saas/contracts build
pnpm --filter @saas/web-console typecheck
pnpm --filter @saas/web-console lint
pnpm --filter @saas/web-console build
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

## 5. Inspect CI logs, not only check summaries

```bash
gh pr checks 95
gh run view 26560148990 --json name,conclusion,jobs,url,workflowName
gh run view 26560148990 --log
```

If a verifier cleanup commit is pushed, inspect the later run instead.

## 6. Perform browser verification

At minimum, verify:

- the API Keys tab appears only inside the selected-organization workspace
- create form validation and backend errors are visible
- a successful create displays the raw secret once without recording it
- tab navigation away and back does not redisplay the raw secret
- reload/re-entry/list fetch does not redisplay the raw secret
- list rows show only safe metadata and support Load More when a cursor exists
- revoke asks for confirmation and then reflects revoked state
- Members, Invitations, Projects, Audit, and Account Security still render
- desktop and narrow-width layouts have no overlapping controls or clipped secret/list text

If live stage credentials are unavailable, record that limitation clearly and use local/browser inspection plus code review to cover the UI state machine. Do not perform unnecessary production mutations.

## 7. PASS / FAIL decision and merge protocol

If any blocker remains:

- leave PR #95 open
- write `Result: FAIL`
- document exact blockers and evidence

If all checks pass:

```bash
gh pr merge 95 --squash --subject "feat(web-console): API key management UI (#95)"
git checkout main
git pull --ff-only origin main
gh run list --branch main --limit 1
git status --short
```

Inspect the latest main CI run and record whether it is still in progress or has completed successfully.

# PR Creation Requirement

The Implementer has already created PR #95. Your job is to verify and either merge it or leave it open with blockers.

# When Done Report

Write `ai/reports/task-0052-verifier.md` with these sections:

- `Result: PASS|FAIL`
- `Checks`
- `Issues`
- `Browser Verification`
- `CI Log Review`
- `Secret Handling Review`
- `Risk Notes`
- `Spec Proposals`
- `Recommended Next Move`
- `PR Number`
