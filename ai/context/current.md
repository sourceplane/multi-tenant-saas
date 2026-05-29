# Current Context

Last updated: 2026-05-29

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

## Recent Completed Tasks (0045-0058)

**Task 0045 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0045.md`
- Verifier prompt: `ai/tasks/task-0045-verifier.md`
- PR #88 (`codex/task-0045-identity-security-events-query`) **MERGED** at
  commit `e67a9b2` (2026-05-27T23:35Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/88`
- All PR CI checks passed in run `26544676838` (23 jobs after verifier cleanup commit).
- Post-merge main CI run **26544885697** triggered (in progress at merge time).
- Key durable outcome: `GET /v1/auth/security-events` is now a live, authenticated,
  self-scoped public route returning paginated identity security history with
  SENSITIVE_KEYS redaction. Route is the public read surface for identity-owned
  security events established by Tasks 0043–0044.
- Verifier cleanup: removed 11 out-of-scope ai/ carryover files from PR before merge.
- 269 tests passing (76 identity-worker + 193 api-edge).
- Reports: `ai/reports/task-0045-implementer.md`, `ai/reports/task-0045-verifier.md`

**Task 0046 (Verifier) — COMPLETE ✅**

- PR #89 **MERGED** at commit `3892243`. Web console Account Security view live.

**Task 0047 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0047.md`
- Verifier prompt: `ai/tasks/task-0047-verifier.md`
- PR #90 (`codex/task-0047-api-key-service-principal-foundation`) **MERGED** at
  commit `08c0e7b` (2026-05-28T01:36Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/90`
- PR CI runs: `26548869295` (original, 7/7 pass), `26549208506` (post-cleanup, 7/7 pass).
- Key durable outcome: Identity-owned persistence foundation for service principals
  and API keys. Migration 060 adds `identity.service_principals` and `identity.api_keys`
  tables with hash-only storage, no cross-context FKs. Repository exposes create/get/list/revoke
  persistence seam for follow-on admin routes.
- Verifier cleanup: added implementer report, removed 11 carryover ai/ files.
- 351 db tests passing.
- Reports: `ai/reports/task-0047-implementer.md`, `ai/reports/task-0047-verifier.md`

**Task 0048 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0048.md`
- Verifier prompt: `ai/tasks/task-0048-verifier.md`
- PR #91 (`task-0048/api-key-bearer-resolution`) **MERGED** at commit `2a78a5d` (2026-05-28T04:00Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/91`
- PR CI runs: `26551391669` (original, 27/27 pass), `26551799366` (post-implementer-report, 27/27 pass), `26551978574` (post-verifier-report, 27/27 pass).
- Key durable outcome: Identity now resolves both session tokens and active API keys via `resolveBearer()`. api-edge has a unified `resolveActor()` module that forwards `x-actor-subject-id` and `x-actor-subject-type=service_principal` for SP-authenticated requests. Facades deduplicated (3 separate resolveSession implementations replaced by shared module). No raw bearer tokens forwarded downstream.
- 88 identity-worker tests, 193 api-edge tests, all green.
- Reports: `ai/reports/task-0048-implementer.md`, `ai/reports/task-0048-verifier.md`

**Next phase**: Public API-key administration — identity-worker orchestration consuming the internal membership seam, api-edge routes, policy-gated authorization, and event/audit writes.

**Task 0049 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0049.md`
- Verifier prompt: `ai/tasks/task-0049-verifier.md`
- PR #92 (`codex/task-0049-service-principal-role-bindings`) **MERGED** at commit `c216fa1` (2026-05-28T09:40Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/92`
- PR CI run: `26553711720` (15/15 checks SUCCESS).
- Key durable outcome: Membership-owned internal seam for service-principal role bindings. Three internal routes (create/list/revoke) at `/v1/internal/membership/service-principal-bindings`. Three policy actions (`organization.service_principal.binding.{create,list,revoke}`) restricted to owner/admin. Shared `@saas/contracts/service-principal` helpers enforce canonical `sp_<hex32>` subject-ID shape matching Task 0048 actor forwarding. Handlers fail closed on malformed IDs, invalid role/scope combos, and cross-org mismatches.
- 373 tests passing (141 policy-engine + 212 membership-worker + 20 policy-worker).
- Reports: `ai/reports/task-0049-implementer.md`, `ai/reports/task-0049-verifier.md`

