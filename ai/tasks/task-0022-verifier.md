# Task ID

Task 0022 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0022 implementation is open as PR #63:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/63
- Branch: `codex/task-0022-invitation-acceptance`
- Head commit observed when this verifier prompt was written:
  `ba5e3316be5bdf0b926f7030ef9d6e2d97d5c86a`
- Base: `main` at `25ad769f63176af662777c6768a80033b1112170`
- Current PR state: open, ready for review, mergeable clean, not draft
- Latest observed PR CI run: `26370711117`, completed successfully
- Branch content observed: 3 commits ahead of `main`

Observed implementation summary:

- Adds `POST /v1/organizations/{orgId}/invitations/accept` through
  `api-edge` to `membership-worker`.
- Adds `AcceptInvitationRequest` and `AcceptInvitationResponse` contract types.
- Adds `apps/membership-worker/src/handlers/accept-invitation.ts`.
- Factors `hashToken()` from invitation token generation.
- Updates the membership repository `acceptInvitation` signature to accept a
  structured input with token hash, org ID, email, generated member ID,
  generated role assignment ID, subject, and acceptance time.
- Rewrites repository acceptance to validate token/org/email/status and then use
  a CTE that marks the invitation accepted, creates the member, and creates the
  role assignment.
- Extends `api-edge` session forwarding so `x-actor-email` is sent to
  `membership-worker`.
- Adds db, membership-worker, and api-edge tests.

Important verification risks:

- The repository CTE uses data-modifying CTEs plus `ON CONFLICT (id) DO NOTHING`
  for generated member and role-assignment IDs. Verify an ID conflict cannot
  leave the invitation marked accepted without a member or role assignment. If
  the statement can partially commit by returning zero rows after the update,
  this is a blocker and must be fixed in PR #63 before PASS.
- Verify member uniqueness and role-assignment uniqueness conflicts roll back
  the accepted invitation state. The task requires conflicts to avoid partial
  acceptance.
- Verify acceptance authorization is exactly token possession plus authenticated
  email match and explicit path organization match. Do not require policy-worker
  for acceptance, because the invited user is not yet a member.
- Verify `api-edge` treats missing or malformed `data.user.email` from
  identity-worker as authentication failure before forwarding.
- Verify the literal `accept` route cannot be accidentally handled as an
  invitation ID route by either `api-edge` or `membership-worker`.
- Verify no raw invitation token, token hash, raw UUID, bearer token, SQL,
  provider detail, or stack trace is returned, logged, committed, or included in
  reports.

# Objective

Independently verify PR #63 against Task 0022.

If the PR is production-safe after any strictly Task 0022-scoped verifier fixes,
merge it, wait for the post-merge `main` pipeline, inspect CI logs, sync local
`main`, update compact orchestration context/state, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers.

# PR Boundary

This verifier task covers PR #63 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0022-verifier.md`;
- small, strictly Task 0022-scoped fixes needed to make PR #63 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add member removal, member role update, organization settings, project
or environment routes, audit/event persistence, notification queues, real email
delivery, durable invitation idempotency, duplicate-invitation uniqueness
migrations, Terraform resources, Supabase resources, AWS IAM/S3/Secrets Manager
resources, Queues, KV, R2, policy-engine permission changes, UI, SDK, CLI, or
`specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0022.md`
- `ai/reports/task-0022-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/orun-golden-path.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/components/01-edge-api.md`
- `specs/components/02-identity.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/04-organizations-membership.md`
- `specs/components/09-events-audit-observability.md`
- `specs/components/14-notifications.md`
- `packages/contracts/src/membership.ts`
- `packages/db/src/membership/types.ts`
- `packages/db/src/membership/repository.ts`
- `packages/db/src/migrations/020_membership_core/up.sql`
- `apps/api-edge/src/org-facade.ts`
- `apps/identity-worker/src/handlers/session.ts`
- `apps/membership-worker/src/env.ts`
- `apps/membership-worker/src/http.ts`
- `apps/membership-worker/src/ids.ts`
- `apps/membership-worker/src/router.ts`
- `apps/membership-worker/src/handlers/accept-invitation.ts`
- `apps/membership-worker/src/handlers/create-invitation.ts`
- `apps/membership-worker/src/handlers/list-invitations.ts`
- `apps/membership-worker/src/handlers/revoke-invitation.ts`
- `tests/db/**`
- `tests/membership-worker/**`
- `tests/api-edge/**`
- PR #63 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26370711117`

# Required Outcomes

## PR Review

- Confirm PR #63 has a real PR number, is based on current `main`, is not draft,
  is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not only
  PR summaries.
- Verify `ai/reports/task-0022-implementer.md` is committed in the PR.
- Verify the PR is bounded to Task 0022:
  - acceptance contract types;
  - repository acceptance seam;
  - token hash helper;
  - membership-worker accept handler/route;
  - api-edge actor email forwarding and accept route forwarding;
  - focused db, membership-worker, and api-edge tests.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw bearer tokens, invitation raw
  tokens, token hashes, signing secrets, encryption secrets, or Secrets Manager
  payloads are committed, logged, returned, or embedded in cursors.

