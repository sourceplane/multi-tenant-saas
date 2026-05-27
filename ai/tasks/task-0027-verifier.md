# Task ID

Task 0027

# Agent

Verifier

# Current Repo Context

- Task 0027 implementer report: `ai/reports/task-0027-implementer.md`.
- PR #68 is open:
  `feat: add policy-gated member administration mutations`
  (`codex/task-0027-member-admin-mutations` -> `main`).
- PR #68 is currently clean and not draft.
- PR CI run `26385069804` passed all 19 checks, including plan, api-edge,
  contracts, db, db-tests, membership-worker-tests, membership-worker
  dev/stage/prod verify deploy, and policy-worker dev/stage/prod verify deploy.
- Branch head is `c08c2c7`
  (`feat: add policy-gated member administration mutations (PATCH role, DELETE member)`).
- Task 0027 scope was intentionally larger than recent tasks, spanning
  contracts, db repository semantics, membership-worker handlers/routing/tests,
  and api-edge forwarding/tests.
- Tasks 0001-0026 are verified. Task 0024 established the
  `TransactionalSqlExecutor` pattern; Task 0026 completed invitation lifecycle
  event/audit coverage.

# Objective

Verify that PR #68 safely adds policy-gated organization member role update and
member removal routes with correct authorization, last-owner protection,
role-fact cleanup, public API behavior, and atomic event/audit emission.

# PR Boundary

One PR verification. Fixes may be committed to the same PR branch only if they
are required to satisfy Task 0027 acceptance criteria. Do not add new feature
scope.

# Read First

- `ai/tasks/task-0027.md`
- `ai/reports/task-0027-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/contracts/event-envelope.schema.yaml`
- `specs/components/03-policy-authorization.md`
- `specs/components/04-organizations-membership.md`
- `specs/components/09-events-audit-observability.md`

Then inspect:

- PR #68 diff and changed-file list
- `packages/contracts/src/membership.ts`
- `packages/db/src/membership/types.ts`
- `packages/db/src/membership/repository.ts`
- `apps/api-edge/src/org-facade.ts`
- `apps/membership-worker/src/ids.ts`
- `apps/membership-worker/src/router.ts`
- `apps/membership-worker/src/handlers/update-member-role.ts`
- `apps/membership-worker/src/handlers/remove-member.ts`
- `apps/membership-worker/src/policy-client.ts`
- `packages/db/src/hyperdrive/executor.ts`
- `packages/db/src/events/repository.ts`
- `tests/db/src/membership.test.ts`
- `tests/membership-worker/src/membership-worker.test.ts`
- `tests/api-edge/src/org-facade.test.ts`
- `tests/policy-engine/src/policy-engine.test.ts`

# Required Verification

1. Scope and PR hygiene
   - Confirm PR #68 changes only task-scoped contracts, db repository/types,
     membership-worker handlers/routing/IDs/tests, and api-edge facade/tests.
   - Confirm no migrations, Terraform, Wrangler bindings, Supabase/AWS/
     Cloudflare resources, web-console, SDK, CLI, README cleanup, or
     `specs-v2/**` changes.
   - Confirm no ignored generated outputs are staged or committed.
   - Confirm `ai/reports/task-0027-implementer.md` is committed to the PR branch
     before merge. If it is only local/untracked, commit it or request the
     implementer to do so.

2. Public routing and api-edge behavior
   - Confirm `PATCH /v1/organizations/{orgId}/members/{memberId}` and
     `DELETE /v1/organizations/{orgId}/members/{memberId}` are recognized by
     api-edge and membership-worker.
   - Confirm unsupported methods on the member item route return 405/
     `unsupported`.
   - Confirm api-edge resolves identity before forwarding, forwards actor
     headers, forwards `PATCH` bodies, preserves existing `x-request-id`,
     `traceparent`, and `idempotency-key` behavior, and does not forward the
     original bearer token to membership-worker.
   - Confirm existing organization, member list, invitation, and auth facade
     routes still behave as before.

3. Authorization and fail-closed behavior
   - Confirm role update authorizes through policy action
     `organization.member.update_role`.
   - Confirm removal authorizes through policy action
     `organization.member.remove`.
   - Confirm missing `POLICY_WORKER`, policy fetch failures, malformed policy
     envelopes, non-OK policy responses, and denial fail closed without starting
     a mutation or appending an event.
   - Confirm policy denial returns 404 to avoid organization/member enumeration.
   - Confirm invalid public organization or member IDs return 404 before policy,
     mutation, or event append.

4. Role update semantics
   - Confirm request body shape is `{ "role": "<organization role>" }`.
   - Confirm only organization roles are accepted:
     `owner`, `admin`, `builder`, `viewer`, `billing_admin`.
   - Confirm project roles and unknown roles return `validation_failed`.
   - Confirm target member must be active and inside the route organization.
   - Confirm a real mutation replaces active organization-scoped role facts for
     the target subject with exactly one requested organization role.
   - Confirm project-scoped role assignments are preserved on role update.
   - Confirm same-role no-op behavior returns success and appends no event.
   - Confirm multiple active organization-scoped roles normalize to one
     requested role and append `membership.updated`.

