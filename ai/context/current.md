# Current Context

Last updated: 2026-05-27

## Repo Reality

- Task 0021 squash-merged at `324ca36` via PR #62.
- Task 0022 squash-merged at `28dd671` via PR #63.
- Follow-up docs/state commit `2c8ebb5` is on `main`.
- Tasks 0001–0039 are verified.
- Task 0021 added policy-gated invitation administration endpoints:
  - `POST /v1/organizations/{orgId}/invitations` — create invitation
  - `GET /v1/organizations/{orgId}/invitations` — list with cursor pagination
  - `DELETE /v1/organizations/{orgId}/invitations/{invitationId}` — revoke
  - Invitation tokens: 32 random bytes via Web Crypto, SHA-256 hash stored in DB.
  - Raw tokens only returned when `DEBUG_DELIVERY=true` (local/dev/stage); prod
    is `DEBUG_DELIVERY=false`.
  - Public IDs: `inv_` prefix + UUID hex (no dashes), matching `org_`/`mem_`.
  - Pagination: `(created_at DESC, id DESC)` ordering, reuses Task 0020 cursor
    contract (limit/cursor, default 50, max 100).
  - Authorization: fail-closed, policy denial returns 404 (no enumeration).
  - Status derivation: `expired` computed from `expiresAt < now` without DB
    mutation.
  - Role allowlist: `owner`, `admin`, `builder`, `viewer`, `billing_admin`.
  - 104 membership-worker tests, 183 db tests, 78 api-edge tests.
  - Verifier committed the implementer report to the PR branch before merge.
- Task 0022 added invitation acceptance:
  - `POST /v1/organizations/{orgId}/invitations/accept` through api-edge to
    membership-worker.
  - Acceptance is authorized by valid token possession plus authenticated email
    match and explicit path organization match; it does not call policy-worker
    because the invited user is not yet a member.
  - Repository acceptance marks the invitation accepted, creates the active
    member, and creates the organization-scoped role assignment in one CTE.
  - Verifier removed `ON CONFLICT (id) DO NOTHING` from member/role INSERT CTEs
    so generated-ID uniqueness conflicts abort the whole statement instead of
    allowing partial acceptance.
  - api-edge now forwards `x-actor-email` from the identity session response for
    organization routes while continuing not to forward bearer tokens.
  - 119 membership-worker tests, 188 db tests, 85 api-edge tests passed.
- Previous infrastructure unchanged:
  - membership-worker stage/prod deployed with `POLICY_WORKER`, `SOURCEPLANE_DB`,
    `DEBUG_DELIVERY`, and `workers_dev: false`.
  - api-edge stage/prod deployed with `IDENTITY_WORKER` and `MEMBERSHIP_WORKER`
    service bindings.
  - policy-worker stage/prod deployed with no public route.
  - identity-worker stage/prod unchanged.
- Hyperdrive resources stable:
  - stage: `08f7c6055f544a3890a585d88fd92348` (`stg-multi-tenant-saas-stage`)
  - prod: `ab2c21c2db6245a59c91588fcac7107a` (`prod-multi-tenant-saas-prod`)
- Supabase stage ref: `thielrrsejwhjkdluwqm`, prod ref: `npbvrxkrlyrpnhrqucxa`.
  dev remains unprovisioned.
- Local Orun validation passes.
- Post-merge Task 0021 main CI run `26369638914` passed (19/19 jobs).
- Post-merge Task 0022 main CI run `26371024844` passed (19/19 jobs), and
  follow-up docs/state CI run `26371131814` passed.
- Task 0024 verified PASS and merged via PR #65 at `be47532`.
- Post-merge Task 0024 main CI run `26380045214` passed (12/12 jobs).
- `TransactionalSqlExecutor` and `invite.revoked` event/audit wiring are live.
- Task 0025 verified PASS and merged via PR #66 at `295bdd8`.
- Post-merge Task 0025 main CI run `26382162480` passed.
- Local db-tests module resolution is repaired on main; `tests/db/tsconfig.json`
  now maps `@saas/db/membership` and `@saas/db/events`.
- Task 0026 verified PASS and merged via PR #67 at `c02a47d`.
- Post-merge Task 0026 main CI run `26383797222` passed.
- Invitation lifecycle event/audit coverage is complete:
  `invite.created`, `invite.accepted`, and `invite.revoked` are wired
  atomically with their membership mutations.
- Task 0027 verified PASS after verifier fixes and merged via PR #68 at
  `60240ce`.
- Post-merge Task 0027 main CI run `26385774244` passed.
- Member role update and member removal routes are live on main:
  - `PATCH /v1/organizations/{orgId}/members/{memberId}`
  - `DELETE /v1/organizations/{orgId}/members/{memberId}`
  - Both are policy-gated through the private policy-worker seam.
  - Both enforce last-active-owner protection.
  - Member removal revokes stale role facts so removed members cannot keep
    authorizing through policy.
  - `membership.updated` and `membership.removed` event/audit writes are
    transactionally coupled to the membership mutations.
