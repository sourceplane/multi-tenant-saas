# Task ID

Task 0030

# Agent

Verifier

# Current Repo Context

- Task 0030 implementer prompt: `ai/tasks/task-0030.md`
- Task 0030 implementer report: `ai/reports/task-0030-implementer.md`
- PR #71 is open, clean, and not draft:
  `feat: add membership-owned internal authorization-context seam`
  (`codex/task-0030-membership-auth-context` -> `main`)
- PR #71 branch head is `d51c4f6`
  (`docs: add task-0030 implementer report`)
- Feature commit under review is `baff4f1`
  (`feat: add membership-owned internal authorization-context seam`)
- Latest PR CI run `26391993245` passed all 12 checks, including:
  - `plan`
  - `contracts-tests · dev · Verify`
  - `membership-worker-tests · dev · Verify`
  - `contracts · dev/stage/prod · Verify`
  - `membership-worker · dev/stage/prod · Verify deploy`
  - `policy-worker · dev/stage/prod · Verify deploy`
- Tasks 0001-0029 are verified and merged on `main` at `974b7b2`.
- Task 0030 scope is intentionally limited to shared policy contract types,
  membership-worker internal route/helper code, focused tests, and the
  implementer report. It must not add `projects-worker`, api-edge forwarding,
  policy-engine behavior, migrations, or infrastructure resources.

# Objective

Verify that PR #71 safely adds a membership-owned internal authorization-context
query seam so future non-membership workers can obtain policy-ready membership
facts without querying `membership.*` storage directly.

# PR Boundary

One PR verification. Fixes may be committed to the same PR branch only if they
are required to satisfy Task 0030 acceptance criteria. Do not add projects
runtime scope, public routes, policy action changes, migrations, provider
resources, or unrelated cleanup.

# Read First

- `ai/tasks/task-0030.md`
- `ai/reports/task-0030-implementer.md`
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
- `specs/components/03-policy-authorization.md`
- `specs/components/04-organizations-membership.md`
- `specs/components/05-projects-environments.md`

Do not read or apply `specs-v2/**`; this remains reusable SaaS foundation work.

Then inspect:

- PR #71 diff, changed-file list, commits, and checks
- `packages/contracts/src/policy.ts`
- `apps/membership-worker/src/handlers/authorization-context.ts`
- `apps/membership-worker/src/membership-facts.ts`
- `apps/membership-worker/src/policy-client.ts`
- `apps/membership-worker/src/router.ts`
- `apps/api-edge/src/org-facade.ts`
- `apps/membership-worker/wrangler.jsonc`
- `packages/db/src/membership/types.ts`
- `packages/db/src/membership/repository.ts`
- `tests/contracts/src/policy.test.ts`
- `tests/membership-worker/src/authorization-context.test.ts`
- `tests/membership-worker/src/membership-worker.test.ts`

# Required Verification

1. Scope and PR hygiene
   - Confirm PR #71 changes only task-scoped contracts, membership-worker
     internal route/helper code, focused tests, and the implementer report.
   - Confirm no `apps/projects-worker`, api-edge forwarding, public project
     routes, policy-engine action/evaluation changes, database migrations,
     Terraform, Wrangler resource changes, Cloudflare/Supabase/AWS resources,
     README cleanup, UI, SDK, CLI, or `specs-v2/**` files changed.
   - Confirm no ignored generated outputs are staged or committed.
   - Confirm `ai/reports/task-0030-implementer.md` is committed on the PR branch
     before merge.

2. Contract surface
   - Confirm `@saas/contracts/policy` exports narrow typed request/response
     shapes for the internal authorization-context query.
   - Confirm the request contains only `subject` and `orgId`.
   - Confirm the response contains `memberships: MembershipFact[]`.
   - Confirm the contract does not add raw membership DB row shapes, role
     assignment IDs, member IDs, persistence helpers, runtime code, or future
     attributes outside the task boundary.
   - Confirm existing policy contract exports and policy-worker tests continue
     to work.

