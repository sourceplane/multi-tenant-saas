# Task 0040 Fix

# Agent

Implementer

# Current Repo Context

Task 0040 is active on branch `codex/task-0040-web-console-live-ui` with open
PR #81:

`https://github.com/sourceplane/multi-tenant-saas/pull/81`

The PR CI run `26455534700` passed all checks, but verifier review found a
blocking functional bug in the web-console invitation acceptance flow.

Do not create Task 0041. This is a verifier-required fix inside the existing
Task 0040 PR.

# Objective

Fix the web-console invitation acceptance route so it uses the existing
org-scoped public API contract:

`POST /v1/organizations/{orgId}/invitations/accept`

# PR Boundary

Reuse branch `codex/task-0040-web-console-live-ui` and PR #81. Commit and push
only the verifier-required fix plus any minimal report update.

Allowed files:

- `apps/web-console/src/api.ts`
- `apps/web-console/src/main.ts`
- `ai/reports/task-0040-implementer.md` if updating the report with fix checks

Do not modify api-edge routes to add a global `/v1/invitations/accept` endpoint.
The correct contract is org-scoped.

# Read First

- `ai/tasks/task-0040.md`
- `ai/reports/task-0040-implementer.md`
- `ai/reports/task-0040-verifier.md`
- `apps/web-console/src/api.ts`
- `apps/web-console/src/main.ts`
- `apps/api-edge/src/org-facade.ts`
- `tests/api-edge/src/org-facade.test.ts`

# Required Outcomes

1. Update `ApiClient.acceptInvitation` to require an `orgId` and call:
   `/v1/organizations/{orgId}/invitations/accept`.
2. Update `handleAcceptInvitation` to require the selected organization and pass
   that `orgId` into the API client.
3. Keep the UI behavior clear when no organization is selected.
4. Ensure no web-console code calls `/v1/invitations/accept`.
5. Do not change backend public API behavior.

# Non-Goals

- No new routes.
- No CORS changes.
- No design restyling.
- No broader invitation workflow changes.
- No identity security-event work.

# Acceptance Criteria

- `rg "/v1/invitations/accept" apps/web-console/src` finds no matches.
- `rg "invitations/accept" apps/web-console/src apps/api-edge/src` shows the
  web-console and api-edge using the org-scoped path.
- Web-console typecheck, lint, and build pass.
- PR #81 branch is pushed with the fix commit.

# Verification

Run and record:

- `pnpm --filter @saas/web-console typecheck`
- `pnpm --filter @saas/web-console lint`
- `pnpm --filter @saas/web-console build`
- `rg "/v1/invitations/accept" apps/web-console/src`
- `gh pr view 81 --json statusCheckRollup,headRefName,mergeStateStatus,url`

If you make any API-edge changes despite this prompt's boundary, also rerun
`pnpm --filter @saas/api-edge-tests test` and explain why the boundary changed.

# PR Creation Requirement

Reuse branch `codex/task-0040-web-console-live-ui` and existing PR #81. Commit
the fix, push the branch, and confirm PR #81 remains open against `main`.

If the branch or PR is missing, recreate the branch/PR for Task 0040 and record
the exact commands used.

# When Done Report

Update `/ai/reports/task-0040-implementer.md` with a short "Verifier Fix" note
including:

- files changed;
- checks run;
- PR #81 confirmation;
- any remaining blocker.