- Task 0027 verifier fixed two role-cleanup bugs before merge:
  - update-member-role now checks every per-role revoke result in the
    transactional path;
  - remove-member now fails the transaction if `revokeAllRoleAssignments`
    fails.
- Task 0028 verified PASS after verifier fix and merged via PR #69 at
  `240e412`.
- Post-merge Task 0028 main CI run `26387697533` passed, but its rendered
  changed plan did not include `db-migrate`; it ran only db/contracts package
  verify jobs. Therefore `040_projects_core` is merged on main but is not yet
  proven applied to stage/prod.
- Local reproduction: `orun plan --changed --files
  packages/db/src/migrations/040_projects_core/up.sql --trigger
  github-push-main` selects only `db.*.verify`, while changing
  `infra/db-migrate/component.yaml` selects `db-migrate.stage.migrate` and
  `db-migrate.prod.migrate` with `Migration Apply`. The `spec.paths` watcher on
  `infra/db-migrate/component.yaml` is not affecting changed-component
  selection for migration files.
- Task 0029 verified PASS and merged via PR #70 at `974b7b2`.
- PR #70 replaced `spec.paths` with `spec.path` for the `db-migrate` component
  and adjusted the migration-runner CLI path in the Stack Tectonic job
  template.
- Post-merge Task 0029 main CI run `26389807233` passed.
- Main CI job evidence from run `26389807233`:
  - `db-migrate · stage · Migrate` ran `Migration Apply` and logged
    `040_projects_core` in the applied set.
  - `db-migrate · prod · Migrate` ran `Migration Apply` and logged
    `040_projects_core` in the applied set.
- `040_projects_core` is now proven applied on both live Supabase projects.
- Task 0030 verified PASS after verifier fix and merged via PR #71 at
  `1928559`.
- Post-merge Task 0030 main CI run `26392905135` passed (12/12 jobs).
- Membership-owned internal authorization-context seam is live:
  `POST /v1/internal/membership/authorization-context`.
- The seam returns policy-ready `MembershipFact[]` for `{ subject, orgId }` and
  is not exposed through `api-edge`.
- Task 0030 verifier fixed a critical malformed-fact bug: project-scoped role
  assignments without `scopeRef` remain project-scoped and do not widen into
  organization-scoped facts.
- `mapRoleAssignmentsToFacts` is now the shared helper used by both the internal
  authorization-context route and existing membership-worker policy calls.
- Task 0031 verified PASS and merged via PR #72 at `3fc15bf`.
- Verifier fix commit `1944979` added the missing
  `tests/api-edge/src/project-facade.test.ts` and
  `ai/reports/task-0031-implementer.md` to PR #72 before merge.
- Post-fix PR CI run `26409759476` passed (14/14 jobs), including
  `api-edge-tests · dev · Verify` and `projects-worker-tests · dev · Verify`.
- Post-merge Task 0031 main CI run `26409923288` passed (14/14 jobs).
- `apps/projects-worker` is live on main with project create/get routes:
  - `POST /v1/organizations/{orgId}/projects`
  - `GET /v1/organizations/{orgId}/projects/{projectId}`
  - The Worker uses membership-worker authorization-context before calling
    policy-worker.
  - Project creation writes `project.created` event/audit atomically with the
    project insert.
  - Stage/prod projects-worker deployments are private (`workers_dev: false`)
    and api-edge stage/prod bind `PROJECTS_WORKER` to same-environment
    projects-worker.
- Task 0032 verified PASS and merged via PR #73 at `06c7dbb`.
- Verifier fix commit `4eff29a` added the missing
  `ai/reports/task-0032-implementer.md` to PR #73 before merge.
- Post-fix PR CI run `26411612299` passed (22/22 checks).
- Post-merge Task 0032 main CI run `26411761006` passed (23/23 jobs).
- Project list is live on main:
  - `GET /v1/organizations/{orgId}/projects`
  - Uses org-scoped `project.list` policy action.
  - Organization roles `owner`, `admin`, `builder`, and `viewer` can list
    active projects; `billing_admin` and project-scoped roles alone cannot list
    organization-wide projects.
  - Uses cursor pagination with `limit`/`cursor` and `meta.cursor`.
  - Uses membership-worker authorization-context before policy-worker.
- `project.read` still requires explicit `projectId`.
- Task 0033 verified PASS and merged via PR #74 at `9666308`.
- Verifier fix commit `fe4b427` added the missing
  `ai/reports/task-0033-implementer.md` to PR #74 before merge.
- Post-fix PR CI run `26413053582` passed (15/15 checks).
- Post-merge Task 0033 main CI run `26413213117` passed (15/15 jobs).
- Project archive is live on main:
  - `DELETE /v1/organizations/{orgId}/projects/{projectId}`
  - Uses existing project-scoped `project.delete` policy action.
  - Soft-archives via `archiveProject`; no hard-delete behavior.
  - Writes `project.archived` event/audit atomically with the archive mutation.
  - Uses membership-worker authorization-context before policy-worker.