3. Internal route behavior
   - Confirm `membership-worker` serves
     `POST /v1/internal/membership/authorization-context`.
   - Confirm malformed JSON, missing `subject`, invalid `subject.type`, missing
     `subject.id`, and missing `orgId` return the existing safe validation
     envelope.
   - Confirm unsupported methods return the existing safe 405/unsupported
     envelope.
   - Confirm missing `SOURCEPLANE_DB` fails safely without attempting a database
     query and without leaking platform details.
   - Confirm repository failures fail closed with a safe internal error.
   - Confirm the handler disposes the SQL executor in production paths.
   - Confirm the route does not call `policy-worker`; it only returns
     policy-ready facts.

4. Fact mapping and authorization safety
   - Confirm the new mapping helper is the single source of truth used by both
     the internal authorization-context route and existing `authorizeViaPolicy`
     callers.
   - Confirm organization-scoped role assignments map to:
     `{ kind: "role_assignment", role, scope: { kind: "organization", orgId } }`
   - Confirm project-scoped role assignments with a valid `scopeRef` map to:
     `{ kind: "role_assignment", role, scope: { kind: "project", orgId, projectId: scopeRef } }`
   - Pay special attention to malformed role assignments. A project-scoped
     assignment without `scopeRef`, or any unexpected `scopeKind`, must not be
     allowed to widen access by becoming an organization-scoped role fact. If
     the current implementation can convert malformed project data into an org
     fact, fix it or fail the PR.
   - Confirm inactive/revoked assignments are not returned by the repository
     query.
   - Confirm the response never includes role-assignment IDs, member IDs,
     `subjectId`, raw DB timestamps, or other persistence-only fields.

5. Privacy and boundary checks
   - Confirm `api-edge` does not forward any public route to
     `/v1/internal/membership/authorization-context`.
   - Confirm `membership-worker` stage/prod `workers_dev: false` remains
     unchanged.
   - Confirm no bearer tokens, session tokens, invitation tokens, token hashes,
     SQL, connection details, or stack traces can appear in the new response or
     tests.
   - Confirm the new route remains an internal service-binding seam for future
     domain workers, not a public API.

6. Regression coverage
   - Confirm existing public membership routes keep their behavior:
     - `GET /v1/organizations/{orgId}`
     - `GET /v1/organizations/{orgId}/members`
     - invitation create/list/revoke/accept
     - member role update/remove
   - Confirm tests still cover policy-gated public routes after the helper
     extraction.
   - Add verifier coverage if needed for malformed role-assignment mapping,
     response redaction, or api-edge non-forwarding.

7. Orun and CI evidence
   - Confirm PR CI run `26391993245` reflects the latest branch head and is
     green.
   - Inspect the PR CI plan/logs enough to confirm the expected contracts,
     membership-worker, membership-worker-tests, contracts-tests, and related
     verify jobs ran.
   - Confirm no unexpected migration, db-migrate apply, infrastructure,
     projects-worker, or api-edge deploy jobs were introduced by the PR.

# Required Checks

Run at minimum:

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts-tests test
pnpm --filter @saas/membership-worker typecheck
pnpm --filter @saas/membership-worker-tests test
pnpm --filter @saas/membership-worker build
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
gh pr checks 71
```

Also inspect PR CI run `26391993245` with `gh` so you can cite real job/log
evidence for the rendered plan and successful checks.

If you add verifier fixes, rerun the affected local checks and ensure PR CI is
green after pushing.

# Merge Requirement

If verification passes:

- Merge PR #71.
- Sync local `main` to the merge commit.
- Confirm the post-merge main CI run starts or, if already complete, record its
  result.
- Leave `ai/state.json` and compact context ready for the Orchestrator to
  record Task 0030 as verified and select the next projects-worker slice.

If verification fails:

- Keep PR #71 open.
- Either commit scoped verifier fixes to the PR branch or write a concise FAIL
  report explaining the blocker.

# Report Expectations

Write `ai/reports/task-0030-verifier.md` with:

- Result: PASS or FAIL.
- PR number and merge status.
- Checks run with exact commands and results.
- PR CI evidence, including run `26391993245` and relevant job/log findings.
- Findings/issues, if any.
- Verifier fixes, if any.
- Risk notes, especially around internal-route privacy and malformed fact
  mapping.
- Spec proposals, if any.
- Recommended next move.
