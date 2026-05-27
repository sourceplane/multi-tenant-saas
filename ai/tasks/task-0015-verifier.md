# Task ID

Task 0015 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0015 implementation is open as PR #56:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/56
- Branch: `codex/task-0015-membership-persistence-foundation`
- Head commit observed when this verifier prompt was written:
  `5165b1de15626cd0bf2f77a3e5260f4d557045c2`
- Base: `main` at `4268b7531d2288bcb8b4d782e3e647f69778f4f2`
- Current PR state: open, ready for review, mergeable, not draft
- Latest observed PR CI run: `26353157072`, all visible checks passed
- Branch content observed: 1 commit ahead of `origin/main`, 0 behind

Observed implementation summary:

- Adds membership migration `020_membership_core`.
- Adds `@saas/db/membership` repository types/implementation.
- Adds shared tenancy/RBAC types in `packages/contracts/src/tenancy.ts`.
- Adds membership repository and migration tests under `tests/db`.
- Adds `paths: [packages/db/src/migrations/**]` to
  `infra/db-migrate/component.yaml` so migration-only changes select
  `db-migrate` in changed plans.
- Adds `ai/reports/task-0015-implementer.md`.

Important verification risks:

- Task 0015 required `bootstrapOrganization` to be atomic. The implementer
  report says it performs three sequential inserts without explicit
  `BEGIN/COMMIT` because `SqlExecutor` has no transaction API. Decide whether
  that fails the task, can be narrowly fixed in this PR, or needs a spec/task
  proposal before merge. Do not silently pass an unsafe partial-bootstrap path.
- `acceptInvitation` appears to update an invitation to accepted before checking
  expiry in application code. Verify whether an expired invitation can be
  marked accepted without creating a member, and fix or fail if so.
- `acceptInvitation` also creates the member after updating the invite. Verify
  whether partial success is possible if the member insert conflicts/fails, and
  whether that violates the task's acceptance requirement.
- The new `RoleAssignmentFact` type includes `subjectId`/`subjectType`, while
  `specs/contracts/tenancy-and-rbac.md` says the role-assignment fact consumed
  by policy is already scoped to the request subject and does not need a
  separate subject ID. Decide whether this is harmless additive metadata,
  contract drift needing a fix, or a proposal-worthy change.
- Migration table `org_id` columns do not appear to have foreign keys to
  `membership.organizations`. Verify whether that is an intentional
  autocommit/idempotency choice or an integrity gap.
- PR CI shows `db-migrate · stage/prod · Migrate` jobs on a pull request.
  Inspect logs to prove these run plan/read-only mode only and do not apply
  migrations on PRs.

# Objective

Independently verify PR #56 against Task 0015.

If the PR is production-safe after any strictly Task 0015-scoped verifier fixes,
merge it, wait for the `main` merge pipeline, verify the membership migration
was applied to stage and prod through Orun/db-migrate, inspect live non-secret
database state, sync local `main`, update compact orchestration context/state,
and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers. If local/provider access blocks required live DB evidence,
write BLOCKED rather than guessing.

# PR Boundary

This verifier task covers PR #56 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0015-verifier.md`;
- small, strictly Task 0015-scoped fixes needed to make PR #56 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add `apps/membership-worker`, public organization/membership routes,
api-edge service bindings, policy Worker behavior, project behavior, billing,
notifications, webhooks, UI, SDK, CLI, email delivery, Terraform provisioning,
new Supabase resources, new Cloudflare resources, AWS/S3/Secrets Manager
resources, or `specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0015.md`
- `ai/reports/task-0015-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0014-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/domain-model.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/components/01-edge-api.md`
- `specs/components/02-identity.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/04-organizations-membership.md`
- `specs/components/05-projects-environments.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/orun-golden-path.md`
- `packages/db/**`
- `packages/contracts/src/tenancy.ts`
- `tests/db/**`
- `infra/db-migrate/component.yaml`
- `stack-tectonic/compositions/db-migrate/**`
- PR #56 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26353157072`

# Required Outcomes

## PR Review

- Confirm PR #56 has a real PR number, is based on current `main`, is not
  draft, is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not
  only PR summaries.
