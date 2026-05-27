# Task ID

Task 0021 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0021 implementation is open as PR #62:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/62
- Branch: `codex/task-0021-invitation-admin-api`
- Head commit observed when this verifier prompt was written:
  `7a5d1bf56c0c76dad185377cdad6866bcb9ece59`
- Base: `main` at `cd3a35fadd4ff096bc95e769c501f6d6d334570b`
- Current PR state: open, ready for review, mergeable, not draft
- Latest observed PR CI run: `26369163728`, all visible checks passed
- Branch content observed: 1 commit ahead of `main`

Observed implementation summary:

- Adds public invitation contract types in `@saas/contracts/membership`.
- Adds `inv_` public ID helpers and invitation token generation/hash helpers.
- Adds membership-worker handlers for:
  - `POST /v1/organizations/{orgId}/invitations`
  - `GET /v1/organizations/{orgId}/invitations`
  - `DELETE /v1/organizations/{orgId}/invitations/{invitationId}`
- Adds `DEBUG_DELIVERY` to membership-worker config:
  local/dev/stage `true`, prod `false`.
- Adds paginated invitation listing in the membership repository.
- Extends api-edge org facade route matching/forwarding for invitation routes.
- Adds db, membership-worker, and api-edge tests.

Important verification risks:

- PR #62's changed file list does not currently include
  `ai/reports/task-0021-implementer.md`, although the report exists locally as
  an untracked file. A completed implementer report must be committed to the PR
  branch before PASS, or the PR must fail.
- The create route intentionally returns raw invitation tokens when
  `DEBUG_DELIVERY=true`. Verify prod config and post-merge deployment cannot
  expose raw invitation tokens, and verify raw tokens never appear in reports,
  logs, cursors, persisted rows, or non-debug responses.
- Verify invitation creation generates and hashes the token only after
  successful policy authorization, so denied actors cannot trigger token
  generation or persistence.
- Verify no invitation acceptance route or hidden acceptance behavior was added.
  Current `acceptInvitation` still lacks accepted-member role assignment
  creation, so exposing accept would be unsafe.
- Verify tests exercise actual membership-worker handlers and api-edge facade
  behavior, not only helper snippets.

# Objective

Independently verify PR #62 against Task 0021.

If the PR is production-safe after any strictly Task 0021-scoped verifier fixes,
merge it, wait for the post-merge `main` pipeline, inspect CI logs, sync local
`main`, update compact orchestration context/state, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers.

# PR Boundary

This verifier task covers PR #62 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0021-verifier.md`;
- adding or correcting the missing Task 0021 implementer report if the existing
  local report is accurate and task-scoped;
- small, strictly Task 0021-scoped fixes needed to make PR #62 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add invitation acceptance, member removal, role update routes, project
routes, audit/event persistence, notification queues, real email delivery,
database migrations, Terraform resources, Supabase resources, AWS IAM/S3/Secrets
Manager resources, Queues, KV, R2, policy-engine permission changes, UI, SDK,
CLI, or `specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0021.md`
- `ai/reports/task-0021-implementer.md` if present locally or in the PR
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
- `specs/components/02-identity.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/04-organizations-membership.md`
- `specs/components/14-notifications.md`
- `packages/contracts/src/membership.ts`
- `packages/db/src/membership/types.ts`
- `packages/db/src/membership/repository.ts`
- `packages/db/src/migrations/020_membership_core/up.sql`
- `apps/membership-worker/src/env.ts`
- `apps/membership-worker/src/http.ts`
- `apps/membership-worker/src/ids.ts`
- `apps/membership-worker/src/pagination.ts`
- `apps/membership-worker/src/policy-client.ts`
- `apps/membership-worker/src/router.ts`
- `apps/membership-worker/src/handlers/create-invitation.ts`
- `apps/membership-worker/src/handlers/list-invitations.ts`
- `apps/membership-worker/src/handlers/revoke-invitation.ts`
- `apps/membership-worker/wrangler.jsonc`
- `apps/api-edge/src/org-facade.ts`
- `tests/membership-worker/**`
- `tests/api-edge/**`
- `tests/db/**`
- PR #62 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26369163728`

# Required Outcomes

## PR Review

- Confirm PR #62 has a real PR number, is based on current `main`, is not draft,
  is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not only
  summaries.
- Verify `ai/reports/task-0021-implementer.md` is committed in the PR before
  PASS. If it remains untracked or absent from the PR, fix or fail.
- Verify the PR is bounded to Task 0021:
  - invitation contract types;
  - invitation ID/token helpers;
  - create/list/revoke membership-worker handlers;
  - paginated invitation repository query;
  - membership-worker `DEBUG_DELIVERY` config;
  - api-edge invitation route forwarding;
  - focused db, membership-worker, and api-edge tests.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw bearer tokens, invitation token
  hashes, signing secrets, encryption secrets, or Secrets Manager payloads are
  committed, logged, returned, or embedded in cursors.