**Task 0050 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0050.md`
- Verifier prompt: `ai/tasks/task-0050-verifier.md`
- PR #93 (`codex/task-0050-api-key-admin-contract`) **MERGED** at commit `77cba75` (2026-05-28T04:44Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/93`
- PR CI run: `26554942026` (plan=SUCCESS, matrix=SKIPPED — docs-only).
- Key durable outcome: Active spec pack consistently presents V1 public API-key admin as tenant-scoped POST/GET/DELETE `/v1/organizations/{orgId}/api-keys[/{apiKeyId}]`. `/v1/auth/api-keys` deprecated. Bounded-context ownership documented. One-time secret return, hash-only persistence, and security-event expectations specified.
- Reports: `ai/reports/task-0050-implementer.md`, `ai/reports/task-0050-verifier.md`

**Task 0051 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0051.md`
- Verifier prompt: `ai/tasks/task-0051-verifier.md`
- PR #94 (`codex/task-0051-public-api-key-admin-runtime`) **MERGED** at commit `d74b7f6` (2026-05-28T08:00Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/94`
- PR CI run: `26558427095` (28/28 checks SUCCESS).
- Key durable outcome: V1 public tenant-scoped API-key admin runtime is live. api-edge recognizes and forwards POST/GET/DELETE `/v1/organizations/{orgId}/api-keys[/{apiKeyId}]` to identity-worker. identity-worker orchestrates membership binding creation, policy authorization, key material generation (sk_ prefix, SHA-256 hash), and security/audit event emission. Policy engine grants `organization.api_key.{create,list,revoke}` to owner/admin; project_admin only when projectId matches via PROJECT_GRANTABLE_ACTIONS. Raw secret returned only on create. Compensating binding revoke on identity failure. 58 new tests (36 policy-engine, 7 api-edge, 15 identity-worker).
- Reports: `ai/reports/task-0051-implementer.md`, `ai/reports/task-0051-verifier.md`

**Task 0052 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0052.md`
- Verifier prompt: `ai/tasks/task-0052-verifier.md`
- PR #95 (`codex/task-0052-web-console-api-key-management-ui`) **MERGED** at commit `cdd781c` (2026-05-28T07:25Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/95`
- PR CI runs: `26560148990` (original, 7/7 SUCCESS), `26560743797` (verifier fix, 7/7 SUCCESS).
- Verifier fixes: (1) one-time secret lifecycle — `apiKeysCreatedSecret` now cleared on tab navigation away and org navigation, not just Dismiss; (2) missing implementer report committed to PR branch.
- Key durable outcome: Web-console API key management UI is live. Authenticated org users can list, create, and revoke API keys from the workspace. API Keys tab inserted between Projects and Audit. Uses only public org-scoped API routes (POST/GET/DELETE `/v1/organizations/{orgId}/api-keys[/{apiKeyId}]`). Typed contracts at `@saas/contracts/api-keys`. One-time secret displayed immediately after create, cleared on dismiss/tab-switch/org-navigation/reload. Cursor pagination with Load More. Revoke with confirmation dialog.
- Reports: `ai/reports/task-0052-implementer.md`, `ai/reports/task-0052-verifier.md`