- Task 0034 verified PASS after verifier fix and merged via PR #75 at
  `7e4dc5e`.
- Verifier fix commit `83831f3` added the missing
  `ai/reports/task-0034-implementer.md` to PR #75 before merge.
- Post-fix PR CI run `26432668853` passed (22/22 checks).
- Post-merge Task 0034 main CI run `26432854069` passed, and follow-up
  verifier/state CI run `26432938193` passed.
- Environment create/list/get is live on main:
  - `POST /v1/organizations/{orgId}/projects/{projectId}/environments`
  - `GET /v1/organizations/{orgId}/projects/{projectId}/environments`
  - `GET /v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}`
  - Uses `env_` public IDs.
  - Uses project-scoped `environment.create` for create and existing
    project-scoped `environment.read` for list/get.
  - Requires explicit `orgId + projectId` scope, with `environmentId` on get.
  - Confirms parent project exists and is active before environment operations.
  - Writes `environment.created` event/audit atomically with environment
    creation.
  - Uses membership-worker authorization-context before policy-worker.
- Task 0035 verified PASS and merged via PR #76 with environment archival:
  - `DELETE /v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}`
  - Uses project-scoped `environment.delete` policy action (org owner/admin,
    project_admin).
  - Soft-archives via `archiveEnvironment`; parent project must exist and be
    active.
  - Writes `environment.archived` event/audit atomically with the archive mutation.
  - Uses membership-worker authorization-context before policy-worker.
  - All 497 tests pass across 4 test suites.
  - Verifier report: `ai/reports/task-0035-verifier.md`.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- Week 0 operations foundation, Worker binding seam, identity persistence,
  identity Worker auth runtime, api-edge auth facade, membership persistence
  foundation, membership Worker organization runtime, policy authorization seam,
  membership-to-policy binding, member-list read surface, cursor pagination,
  invitation administration, invitation acceptance, events/audit persistence,
  transaction-safe invitation event wiring, member-admin mutations,
  projects/environments persistence contracts/repository, db-migrate
  changed-plan repair, membership-owned authorization-context seam, first
  project archival, environment create/list/get, environment archive, and
  organization audit list (Task 0036) are complete.
- The full auth flow is accessible through the public `api-edge` gateway.
- Organization create/list/read, member-list, invitation create/list/revoke,
  invitation acceptance, member role update, member removal, project
  create/list/read/archive, environment create/list/get/archive, and
  organization audit list routes are
  accessible through the public `api-edge` gateway with bearer token
  authentication. Existing list routes use cursor pagination.
- Organization read, member list, invitation create/list/revoke, member role
  update, and member removal are policy-gated through the internal
  policy-worker.

## Current Task

**Task 0042 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0042.md`
- Verifier prompt: `ai/tasks/task-0042-verifier.md`
- PR #85 (`codex/task-0042-cloudflare-custom-domains`) **MERGED** at
  commit `d0d5c6e` (2026-05-27T14:51:08Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/85`
- All 22 PR CI checks passed in run `26501416473`.
- Post-merge main CI run **26518889622** **COMPLETED** with conclusion=success
  (22/22 jobs).
- Cloudflare infrastructure deployed:
  - `cloudflare-domain · stage · Terraform`: ✅ (14:53:12)
  - `cloudflare-domain · prod · Terraform`: ✅ (14:53:54)
- Cloudflare Pages deployments live:
  - Stage: `https://ba5d2c65.sourceplane-web-console-stage.pages.dev`
    (d0d5c6e, 2 min ago)
  - Prod: `https://f774baf3.sourceplane-web-console-prod.pages.dev`
    (d0d5c6e, 2 min ago)
- Implementer report: `ai/reports/task-0042-implementer.md`
- Verifier report: `ai/reports/task-0042-verifier.md` (final)
- Custom domain config:
  - Stage: `stage.sourceplane.ai`
  - Prod: `prod.sourceplane.ai`
  - Base domain: `sourceplane.ai` (existing Cloudflare zone, no new zone created)
- Intent.yaml is the single domain source of truth: all domain configuration
  flows from `intent.yaml` environment variables (`BASE_DOMAIN`,
  `CONSOLE_CUSTOM_DOMAIN`) to all consuming components (api-edge Worker,
  Terraform domain component).
- CORS integration verified: api-edge reads `CONSOLE_CUSTOM_DOMAIN` from
  environment for origin validation. 189 CORS tests passing.
- Terraform resources match locked provider schema.
- **Acceptance criteria**: All met. PR merged, CI passed, Terraform applied
  to stage/prod, Pages deployed, custom domain configuration live.

Task 0041 was completed by PR #82 and subsequent hotfixes. The web-console
live endpoints are accessible via Cloudflare Pages (stage/prod).

**Next phase**: Identity security-event implementation (Task 0043+).