## Invitation Contract Review

- Verify public invitation records use `inv_` IDs and never expose raw database
  UUIDs or `token_hash`.
- Verify create requests accept only `email` and organization roles:
  `owner`, `admin`, `builder`, `viewer`, `billing_admin`.
- Verify project roles and unknown roles return safe validation errors.
- Verify response shapes stay compatible with the standard success/error
  envelope, including `meta.cursor` on list routes.
- Verify expiration/status semantics are explicit. If expired status is derived
  without mutating the database, ensure tests cover it and the behavior is
  documented in the verifier report.

## Token And Debug Delivery Review

- Verify invitation tokens are unguessable enough for V1 and generated with
  Worker-safe Web Crypto.
- Verify only the SHA-256 hash is passed to persistence.
- Verify raw tokens are generated only after successful authorization.
- Verify raw tokens appear only in the explicit debug delivery response when
  `DEBUG_DELIVERY=true`.
- Verify prod `DEBUG_DELIVERY=false` in `apps/membership-worker/wrangler.jsonc`
  and, after merge, in deployed Worker configuration/logs as far as non-secret
  inspection allows.
- Verify local/dev/stage debug delivery behavior is intentional and documented
  in the verifier report.

## Authorization And Routing Review

- Verify all three membership-worker routes require actor headers.
- Verify all three routes use the policy-worker service binding and fail closed:
  missing binding, fetch throw, non-OK policy response, malformed envelope,
  policy denial, and actor role-list failure must not perform domain actions.
- Verify actions are exact:
  - create: `organization.invitation.create`
  - list: `organization.invitation.list`
  - revoke: `organization.invitation.revoke`
- Verify creation and revocation happen only after authorization succeeds.
- Verify policy denial returns a safe non-enumerating response consistent with
  existing organization/member patterns.
- Verify api-edge resolves auth through `IDENTITY_WORKER` before forwarding and
  does not forward bearer tokens to `MEMBERSHIP_WORKER`.
- Verify api-edge forwards POST JSON body, DELETE method, query strings for
  invitation list pagination, request ID, traceparent, idempotency-key, and
  content-type as appropriate.
- Verify method restrictions:
  - collection route allows only `POST` and `GET`;
  - item route allows only `DELETE`.

## Pagination And Repository Review

- Verify invitation list uses the Task 0020 cursor contract:
  `limit`, `cursor`, default 50, max 100, invalid params return
  `validation_failed`, and next cursor appears at `meta.cursor`.
- Verify repository SQL is parameterized and uses deterministic ordering:
  `created_at DESC, id DESC`.
- Verify cursor filtering uses both timestamp and UUID tie-breaker.
- Verify `limit + 1` is used to determine whether another page exists.
- Verify paginated results do not include `token_hash`.
- Verify existing invitation repository methods remain compatible.
- Verify no database migration was added.

## Non-Goals Guardrail

- Confirm PR #62 does not add:
  - invitation acceptance route;
  - member removal route;
  - member role update route;
  - organization settings route;
  - policy-engine permission changes;
  - notification Worker, Queue, Workflow, event bus, or real email provider;
  - audit/event persistence;
  - infrastructure/resource creation;
  - UI, SDK, CLI, or `specs-v2/**` changes.

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

Also inspect GitHub Actions run `26369163728` logs. Confirm the visible PR
checks correspond to the final head commit `7a5d1bf56c0c76dad185377cdad6866bcb9ece59`.

If you make verifier fixes, rerun the affected local checks and confirm PR CI
goes green again for the final head.

# Merge And Post-Merge Requirements

Only merge after all acceptance criteria pass.

After merge:

- Wait for the `main` pipeline triggered by the merge commit.
- Inspect post-merge CI logs, not just the aggregate status.
- Verify membership-worker stage/prod deployment metadata still has
  `workers_dev: false`, correct `POLICY_WORKER` and `SOURCEPLANE_DB` bindings,
  and prod `DEBUG_DELIVERY=false`.
- Verify api-edge stage/prod deployment metadata still has correct
  `IDENTITY_WORKER` and `MEMBERSHIP_WORKER` bindings.
- Sync local `main`.
- Update:
  - `ai/context/current.md`
  - `ai/context/task-ledger.md`
  - `ai/context/decisions.md`
  - `ai/context/open-risks.md`
  - `ai/state.json`
- Write `ai/reports/task-0021-verifier.md`.

# PASS Report Requirements

`ai/reports/task-0021-verifier.md` must include:

- Summary
- Files Changed By Verifier
- Verification Performed
- CI / Deployment Evidence
- Security And Token Handling Notes
- Remaining Gaps
- PR Number
- Result: PASS

# FAIL Report Requirements

If PR #62 fails verification, do not merge. Write
`ai/reports/task-0021-verifier.md` with:

- Result: FAIL
- Blocking findings with file paths and concrete reproduction/verification
  evidence
- Checks run
- Required fixes before another verifier pass