**Task 0053 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0053.md`
- Verifier prompt: `ai/tasks/task-0053-verifier.md`
- PR #96 (`codex/task-0053-account-profile-api`) **MERGED** at commit `c2b467b` (2026-05-28T08:12Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/96`
- PR CI runs: `26562137078` (original, 27/27 SUCCESS), `26562767336` (post-implementer-report, 27/27 SUCCESS).
- Key durable outcome: Self-scoped `GET/PATCH /v1/auth/profile` is live on main. Authenticated users can read and update their `displayName`. Body validation is fail-closed (max 120 chars, empty→null, unsupported fields rejected). API-key/service-principal actors blocked from profile updates. Safe `user.profile.updated` security event recorded with only changed field names. api-edge forwards GET/PATCH with body for PATCH.
- Verifier committed missing implementer report to PR branch. No other fixes needed.
- 118 identity-worker tests, 204 api-edge tests, all green.
- Reports: `ai/reports/task-0053-implementer.md`, `ai/reports/task-0053-verifier.md`

**Task 0054 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0054.md`
- Verifier prompt: `ai/tasks/task-0054-verifier.md`
- PR #97 (`impl/task-0054-profile-settings-ui`) **MERGED** at commit `73f76bf` (2026-05-28T08:36Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/97`
- PR CI runs: `26563632783` (original, 4/4 SUCCESS), `26564017112` (post-verifier-report, 4/4 SUCCESS).
- Key durable outcome: Web-console account profile settings UI is live. Authenticated users can view email (read-only) and update/clear display name via `GET/PATCH /v1/auth/profile`. Account view with Profile and Security Events tabs replaces the old Account Security button. In-memory session and header update after save without reload. All existing workspace flows preserved.
- Reports: `ai/reports/task-0054-implementer.md`, `ai/reports/task-0054-verifier.md`

**Task 0055 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0055.md`
- Verifier prompt: `ai/tasks/task-0055-verifier.md`
- PR #98 (`impl/task-0055-config-settings-flags`) **MERGED** at commit `d148ccf` (2026-05-28T09:13Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/98`
- PR CI runs: `26565113214` (original, 7/7 SUCCESS), `26565687838` (post-verifier-cleanup, 7/7 SUCCESS).
- Key durable outcome: Config persistence foundation live on main. `config` schema with `settings`, `feature_flags`, and `secret_metadata` tables. Typed `@saas/db/config` repository with full CRUD, cursor pagination, rotate/revoke for secrets. Secret-safe by design — ciphertext_envelope never exposed through repository. 568-line test suite with scope validation, secret-safety invariants.
- Verifier cleanup: removed 26 unrelated ai/ carryover files, reverted 4 state/context files, reconstructed missing implementer report.
- Reports: `ai/reports/task-0055-implementer.md`, `ai/reports/task-0055-verifier.md`

**Task 0056 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0056.md`
- Verifier prompt: `ai/tasks/task-0056-verifier.md`
- PR #99 (`impl/task-0056-config-worker-read-api`) **MERGED** at commit `352ca71` (2026-05-28T10:03Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/99`
- PR CI runs: `26567374841` (original, 27/27 SUCCESS), `26567965265` (post-verifier-artifacts, 27/27 SUCCESS).
- Key durable outcome: Read-only config API surface live on main. `apps/config-worker` with 9 GET routes (settings, feature flags, secret metadata × org/project/env scopes). `api-edge` facade forwarding with actor resolution, no raw bearer tokens. Policy deny-by-default, billing_admin excluded from config read. Secret metadata responses expose only key/status/version — no plaintext, ciphertext, or hashes. Cursor pagination (default 50, max 100). 55 config-worker tests, 222 api-edge tests.
- Reports: `ai/reports/task-0056-implementer.md`, `ai/reports/task-0056-verifier.md`