5. Member removal semantics
   - Confirm target member must be active and inside the route organization.
   - Confirm removal marks the member `removed` instead of deleting the row.
   - Confirm removal revokes all active role assignments for the target subject
     in that organization, including organization-scoped and project-scoped
     assignments.
   - Confirm if role-assignment revocation fails, member removal does not commit
     and no `membership.removed` event/audit entry is appended.
   - Confirm a removed member response uses public member ID, removed status, and
     no active roles.
   - Confirm no reactivation, reinvitation, bulk administration, or
     project-scoped role administration behavior was added.

6. Last-owner invariant
   - Confirm removing the only active owner fails with `precondition_failed` and
     does not mutate membership or append event/audit.
   - Confirm changing the only active owner's role to a non-owner role fails with
     `precondition_failed` and does not mutate membership or append event/audit.
   - Confirm changing an owner to owner is treated as no-op/safe.
   - Confirm demoting/removing one owner is allowed only when another active
     owner remains.
   - Inspect whether last-owner checks are sufficiently transaction-safe for the
     current repository model. If a race remains that cannot be fixed without a
     schema change or stronger locking, write or request a spec proposal and
     record the residual risk clearly.

7. Transaction and event/audit atomicity
   - Confirm production role update uses `executor.transaction(...)` and creates
     membership/events repositories from the transaction-bound executor.
   - Confirm production removal uses `executor.transaction(...)` and creates
     membership/events repositories from the transaction-bound executor.
   - Confirm if membership mutation or role cleanup fails, no event/audit append
     occurs.
   - Confirm if event/audit append fails or conflicts, the corresponding
     membership mutation rolls back.
   - Verification focus: inspect whether `update-member-role.ts` ignores
     failures returned from `revokeRoleAssignment(...)` in the transaction loop.
     If ignored failures can leave stale active org roles while still creating a
     new role/event, fix before approving.
   - Verification focus: inspect whether `remove-member.ts` ignores
     `revokeAllRoleAssignments(...)` failure by continuing with `revokedCount =
     0`. If role cleanup failure can commit member removal and event/audit, fix
     before approving.
   - Confirm dependency-injected unit-test seams do not give a false sense of
     transaction rollback if production code is not actually atomic.

8. Event/audit contents and secrecy
   - Confirm role update emits `membership.updated` only for real mutations.
   - Confirm removal emits `membership.removed` exactly once on success.
   - Confirm event version `1`, source `membership-worker`, actor from
     authenticated context, request ID, public org ID (`org_...`), public member
     subject ID (`mem_...`), and audit category `membership`.
   - Confirm payloads are audit-safe: `previousRoles`, `role`, and
     `revokedRoleCount` are acceptable.
   - Confirm event/audit fields and public responses do not expose raw database
     UUIDs, bearer tokens, invitation tokens, token hashes, SQL text, stack
     traces, provider details, or unrelated identity profile data.

9. Test adequacy
   - Confirm DB tests cover the actual repository helpers introduced in this PR
     and their failure behavior, not only happy path SQL shape.
   - Confirm membership-worker tests cover policy denial, invalid IDs, invalid
     role body, target not found/removed, last-owner failures, event append
     failure, safe responses, and secrecy.
   - Confirm api-edge tests cover method recognition, `PATCH` body forwarding,
     actor header forwarding, and bearer token redaction.
   - Add verifier fixes/tests on the PR branch if the current tests miss a
     behavior required by Task 0027, especially role cleanup failure paths.

# Required Checks

Run at minimum:

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts-tests test
pnpm --filter @saas/db typecheck
pnpm --filter @saas/db-tests test
pnpm --filter @saas/policy-engine-tests test
pnpm --filter @saas/membership-worker typecheck
pnpm --filter @saas/membership-worker-tests test
pnpm --filter @saas/membership-worker build
pnpm --filter @saas/api-edge-tests test
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
gh pr checks 68
```

If you add verifier fixes, rerun affected local checks and ensure PR CI is green
after pushing.

# Merge Requirement

If verification passes:

- Merge PR #68.
- Sync local `main` to the merge commit.
- Confirm the post-merge main CI run starts or, if already complete, record its
  result.
- Leave `ai/state.json` and compact context ready for the Orchestrator to record
  Task 0027 as verified.

If verification fails:

- Keep PR #68 open.
- Either commit scoped verifier fixes to the PR branch or write a concise FAIL
  report explaining the blocker.

# Report Expectations

Write `ai/reports/task-0027-verifier.md` with:

- Result: PASS or FAIL.
- PR number and merge status.
- Checks run with exact commands and results.
- Findings/issues, if any.
- Verifier fixes, if any.
- Risk notes, especially around last-owner and transaction atomicity coverage.
- Spec proposals, if any.
- Recommended next move.