- Verify the PR is bounded to Task 0015:
  - membership persistence schema;
  - Worker-safe membership repository adapter;
  - narrow tenancy/RBAC contract additions;
  - migration/test coverage;
  - Orun `db-migrate` selection fix if required.
- Verify it does not include public organization APIs, membership Worker,
  api-edge routes, policy Worker behavior, project behavior, UI, SDK, CLI,
  Terraform provisioning, or product-specific `specs-v2/**` work.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw invitation tokens, raw bearer
  tokens, raw API keys, token hashes, signing secrets, encryption secrets, or
  Secrets Manager payloads are committed, logged, or returned.

## Migration Review

- Verify migration `020_membership_core` is present in the manifest, ordered
  after `010_identity_core`, context `membership`, and checksum-stable.
- Verify migration IDs remain sorted and all manifest tests still pass.
- Verify the SQL creates only membership-owned state and no cross-context
  foreign keys.
- Verify all organization-scoped membership tables carry `org_id` directly.
- Verify the migration is safe for the current Task 0008 Management API runner:
  statements must be idempotent enough for autocommit/no-rollback behavior.
- Verify invitation token material is never stored raw:
  - invitation proofs store only `token_hash`;
  - no raw token/password/API key secret columns are created.
- Verify normalized slug and email lookup cannot be bypassed by
  case-sensitive duplicate values.
- Verify roles match `specs/contracts/tenancy-and-rbac.md`:
  - organization roles: `owner`, `admin`, `builder`, `viewer`,
    `billing_admin`;
  - project roles: `project_admin`, `project_builder`, `project_viewer`;
  - project-scoped roles do not create a foreign key or dependency on
    `projects.*`.
- Verify table/index/comment names are stable and do not collide with
  cross-schema objects.
- Decide whether lack of foreign keys from membership child tables to
  `membership.organizations` is acceptable. If unacceptable, require a narrow
  fix using membership-local FKs only; if acceptable, document why.

## Repository Adapter Review

- Verify `@saas/db/membership` is an explicit Worker-safe subpath export.
- Verify default `@saas/db` exports remain Worker-safe and do not import
  Postgres.js, `pg`, AWS SDK, `node:*`, filesystem APIs, or runner code through
  membership exports.
- Verify membership repository code does not import API route handlers,
  Worker code, `api-edge`, `identity-worker`, policy Worker code, or unrelated
  bounded contexts.
- Verify all dynamic values use parameterized SQL. No user-controlled values
  may be string-interpolated into SQL.
- Verify repository methods are persistence-oriented and do not own slug
  generation, token generation, invitation email delivery, policy decisions,
  auth/session resolution, or public API orchestration.
- Verify expected outcomes map to stable typed results/errors:
  - not found;
  - conflict;
  - expired;
  - revoked or removed;
  - already accepted;
  - internal.
- Verify raw SQL errors, connection strings, hostnames, usernames, invitation
  token hashes, raw tokens, emails in internal exception messages, and
  credentials do not appear in returned errors.
- Verify result types never expose `token_hash` or raw invitation token values.
- Pay special attention to `bootstrapOrganization`:
  - It must not leave an organization without the creator member and owner role
    if a later step fails.
  - If current `SqlExecutor` cannot express transactions, consider a narrow
    task-scoped repository fix using a single CTE statement or add a minimal
    transaction-capable executor seam. If neither is safe, mark FAIL/BLOCKED
    and write a proposal.
- Pay special attention to `acceptInvitation`:
  - It must not mark an expired invite accepted before detecting expiry.
  - It must not leave an invite accepted if member creation fails.
  - It should create the member using the accepted invitation's organization
    and intended role semantics without trusting mismatched caller input.
  - It should not return the wrong subject/member if fake tests hide a mapping
    bug.
- Verify list methods filter removed/revoked records where appropriate and
  preserve tenant scoping through `org_id`.

## Contract Review

- Verify new `OrganizationRole`, `ProjectRole`, `TenancyRole`,
  `RoleScopeKind`, and `RoleAssignmentFact` types are consistent with
  `specs/contracts/tenancy-and-rbac.md`.