**Task 0057 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0057.md`
- Verifier prompt: `ai/tasks/task-0057-verifier.md`
- PR #100 (`impl/task-0057-config-worker-deploy-fix`) **MERGED** at commit `fa0e2de` (2026-05-28T11:30Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/100`
- PR CI run: `26569227047` (20/20 SUCCESS).
- Post-merge main CI run: `26570117470` (SUCCESS — all config-worker and api-edge deploy jobs green).
- Key durable outcome: Config-worker placeholder Hyperdrive IDs replaced with verified stage/prod resource IDs. api-edge component.yaml dependsOn now includes config-worker for correct deploy ordering. 13 deployment-config regression tests prevent recurrence. Repo health upgraded to green — all deployment paths functional.
- Reports: `ai/reports/task-0057-implementer.md`, `ai/reports/task-0057-verifier.md`

**Task 0058 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0058.md`
- Verifier prompt: `ai/tasks/task-0058-verifier.md`
- PR #101 (`impl/task-0058-config-ui`) **MERGED** at commit `fb013db` (2026-05-28T12:00Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/101`
- PR CI run: `26571217418` (4/4 checks SUCCESS — plan + web-console dev/stage/prod verify deploy).
- Key durable outcome: Read-only Config tab live in web-console. Authenticated org users can inspect settings, feature flags, and secret metadata through all 9 public api-edge config list routes at org/project/environment scope. Explicit scope selection with environment on-demand loading via `listEnvironments`. Cursor pagination with Load More. Secret metadata limited to safe `PublicSecretMetadata` fields — no plaintext, ciphertext, or secret values. All config values rendered as safe text nodes via `document.createTextNode()`.
- Reports: `ai/reports/task-0058-implementer.md`, `ai/reports/task-0058-verifier.md`


**Task 0059 (Verifier) — COMPLETE ✅**