## Repository And Atomicity Review

- Verify `acceptInvitation` accepts only a token hash, not a raw token.
- Verify it validates token hash, path org ID, authenticated email lower,
  revoked status, accepted status, and expiry before or inside the write.
- Verify the write is atomic for all three state changes:
  - invitation accepted state;
  - organization member creation;
  - organization-scoped role assignment creation.
- Prove that if member insertion fails, no invitation accepted state is left.
- Prove that if role-assignment insertion fails, no invitation accepted state or
  orphan member is left.
- Specifically test or reason through generated ID conflicts caused by the
  `ON CONFLICT (id) DO NOTHING` branches. If a member ID or role-assignment ID
  conflict makes the final `SELECT` return zero rows after `accepted_inv`
  already updated the invitation, fix it before PASS.
- Verify member duplicate conflicts on `(org_id, subject_id)` roll back the
  invitation update and return a safe conflict.
- Verify active role-assignment duplicate conflicts roll back the invitation
  update and return a safe conflict.
- Verify returned role assignment is organization-scoped with `scope_kind =
  'organization'` and `scope_ref = null`.
- Verify SQL is parameterized and never includes raw tokens.
- Verify no database migration was added.

## Membership Worker Review

- Verify `POST /v1/organizations/{orgId}/invitations/accept` requires actor
  subject ID, actor subject type, and actor email.
- Verify malformed JSON, non-object body, missing token, malformed token,
  invalid org public ID, wrong org, wrong email, revoked, expired, already
  accepted, conflict, and internal repository errors return safe envelopes.
- Verify token validation is bounded and rejects malformed or oversized token
  values before repository access.
- Verify the raw token is hashed before persistence and only the hash reaches
  the repository.
- Verify acceptance does not call policy-worker.
- Verify the success response includes safe public metadata only:
  public `inv_` ID, public `mem_` ID, email, role, status, inviter, expiration,
  acceptance time, creation time, joined time, and membership status.
- Verify no response exposes token hash, raw DB UUIDs, raw token, bearer token,
  SQL, stack trace, policy internals, or provider details.

## Api Edge Review

- Verify `api-edge` recognizes
  `/v1/organizations/{orgId}/invitations/accept` before generic invitation item
  routing.
- Verify only `POST` is allowed for the accept route.
- Verify `api-edge` resolves bearer auth through `IDENTITY_WORKER` before
  forwarding.
- Verify `api-edge` extracts `data.user.email`, validates it is usable, and
  forwards it as `x-actor-email`.
- Verify missing email, empty email, or malformed session response fails
  authentication before forwarding.
- Verify actor subject ID/type forwarding remains compatible with existing org,
  member, and invitation admin routes.
- Verify raw bearer tokens are not forwarded to `membership-worker`.
- Verify POST JSON body, request ID, traceparent, idempotency-key, and
  content-type forwarding remain correct.

## Contract And Scope Review

- Verify `@saas/contracts/membership` types match the public response shape.
- Verify response types use existing public invitation/member conventions where
  practical and do not expose raw persistence fields.
- Verify create/list/revoke invitation behavior remains unchanged except for
  shared token hashing or response-helper refactors.
- Verify no policy-engine permission matrix changes were added.
- Verify no audit/event, notification, real email delivery, durable idempotency,
  duplicate-invitation uniqueness migration, UI, SDK, CLI, infra, or
  `specs-v2/**` scope was added.

# Verification Commands

Run at minimum:

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/db typecheck
pnpm --filter @saas/db-tests test
pnpm --filter @saas/membership-worker typecheck
pnpm --filter @saas/membership-worker-tests test
pnpm --filter @saas/membership-worker build
pnpm --filter @saas/api-edge typecheck
pnpm --filter @saas/api-edge-tests test
pnpm --filter @saas/api-edge build
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

Also inspect PR CI run `26370711117` and its logs. The observed run completed
successfully with 19/19 jobs.

# Merge And Post-Merge

If local review, checks, and PR CI are acceptable:

- Merge PR #63.
- Wait for the post-merge `main` pipeline to complete.
- Inspect post-merge CI logs, not only status summaries.
- Sync local `main` to `origin/main`, leave the local repo clean, and write the
  verifier report.
- Update compact orchestration context/state for Task 0022.

If verification fails:

- Do not merge PR #63.
- Leave concrete requested changes in the report.
- If you make verifier fixes on the PR branch, keep them strictly Task
  0022-scoped and rerun the relevant checks.

# Report

Write `ai/reports/task-0022-verifier.md` with:

- Summary
- Files Changed
- Checks Run
- PR Review
- Atomicity Review
- Live/CI Evidence
- Assumptions
- Spec Proposals
- Remaining Gaps
- Result: `PASS` or `FAIL`
- PR Number: `63`

If PASS and merged, include merge commit, post-merge main CI run ID, and any
non-secret live verification evidence. If FAIL, include concrete blockers and
the exact checks that support them.