- Decide whether adding `subjectId` and `subjectType` to `RoleAssignmentFact`
  conflicts with the spec statement that role-assignment facts consumed by
  policy are already scoped to the request subject. If it conflicts, require a
  narrow fix or a proposal before merge.
- Verify no public organization API request/response types were introduced
  prematurely.
- Verify contracts package and contract tests still pass.

## Tests Review

- Verify tests cover the required Task 0015 surface:
  - parameterized query usage for organization, member, invitation, and role
    assignment operations;
  - successful row mapping;
  - not-found behavior;
  - conflict/duplicate behavior;
  - expired/revoked/accepted invitation behavior;
  - removed/revoked membership or role-assignment behavior where exposed;
  - safe error mapping/redaction;
  - no raw invitation tokens or token hashes in repository outputs/errors;
  - import isolation from runner-only modules;
  - membership migration presence/order/checksum/context;
  - membership schema/tables/indexes/secret-storage checks;
  - project-scoped invariant still applies only to `projects` context
    migrations.
- Verify tests actually catch the atomicity requirements. If tests label a
  sequential three-query bootstrap as atomic without proving rollback/all-or-
  nothing behavior, require a narrow fix or record as a blocker.
- Verify tests do not require a live database.

## Orun And CI Review

- Inspect PR CI run `26353157072` logs. Confirm pull-request `db-migrate`
  jobs are plan/read-only and do not apply live migrations.
- Inspect the rendered changed PR plan and confirm it includes:
  - `contracts` in dev/stage/prod verify;
  - `db` in dev/stage/prod verify;
  - `db-tests` in dev verify;
  - `db-migrate` in stage/prod using plan/read-only behavior only.
- Verify adding `paths: [packages/db/src/migrations/**]` to
  `infra/db-migrate/component.yaml` is valid Orun v2.3.0 syntax and does not
  over-select unrelated migration/apply work.
- Inspect the rendered main/push plan before merge. Confirm stage/prod
  `db-migrate` jobs will run the apply profile on `github-push-main`.

## Merge And Live Verification

If the PR passes review:

- Merge PR #56 using the repository's normal merge method.
- Wait for the post-merge `main` pipeline to finish.
- Confirm `db-migrate` applied `020_membership_core` to both stage and prod
  through Orun.
- Inspect live non-secret database state:
  - `_migrations.applied` includes `020_membership_core` with context
    `membership`;
  - schema `membership` exists;
  - tables `organizations`, `organization_members`,
    `organization_invitations`, and `role_assignments` exist;
  - expected indexes exist;
  - invitation table has `token_hash` and no raw token/code/password columns;
  - no cross-context foreign keys exist.
- Verify existing live auth and api-edge health still work after migration:
  - stage/prod `api-edge` `/health` reports database reachable and identity
    configured;
  - no identity-worker regression is visible.
- Sync local `main` after merge.

# Required Checks

Run the checks needed to independently prove the changed surface. At minimum:

```bash
pnpm install --frozen-lockfile
pnpm --filter @saas/db build
pnpm --filter @saas/db typecheck
pnpm --filter @saas/db lint
pnpm --filter @saas/db-tests test
pnpm --filter @saas/db-tests typecheck
pnpm --filter @saas/db-tests lint
pnpm --filter @saas/contracts build
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts lint
pnpm --filter @saas/contracts-tests test
pnpm --filter @saas/contracts-tests typecheck
pnpm --filter @saas/contracts-tests lint
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

Also inspect GitHub Actions logs for PR run `26353157072` and the post-merge
main run if the PR is merged.

# Reporting

Write `ai/reports/task-0015-verifier.md` with:

- Result: PASS, FAIL, or BLOCKED.
- PR details: URL, branch, base/head SHAs, merge commit if merged, PR CI run,
  and main CI run if merged.
- Scope review and changed files.
- Migration review and live stage/prod migration evidence if merged.
- Repository behavior review, especially atomic bootstrap and invite
  acceptance semantics.
- Contract review.
- Tests and local checks run with exact results.
- Orun/CI profile evidence.
- Secret-handling review.
- Verifier fixes, if any.
- Remaining gaps.

If PASS after merge, update compact orchestration context:

- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/waiting_for_input.md` if its status text is stale

Set `ai/state.json.task_agent` to the verifier report path after writing the
report.