- Prompt: `ai/tasks/task-0059.md`
- Verifier prompt: `ai/tasks/task-0059-verifier.md`
- PR #102 (`impl/task-0059-config-mutations`) **MERGED** at commit `c3e2b2d` (2026-05-28T13:15Z).
- PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/102`
- PR CI runs: `26573058974` (original, 26/26 SUCCESS), `26573580190` (post-verifier-artifacts, 27/27 SUCCESS).
- Key durable outcome: Config mutation handlers live on main. `apps/config-worker` supports POST create and PATCH update for settings and feature flags at org/project/environment scopes. `apps/api-edge` forwards POST/PATCH config routes with body and Idempotency-Key, no raw bearer tokens. Policy actions `organization.config.write` and `project.config.write` deny-by-default, granted to owner/admin and project_admin respectively. Atomic `settings.updated` and `feature.updated` event/audit writes coupled to mutations. 98 config-worker tests, 223 api-edge tests.
- Verifier fixes: 2 stale api-edge tests updated (isConfigRoute item route match, POST forwarding), missing implementer report reconstructed.
- Reports: `ai/reports/task-0059-implementer.md`, `ai/reports/task-0059-verifier.md`

## Current Task

Task 0060 Verifier is scoped and ready.

- Prompt: `ai/tasks/task-0060-verifier.md`
- PR: #103 (`impl/task-0060-scope-enforcement`)
- Status at orchestration: OPEN, non-draft, merge state CLEAN, CI run
  `26574711168` green.
- Objective: verify Task 0060 scope enforcement for config setting and
  feature-flag PATCH item routes. Requested public route scope must exactly
  match the stored row scope before authorization or mutation succeeds.
- Boundary: verifier must inspect config-worker router and update handlers,
  focused config-worker tests, PR CI logs, secret safety, and absence of
  unrelated UI/secret/infrastructure/state churn. If PASS and CI remains green,
  merge PR #103, sync local `main`, leave repo clean, and write
  `ai/reports/task-0060-verifier.md`.

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
  project archival, environment create/list/get/archive, organization audit list,
  identity security events, API-key/service-principal foundation and admin,
  account profile/security UI, config persistence, config read APIs, config-worker
  deploy fix, read-only config UI, and config mutation runtime are complete.
- Task 0060 is in verification. It hardens Task 0059 item-level update routes by
  preventing same-org organization/project/environment URL aliases from updating
  rows whose stored scope does not match the requested public path scope.

## Current State

- Task 0074 verified PASS and merged via PR #117 at `d67aba5d7458b68e527f996ae4c177c4e3427bf4` (2026-05-28). Post-merge main CI run `26609144832` passed 15/15, and follow-up state/ledger CI run `26609344259` passed.
- Task 0074 added metering rollup materialization: `@saas/db/metering.materializeUsageRollups` aggregates raw usage into hourly/daily `metering.usage_rollups` using parameterized SQL, org-scoped grouping, deterministic ids, half-open windows, and idempotent `ON CONFLICT` upserts matching `uq_rollup_dimensions`.
- `apps/metering-worker` now has a bounded scheduled handler on cron `5 * * * *` that materializes prior/current hour and prior/current day windows, fails closed when `SOURCEPLANE_DB` is absent, and logs only bucket/window/row-count data.
- Task 0075 verified PASS and merged via PR #118 (squash merge `ba01ea64bc046b0ad89582d0ad51275eafb91f1f`) on 2026-05-29. PR CI run `26610166103` was 11/11 SUCCESS and post-merge main CI run `26610557793` was 11/11 SUCCESS. Both `db-migrate · stage · Migrate` and `db-migrate · prod · Migrate` applied `110_billing_foundation` to live Supabase.
- Billing foundation now live on main:
  - Migration `110_billing_foundation` (checksum `980564a8…b9f8f`) creates `billing.{plans, billing_customers, subscriptions, invoices, entitlements}` with `org_id`-first indexes, `UNIQUE(org_id)` on `billing_customers` (V1 invariant), `UNIQUE(org_id, entitlement_key)`, CHECK constraints on every enum/amount, and is idempotent under the Supabase autocommit runner.
  - `@saas/db/billing` exports `createBillingRepository(SqlExecutor)` returning a Worker-safe `BillingRepository`. Every accessor uses parameterized SQL only and is org-scoped on cross-tenant-sensitive paths. Invoice upsert refuses cross-org overwrites via `ON CONFLICT (id) DO UPDATE … WHERE billing.invoices.org_id = EXCLUDED.org_id`. Zero references to `metering.*`.
  - `@saas/contracts/billing` exports provider-neutral public types (`PublicPlan`, `PublicBillingCustomer`, `PublicSubscription`, `PublicInvoice`, `PublicEntitlement`, summary/list envelopes). Opaque `provider*` and `hostedUrl` fields only — no secret-bearing surfaces; enforced at the type level by a contracts test.
  - Tests: 30 db-tests + 14 contracts-tests cover tenant isolation, parameterized-SQL invariant, entitlement upsert, invoice cross-org safety, summary composition, and a dedicated metering/billing boundary assertion.
- Tasks 0001–0075 are complete and verified. No billing Worker runtime, api-edge billing routes, web-console billing UI, provider SDK, provider secrets, Terraform, Queue/KV/Durable Object/Analytics Engine bindings, or `specs-v2/**` changes were introduced by Task 0075.

## Current Task

No active task — orchestrator should select the next billing-runtime or roadmap task. See "Next Task After 0075" below.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- Week 4-5 usage→billing phase is active.
- Metering prerequisites are in place: persistence/contracts (Task 0071), public metering Worker/API surface (Task 0072), and rollup materialization (Task 0074).
- Billing foundation is in place: persistence + provider-neutral contracts (Task 0075).

## Next Task After 0075

Natural next task: billing Worker runtime / api-edge billing routes exposing provider-neutral `listPlans`, `getBillingCustomer`, `getBillingSummary`, `listInvoices`, and `getEntitlements` through policy-gated organization routes. Payment-provider integration (webhooks, checkout/portal sessions), billing UI, and quota-definition management should remain separate follow-up tasks per `specs/components/11-billing.md` sequencing.

