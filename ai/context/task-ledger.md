# Task Ledger

Last updated: 2026-05-26

## Task 0001

- Agent: Implementer
- Prompt: `ai/tasks/task-0001.md`
- Status: verified and merged
- Objective: create the initial pnpm/Turbo/Orun monorepo scaffold with one
  Worker app, one Pages app, starter shared packages, test components, infra
  component placeholders, and Orun-only CI.
- PR: #4 (`task-0001-scaffold`), merged into `main` at `4d38ded`
- Reports: `ai/reports/task-0001-implementer.md`,
  `ai/reports/task-0001-verifier.md`
- Durable outcome: initial scaffold landed. Verifier fixed contract drift in
  the PR branch before merge and confirmed local package gates plus Orun
  verification passed.

## Task 0001.1

- Agent: Implementer + Verifier
- Prompt: `ai/tasks/task-0001.1.md`
- Status: verified and merged
- PRs: #5 (`codex/human-01`) and #6 (`codex/fix-composition-input-ci`), merged
  into `main` by `b68794c`
- Reports: `ai/reports/task-0001.1-implementer.md`,
  `ai/reports/task-0001.1-verifier.md`
- Durable outcome: `stack-tectonic/` is the committed local composition
  catalog, component descriptors validate against it, Orun CI reaches and
  passes the matrix, and generated `.orun/` files are ignored.

## Task 0002

- Agent: Implementer
- Prompt: `ai/tasks/task-0002.md`
- Status: verified and merged
- Objective: discover, document, and begin Terraform adoption for the existing
  Cloudflare/Supabase baseline without blindly recreating `sourceplane-db` or
  the V1 database.
- PR: #8
- Reports: `ai/reports/task-0002-implementer.md`,
  `ai/reports/task-0002-verifier.md`
- Durable outcome: initial Terraform R2/Hyperdrive adoption scaffold landed and
  passed verification. This is now historical context; current infrastructure
  follows the AWS S3 backend and AWS Secrets Manager path.

## Task 0003

- Agent: Implementer
- Prompt: `ai/tasks/task-0003.md`
- Status: verified and merged
- PR: #25 (`task-0003-orun-golden-path`)
- Reports: `ai/reports/task-0003-implementer.md`,
  `ai/reports/task-0003-verifier.md`
- Durable outcome: Orun golden-path alignment landed. A follow-up was required
  because merged `main` selected legacy live Terraform apply jobs.

## Task 0003.1

- Agent: Implementer
- Prompt: `ai/tasks/task-0003.1.md`
- Status: verified and merged
- PR: #26 (`task-0003.1-delete-legacy-terraform`)
- Reports: `ai/reports/task-0003.1-implementer.md`,
  `ai/reports/task-0003.1-verifier.md`
- Durable outcome: legacy R2/core Terraform component source was deleted from
  active repo source without mutating live resources, restoring green `main`.

## Task 0004

- Agent: Implementer
- Prompt: `ai/tasks/task-0004.md`
- Status: verified and merged
- PR: `sourceplane/aws-admin#22`
  (`feat/github-repo-sourceplane-multi-tenant-saas`)
- Reports: `ai/reports/task-0004-implementer.md`,
  `ai/reports/task-0004-verifier.md`
- Durable outcome: `aws-admin` created repo-scoped IAM roles for
  `sourceplane/multi-tenant-saas` in `dev`, `stage`, and `prod`.

## Task 0005

- Agent: Implementer
- Prompt: `ai/tasks/task-0005.md`
- Status: verified and merged
- PR: #27 (`feat/task-0005-aws-s3-terraform-seam`)
- Reports: `ai/reports/task-0005-implementer.md`,
  `ai/reports/task-0005-verifier.md`
- Durable outcome: `infra/` discovery and `infra/terraform/bootstrap/` use the
  AWS S3 backend seam through `aws-admin` repo-scoped roles. Post-merge main CI
  run `26160643425` passed.

## Task 0006

- Agent: Implementer
- Prompt: `ai/tasks/task-0006.md`
- Status: merged and operationally verified after follow-up fixes
- PR: #30 (`chore: update supabase-infra`), merged at
  `fc795e4d974ae57d3e262084c393c04e18076f90`
- Report: `ai/reports/task-0006-implementer.md`
- Durable outcome: added `infra/terraform/supabase/` to create separate
  Supabase `stage` and `prod` projects under organization `sourceplane`
  (`dwazxcrywsdbxpuouifa`) and store generated credentials in AWS Secrets
  Manager. Initial post-merge apply failed and required Task 0006.1 plus a later
  secret-versioning fix.

## Task 0006.1

- Agent: Implementer
- Prompt: `ai/tasks/task-0006.1-supabase-merge-fix.md`
- Status: merged and operationally verified after PR #33
- PR: #31 (`fix: remove instance_size from supabase project for free-plan org`),
  merged at `a5a9cd2c4ae2bbba7cde32914c7f6b88623b4103`
- Report: `ai/reports/task-0006.1-implementer.md`
- Durable outcome: removed the free-plan-incompatible `instance_size` attribute
  from Supabase project creation and documented the `aws-admin` IAM delta.
- Related follow-up: `aws-admin` PR #26 added Supabase Secrets Manager lifecycle
  access for `sourceplane/multi-tenant-saas/*`; `multi-tenant-saas` PR #33
  preserved the named Secrets Manager secret and moved credential changes to
  `aws_secretsmanager_secret_version`.
- Operational verification: latest `multi-tenant-saas` main CI run
  `26209010693` passed with successful `supabase.stage.terraform` and
  `supabase.prod.terraform` jobs.

## Task 0007

- Agent: Implementer
- Prompt: `ai/tasks/task-0007.md`
- Status: verified and merged through Task 0007.1
- Objective: add a PR-sized database migration harness and migration ownership
  conventions for Supabase Postgres without applying live schema changes or
  implementing domain runtime behavior.
- PR: #34 (`feat: add database migration harness and verifier`), merged at
  `cc40ff0750880b0c34a3b487bec447937968952c`
- Reports: `ai/reports/task-0007-implementer.md`,
  `ai/reports/task-0007.1-verifier.md`
- Durable outcome: `packages/db` owns the canonical migration manifest and
  baseline `_migrations.applied` migration; `tests/db` verifies deterministic
  ordering, duplicate IDs, missing files, checksum drift, bounded-context
  ownership, descriptions, and the project-scoped `org_id + project_id`
  invariant. No live migration runner or apply path exists yet.

## Task 0007.1

- Agent: Implementer
- Prompt: `ai/tasks/task-0007.1.md`
- Status: verified and merged
- Objective: continue from the existing local Task 0007 work, finish checks,
  create/push a task branch, open a GitHub PR, and update the implementer
  report with the real PR number.
- Durable orchestrator update: `agents/orchestrator.md` now requires generated
  implementer tasks to enforce PR creation; `PR Number: TBD` is not an
  acceptable completed state.
- PR: #34 (`feat: add database migration harness and verifier`), merged at
  `cc40ff0750880b0c34a3b487bec447937968952c`
- Verifier prompt: `ai/tasks/task-0007.1-verifier.md`
- Verifier report: `ai/reports/task-0007.1-verifier.md`
- Verification: local package checks, Orun validate/changed-plan/dry-run, PR CI
  run `26220171323`, and post-merge main CI run `26221338775` passed.
- Follow-up: the verifier accepted the missing `dependsOn` edge from `db` to
  `db-tests` as a deferred Orun/spec limitation because the components do not
  subscribe to the same environments.

## Task 0008

- Agent: Implementer + Verifier
- Prompt: `ai/tasks/task-0008.md`
- Status: verified and merged
- Objective: add the first production-safe Supabase migration runner/apply path
  for the `packages/db` manifest, with PR CI verification and post-merge
  `stage`/`prod` apply behavior routed through Orun-controlled jobs.
- Scope boundary: no domain schema beyond the existing baseline migration, no
  Hyperdrive wiring, no Worker repository adapter, and no `dev` Supabase
  project.
- PR: #35 (`feat: add database migration runner and Orun apply path`), merged
  at `aee7d25`
- Implementer report: `ai/reports/task-0008-implementer.md`
- Verifier report: `ai/reports/task-0008-verifier.md`
- Durable outcome: `SupabaseApiAdapter` uses the Supabase Management API
  (HTTPS/IPv4) to apply migrations from CI — bypassing the IPv6-only direct
  connection and the Supavisor "tenant not found" issue. Plan mode is fully
  offline (no DB connection). Post-merge CI run `26229865114` applied
  `000_control_baseline` to both `stage` and `prod`. The `_migrations.applied`
  table is bootstrapped in both environments.

## Task 0009

- Agent: Implementer + Verifier
- Prompt: `ai/tasks/task-0009-verifier.md`
- Status: verified and merged (PASS)
- Objective: add Cloudflare Hyperdrive infrastructure for the `stage` and
  `prod` Supabase projects.
- PR: #36 (`Task 0009: Cloudflare Hyperdrive infrastructure component`), merged
  at `f9356dc`; PR #44 (`Revert main to f9356dc (clean rollback)`) merged at `3e6e5d0`
- Reports: `ai/reports/task-0009-implementer.md`,
  `ai/reports/task-0009-verifier.md`
- Durable outcome: `infra/terraform/cloudflare-hyperdrive/` validated and applied;
  main CI run `26293764021` applied stage Hyperdrive `08f7c6055f544a3890a585d88fd92348`
  and prod Hyperdrive `ab2c21c2db6245a59c91588fcac7107a`. Post-rollback CI run
  `26322419196` confirmed no drift. Orun v2.3.0 accepted as repo runtime; Task
  0009.1 is queued to align active specs/context.
- Rollback note: PR #44 restored repo to Task 0009 baseline, removing later
  Worker package/deployment changes (PRs #37-#39).
- Verifier result: PASS (all checks passed, minor spec drift and missing `dependsOn` documented).

## Task 0009.1

- Agent: Implementer
- Prompt: `ai/tasks/task-0009.1.md`
- Status: complete and merged
- Objective: align active specs and compact context with the Task 0009-verified
  Orun `v2.3.0` runtime baseline.
- Scope boundary: documentation/spec/context only; no runtime, CI, Terraform,
  component manifest, Worker, or live infrastructure changes.
- Related proposal: `ai/proposals/task-0009-spec-update.md`, accepted after
  Task 0009 verification.
- PR: #46 (`task-0009.1-spec-align`), merged into `main` at `0c585fc`
- Report: `ai/reports/task-0009.1-implementer.md`
- Durable outcome: active specs and compact context now reference Orun
  `v2.3.0` as the verified runtime baseline. Downstream Worker binding/runtime
  work is unblocked.

## Task 0010

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0010.md`
- Status: verified PASS
- PR: #47 (`codex/task-0010-api-edge-hyperdrive-binding`), squash-merged at `d996a84`
- Objective: wire the existing `apps/api-edge` Worker to the verified
  stage/prod Hyperdrive IDs at the Wrangler config and TypeScript env seam.
- Scope: Hyperdrive binding in wrangler.jsonc/env.ts, verify-bindings script,
  composition bugfixes (turbo filter names, working directories, Node.js 22),
  explicit `--env prod` deploy command.
- Deployed resources:
  - api-edge prod Worker (version `005882d7`, deployment `3f8f08ec`)
  - web-console Pages (deployment `0e0680e0`)
- Stage Worker was intentionally not deployed in Task 0010 verifier evidence.
- Verifier fixes: removed `combined.md`, added `--env prod` to deploy commands.
- Reports: `ai/reports/task-0010-implementer.md`, `ai/reports/task-0010-verifier.md`

## Task 0010.1 / PR #50 Maintenance

- Agent: external maintenance
- Status: merged
- PR: #50 (`chore: bump actions/setup-node from v4 to v6 across all compositions`),
  merged at `67bf5cf`
- Durable outcome: Cloudflare, Terraform/Pages, turbo-package, and db-migrate
  composition job templates now use `actions/setup-node@v6`; `api-edge` and
  `web-console` component Node versions are `22`. Main CI run `26330474474`
  passed after merge.

## Task 0011

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0011.md`
- Verifier prompt: `ai/tasks/task-0011-verifier.md`
- Status: verified PASS
- PR: #52 (`feat: Worker-safe Hyperdrive adapter and database health check`),
  squash-merged at `f02db20`
- Objective: add a Worker-safe Hyperdrive/Postgres runtime adapter and a
  read-only `api-edge` operational smoke path that proves deployed Worker
  connectivity through `SOURCEPLANE_DB`.
- Scope boundary: no domain schema, no database writes, no identity/org/project
  behavior, no new Worker app, and no Terraform/resource provisioning.
- Durable outcome: `@saas/db/hyperdrive` exists, `api-edge` `/health` reports
  database reachability, stage and prod Workers are deployed with correct
  Hyperdrive bindings, and live health checks returned `reachable: true`.
- Reports: `ai/reports/task-0011-implementer.md`,
  `ai/reports/task-0011-verifier.md`

## Task 0012

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0012.md`
- Verifier prompt: `ai/tasks/task-0012-verifier.md`
- Status: verified PASS
- PR: #53 (`feat: add identity persistence foundation`), squash-merged at
  `088a7bd`
- Objective: add the first identity persistence foundation: identity-owned
  schema migration plus Worker-safe typed repository adapters built on the
  Hyperdrive SQL seam.
- Durable outcome: `@saas/db/identity` repository adapter exists,
  `@saas/db/hyperdrive` has a parameterized SQL executor, migration
  `010_identity_core` is applied to both stage and prod. 85 tests pass.
- Main CI run: `26338527094` — all green.
- Reports: `ai/reports/task-0012-implementer.md`,
  `ai/reports/task-0012-verifier.md`

## Task 0013

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0013.md`
- Verifier prompt: `ai/tasks/task-0013-verifier.md`
- Status: verified PASS
- PR: #54 (`feat: add identity-worker auth runtime with passwordless login
  (#task-0013)`), squash-merged at `8477658`
- Objective: create the first deployable Identity Worker auth runtime slice in
  `apps/identity-worker`, with passwordless email-code routes for
  `/v1/auth/login/start`, `/v1/auth/login/complete`, `/v1/auth/session`,
  `/v1/auth/logout`, plus `/health`.
- Verifier fix: UUID/public-ID mismatch — Worker was generating prefixed hex
  IDs but DB requires UUIDs. Fixed by generating UUIDs via
  `crypto.randomUUID()` for persistence with bijective public prefix mapping
  at the API boundary. Tests updated and expanded (37 tests).
- Durable outcome: `apps/identity-worker` deployed to stage and prod with
  live end-to-end auth flow proven. Prod debug delivery disabled. Auth contract
  types in `@saas/contracts/auth`. Stage debug delivery enables verifier
  end-to-end flow without an email provider.
- Main CI run: `26345454739` — all green.
- Deployed Workers:
  - stage: `identity-worker-stage`, version `678702b2`, deployed `2026-05-23T22:41:37Z`
  - prod: `identity-worker-prod`, version `57b47417`, deployed `2026-05-23T22:42:20Z`
- Reports: `ai/reports/task-0013-implementer.md`,
  `ai/reports/task-0013-verifier.md`

## Task 0014

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0014.md`
- Verifier prompt: `ai/tasks/task-0014-verifier.md`
- Status: verified PASS
- PR: #55 (`feat: add api-edge auth facade with identity-worker service binding`),
  squash-merged at `4268b75`
- Objective: add the first public `api-edge` service-binding facade for
  authentication, routing `/v1/auth/*` to `identity-worker` via Cloudflare
  service bindings (stage→identity-worker-stage, prod→identity-worker-prod).
- Durable outcome: `api-edge` is now a functioning auth gateway. Facade
  preserves method, path, query, body, and headers without reading credentials.
  `/health` reports identity binding status. 30 tests in `@saas/api-edge-tests`.
  Live stage auth flow proven end-to-end through api-edge. Prod returns
  `delivery.mode=email` with no raw code through the facade.
- Main CI run: `26352590956` — all green (5/5 jobs).
- No verifier fixes required.
- Reports: `ai/reports/task-0014-implementer.md`,
  `ai/reports/task-0014-verifier.md`

## Task 0015

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0015.md`
- Verifier prompt: `ai/tasks/task-0015-verifier.md`
- Status: verified PASS
- PR: #56 (`feat: add membership persistence foundation — schema, repository, and
  Orun path fix`), squash-merged at `2e56bad`
- Objective: add the membership persistence foundation: membership-owned database
  migration plus Worker-safe typed repository adapters for organizations, members,
  invitations, and role assignments.
- Verifier fixes:
  - `bootstrapOrganization` replaced three sequential INSERTs with a single CTE
    statement (dependent INSERT chain + CROSS JOIN) for all-or-nothing atomicity.
  - `acceptInvitation` restructured to pre-validate invitation state, then use a
    single CTE with `expires_at > $2` guard for atomic accept+member creation.
    Prevents expired invitations from being marked accepted.
- Durable outcome: `@saas/db/membership` repository adapter exists with atomic
  bootstrap and safe invitation acceptance. Migration `020_membership_core` applied
  to both stage and prod. `@saas/contracts` has `OrganizationRole`, `ProjectRole`,
  `TenancyRole`, `RoleScopeKind`, `RoleAssignmentFact` types. 167 tests pass.
  Task 0029 planning later found the `db-migrate` `paths` assertion no longer
  holds for Task 0028-style changed plans; trust the Task 0029 follow-up for
  current migration change-detection reality.
- Main CI run: `26353527266` — all green (10/10 jobs).
- Reports: `ai/reports/task-0015-implementer.md`,
  `ai/reports/task-0015-verifier.md`

## Task 0016

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0016.md`
- Verifier prompt: `ai/tasks/task-0016-verifier.md`
- Status: verified PASS
- PR: #57 (`feat: add membership-worker org runtime and api-edge facade (#57)`),
  squash-merged at `724e218`
- Objective: add the first deployable membership Worker organization runtime
  and public `api-edge` organization facade for:
  - `POST /v1/organizations`
  - `GET /v1/organizations`
  - `GET /v1/organizations/{orgId}`
- Verifier fixes:
  - Added `workers_dev: false` to stage/prod in membership-worker wrangler.jsonc
    to prevent public access and actor header spoofing.
  - Fixed trailing-hyphen edge case in generated slugs after truncation.
  - Removed unused type imports from organization service.
- Durable outcome: `apps/membership-worker` deployed to stage and prod with
  `workers_dev: false`. `api-edge` stage/prod redeployed with `MEMBERSHIP_WORKER`
  service bindings. Live auth flow → org creation → list → get verified end-to-end
  on stage. Direct public access to membership-worker returns 404 (workers.dev
  route disabled). 68 tests pass (15 membership-worker + 53 api-edge). Contracts
  extended with `@saas/contracts/membership` organization types.
- Main CI run: `26354915929` — all green (12/12 jobs, after one-time first-deploy
  retry for api-edge-prod).
- Deployed Workers:
  - stage: `membership-worker-stage` (workers_dev disabled, SOURCEPLANE_DB Hyperdrive)
  - prod: `membership-worker-prod` (workers_dev disabled, SOURCEPLANE_DB Hyperdrive)
  - stage: `api-edge-stage` (IDENTITY_WORKER + MEMBERSHIP_WORKER bindings)
  - prod: `api-edge-prod` (IDENTITY_WORKER + MEMBERSHIP_WORKER bindings)
- Reports: `ai/reports/task-0016-implementer.md`,
  `ai/reports/task-0016-verifier.md`

## Task 0017

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0017.md`
- Verifier prompt: `ai/tasks/task-0017-verifier.md`
- Status: verified PASS
- PR: #58 (`feat: add policy authorization seam`), squash-merged at `674dded`
- Objective: add the first policy authorization seam before more membership
  mutations: shared policy contracts, a pure policy engine, a deployable internal
  policy Worker, and Orun/CI coverage.
- Verifier fixes:
  - Required explicit `resource.projectId` for project/environment-scoped
    actions so org roles cannot authorize project resources without a concrete
    project scope.
  - Broadened `PolicyContext.memberships` to tolerate future membership facts
    while safely ignoring unknown/malformed facts.
  - Hardened policy-worker request validation for subject, resource, context,
    and role-assignment scope fields.
- Durable outcome: `@saas/policy-engine` implements V1 role/permission
  evaluation for organization, project, and environment actions.
  `apps/policy-worker` exposes `/health`, `/v1/policy/authorize`,
  `/v1/policy/effective-permissions`, and
  `/v1/policy/validate-role-assignment`. Stage/prod policy Workers are deployed
  with `workers_dev: false` and no public deploy target; direct workers.dev
  access returns 404 with Cloudflare error code 1042.
- Main CI run: `26359832583` — all green (11/11 jobs).
- Deployed Workers:
  - stage: `policy-worker-stage`, version `124ed276-4352-45c5-a3d6-372e5f3f0a84`
  - prod: `policy-worker-prod`, version `cda9f484-bdb3-4d72-a67b-e77260e1ee39`
- Reports: `ai/reports/task-0017-implementer.md`,
  `ai/reports/task-0017-verifier.md`

## Task 0018

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0018.md`
- Verifier prompt: `ai/tasks/task-0018-verifier.md`
- Status: verified PASS
- PR: #59 (`feat: wire membership-worker to policy-worker for org-read
  authorization`), squash-merged at `43f68c4`
- Objective: wire membership-worker to policy-worker through a private service
  binding and policy-gate the existing `GET /v1/organizations/{orgId}` path
  without expanding the public membership API.
- Verifier fix:
  - Policy-client was parsing `allow` at the top level of the JSON response,
    but policy-worker wraps the result under `{ data: AuthorizationResponse,
    meta: {...} }`. Fixed to unwrap `data.allow` from the envelope. Updated
    test fakes to return the real envelope shape and added focused tests for
    repository role-list failure and missing data field.
- Durable outcome: `apps/membership-worker` has `POLICY_WORKER` service
  binding to same-environment policy Workers. `GET /v1/organizations/{orgId}`
  authorizes through policy-worker using action `organization.read`. Policy
  denial returns `not_found` (no enumeration). Missing binding, fetch errors,
  non-OK responses, and malformed envelopes all fail closed. 33 membership-
  worker tests pass. `component.yaml` has `dependsOn` edge to policy-worker
  accepted by Orun validation.
- Main CI run: `26361054065` — all green (8/8 jobs).
- PR CI run (final head): `26360963260` — all green (8/8 jobs).
- Reports: `ai/reports/task-0018-implementer.md`,
  `ai/reports/task-0018-verifier.md`

## Task 0019

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0019.md`
- Verifier prompt: `ai/tasks/task-0019-verifier.md`
- Status: verified PASS
- PR: #60 (`feat: add policy-gated member-list endpoint`), squash-merged at
  `71c9549`
- Objective: add the first policy-gated member administration read endpoint:
  `GET /v1/organizations/{orgId}/members` through `membership-worker` and the
  public `api-edge` facade.
- Verifier fix:
  - Added an optional dependency-injection seam to `handleListMembers` and 10
    focused handler integration tests because the implementer tests covered
    helpers/snippets but not actual handler behavior.
- Durable outcome: `GET /v1/organizations/{orgId}/members` authorizes through
  policy-worker action `organization.member.list`, returns `mem_` public member
  IDs with safe role summaries, does not expose raw member UUIDs,
  role-assignment IDs, project `scopeRef` values, or identity profile fields,
  and is forwarded by api-edge after auth resolution without forwarding bearer
  tokens. 53 membership-worker tests and 60 api-edge tests pass.
- Main CI run: `26362528343` — all green (15/15 jobs).
- PR CI run (final head): `26362460057` — all green (15/15 jobs).
- Reports: `ai/reports/task-0019-implementer.md`,
  `ai/reports/task-0019-verifier.md`

## Task 0020

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0020.md`
- Verifier prompt: `ai/tasks/task-0020-verifier.md`
- Status: verified PASS
- PR: #61 (`feat: add cursor pagination for membership list endpoints`),
  squash-merged at `dc9b191`
- Objective: add cursor-based pagination for existing membership list routes
  (`GET /v1/organizations` and `GET /v1/organizations/{orgId}/members`) to
  prepare the API pattern before adding more list surfaces.
- Verifier fix:
  - Hardened `decodeCursor` to validate ISO timestamp format and UUID format
    before passing values to SQL (rejects invalid payloads as 422
    `validation_failed` instead of letting them cause a 500 database error).
  - Added 2 focused tests for invalid-timestamp and invalid-UUID cursor payloads.
  - Committed `ai/reports/task-0020-implementer.md` to the PR branch.
- Durable outcome: Both list endpoints accept `limit` (default 50, max 100) and
  `cursor` (opaque, versioned v:1, base64-encoded). Cursor uses
  `(created_at DESC, id DESC)` ordering with `limit+1` detection. Invalid params
  return `validation_failed`. Response `meta.cursor` carries next cursor or null.
  Existing unpaginated repository methods preserved. Member-list still authorizes
  through policy-worker before page query. Api-edge forwards pagination query
  params and still redacts bearer tokens. 65 membership-worker tests, 177 db
  tests, 64 api-edge tests pass.
- Main CI run: `26366468768` — all green (13/13 jobs).
- PR CI run (final head): `26366391926` — all green (13/13 jobs).
- Reports: `ai/reports/task-0020-implementer.md`,
  `ai/reports/task-0020-verifier.md`

## Task 0021

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0021.md`
- Verifier prompt: `ai/tasks/task-0021-verifier.md`
- Status: verified PASS
- PR: #62 (`feat: add policy-gated invitation administration API endpoints`),
  squash-merged at `324ca36`
- Objective: add the first policy-gated invitation administration endpoints:
  `POST /v1/organizations/{orgId}/invitations` (create),
  `GET /v1/organizations/{orgId}/invitations` (list with cursor pagination),
  `DELETE /v1/organizations/{orgId}/invitations/{invitationId}` (revoke).
- Verifier fix:
  - Committed `ai/reports/task-0021-implementer.md` to the PR branch (it existed
    locally untracked but was absent from the PR changed-file list).
- Durable outcome: Three policy-gated invitation routes accessible through
  `api-edge`. Invitation tokens use 32-byte Web Crypto randomness with SHA-256
  hash stored; raw tokens only exposed via `DEBUG_DELIVERY=true` (local/dev/stage).
  Prod `DEBUG_DELIVERY=false`. Public IDs use `inv_` prefix. Pagination reuses
  Task 0020 cursor contract. V1 role allowlist restricted to organization roles
  (`owner`, `admin`, `builder`, `viewer`, `billing_admin`). Status derivation
  computes `expired` from `expiresAt < now` without DB mutation. Authorization
  fail-closed; policy denial returns 404. 104 membership-worker tests, 183 db
  tests, 78 api-edge tests pass.
- Main CI run: `26369638914` — all green (19/19 jobs).
- PR CI run (final head with implementer report): `26369562767` — all green
  (19/19 jobs).
- Reports: `ai/reports/task-0021-implementer.md`,
  `ai/reports/task-0021-verifier.md`

## Task 0022

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0022.md`
- Verifier prompt: `ai/tasks/task-0022-verifier.md`
- Status: verified PASS
- PR: #63 (`feat: add invitation acceptance endpoint with atomic role assignment
  (#63)`), squash-merged at `28dd671`
- Objective: add `POST /v1/organizations/{orgId}/invitations/accept` through
  api-edge to membership-worker.
- Verifier fix:
  - Removed `ON CONFLICT (id) DO NOTHING` from the acceptance CTE member and
    role-assignment INSERTs so generated-ID uniqueness conflicts abort the whole
    statement instead of allowing partial acceptance.
- Durable outcome: invitation acceptance is available through the public
  api-edge gateway. A signed-in user whose email matches a pending invitation
  can accept it; acceptance validates token hash, organization, email, status,
  and expiry, then atomically marks the invitation accepted, creates the member,
  and creates the organization-scoped role assignment. Acceptance is authorized
  by token possession plus authenticated email match, not policy-worker.
  api-edge forwards `x-actor-email` from identity sessions while still redacting
  bearer tokens from membership-worker. 119 membership-worker tests, 188 db
  tests, and 85 api-edge tests pass.
- Main CI run: `26371024844` — all green (19/19 jobs).
- Follow-up docs/state CI run: `26371131814` — green.
- Reports: `ai/reports/task-0022-implementer.md`,
  `ai/reports/task-0022-verifier.md`

## Task 0023

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0023.md`
- Verifier prompt: `ai/tasks/task-0023-verifier.md`
- Status: verified PASS
- PR: #64 (`feat(events): add events/audit persistence foundation`),
  squash-merged at `de89408`
- Objective: add events/audit persistence foundation — shared contract types,
  database migration, Worker-safe repository adapter, and focused tests — before
  destructive member-admin mutations.
- Verifier fix:
  - Replaced invalid `UNION ALL` in `appendEventWithAudit` (event_log has 22
    columns, audit_entries has 21 — column count mismatch is a PostgreSQL error)
    with `row_to_json` approach returning both CTE results as JSON columns in a
    single row. Updated test fixtures to match new shape.
- Durable outcome: `@saas/contracts` exports event envelope, audit entry, and
  query filter types matching the spec schema. Migration `030_events_audit_core`
  creates `events.event_log` and `events.audit_entries` with org scope, project/
  environment columns, useful indexes, and JSONB payload/redaction storage.
  `@saas/db/events` provides `createEventsRepository(executor)` with atomic
  event+audit append, conflict detection, and cursor-paginated audit queries
  scoped by organization or target. 222 db tests, 18 contract tests pass.
- Main CI run: `26379294370` — all green (9/9 jobs).
- PR CI run (final head with verifier fix): `26379248053` — all green (9/9 jobs).
- Reports: `ai/reports/task-0023-implementer.md`,
  `ai/reports/task-0023-verifier.md`

## Task 0024

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0024.md`
- Verifier prompt: `ai/tasks/task-0024-verifier.md`
- Status: verified PASS
- PR: #65 (`feat: add transaction seam and wire invite.revoked event/audit
  atomically`), squash-merged at `be47532`
- Objective: add the first production-safe runtime use of the events/audit
  foundation by wiring invitation revocation to append an `invite.revoked`
  event and audit entry atomically with the existing membership mutation,
  establishing the reusable transaction pattern.
- No verifier fixes required.
- Durable outcome: `TransactionalSqlExecutor` interface extends `SqlExecutor`
  with `transaction(...)` using postgres `begin()`. Production
  `DELETE /v1/organizations/{orgId}/invitations/{invitationId}` creates both
  membership and events repositories from the same transaction executor;
  event append failure rolls back the invitation revoke. Event type
  `invite.revoked`, version 1, source `membership-worker`, actor from context,
  org/invitation use public IDs (`org_...`/`inv_...`), audit category
  `membership`. 228 db tests, 124 membership-worker tests, 85 api-edge tests
  pass.
- Main CI run: `26380045214` — all green (12/12 jobs).
- PR CI run: `26379797141` — all green (12/12 jobs).
- Reports: `ai/reports/task-0024-implementer.md`,
  `ai/reports/task-0024-verifier.md`

## Task 0025

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0025.md`
- Verifier prompt: `ai/tasks/task-0025-verifier.md`
- Status: verified PASS
- PR: #66 (`fix(db-tests): add missing tsconfig path mappings for
  membership/events`), squash-merged at `295bdd8`
- Objective: repair local `@saas/db-tests` Jest/ts-jest module resolution after
  `tests/db/src/membership.test.ts` failed with TypeScript `TS2307` for
  `@saas/db/membership`.
- Durable outcome: `tests/db/tsconfig.json` now maps `@saas/db/membership` and
  `@saas/db/events`, aligning TypeScript path aliases with Jest
  `moduleNameMapper` and adjacent test-package patterns. No runtime code,
  migrations, or infrastructure changed.
- Main CI run: `26382162480` — green.
- PR CI run: `26381539683` — green (`plan` and `db-tests · dev · Verify`).
- Reports: `ai/reports/task-0025-implementer.md`,
  `ai/reports/task-0025-verifier.md`

## Task 0026

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0026.md`
- Verifier prompt: `ai/tasks/task-0026-verifier.md`
- Status: verified PASS
- PR: #67 (`feat: wire invite.created and invite.accepted events atomically`),
  squash-merged at `c02a47d`
- Objective: complete invitation lifecycle event/audit coverage by wiring
  `invite.created` and `invite.accepted` atomically with invitation create and
  accept mutations.
- Durable outcome: production create/accept handlers use
  `executor.transaction(...)` with membership and events repositories sharing
  the transaction-bound executor. Event append failure rolls back invitation
  creation or acceptance. Payloads use public `org_`, `inv_`, and `mem_`
  identifiers and omit raw tokens, token hashes, bearer tokens, invitee email,
  provider details, SQL, and stack traces. All three invitation lifecycle events
  are now wired: `invite.created`, `invite.accepted`, and `invite.revoked`.
- Main CI run: `26383797222` — green.
- PR CI run: `26382990385` — green (8/8 checks).
- Reports: `ai/reports/task-0026-implementer.md`,
  `ai/reports/task-0026-verifier.md`

## Task 0027

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0027.md`
- Verifier prompt: `ai/tasks/task-0027-verifier.md`
- Status: verified PASS
- PR: #68 (`feat: add policy-gated member administration mutations`),
  squash-merged at `60240ce`
- Objective: add policy-gated organization member role update and member removal
  routes through api-edge and membership-worker, with last-owner protection,
  stale role-fact cleanup, and atomic `membership.updated` /
  `membership.removed` event/audit writes.
- Verifier fixes:
  - In `update-member-role`, checked each transactional
    `revokeRoleAssignment(...)` result and throw on failure so stale active org
    roles cannot survive alongside a new role/event.
  - In `remove-member`, checked `revokeAllRoleAssignments(...)` in the
    transactional path and throw on failure so member removal cannot commit
    without role cleanup.
- Durable outcome: `PATCH /v1/organizations/{orgId}/members/{memberId}` and
  `DELETE /v1/organizations/{orgId}/members/{memberId}` are available through
  api-edge. Both resolve identity at the public edge, avoid forwarding bearer
  tokens, authorize through private policy-worker actions
  `organization.member.update_role` and `organization.member.remove`, enforce
  last-active-owner protection, and write audit-safe public-ID events atomically
  with membership mutations. 236 db tests, 166 membership-worker tests, 94
  api-edge tests, 80 policy-engine tests, and 18 contracts tests passed during
  verification.
- Main CI run: `26385774244` — green.
- PR CI run after verifier fixes: `26385631693` — green (19/19 checks).
- Reports: `ai/reports/task-0027-implementer.md`,
  `ai/reports/task-0027-verifier.md`

## Task 0028

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0028.md`
- Verifier prompt: `ai/tasks/task-0028-verifier.md`
- Status: verified PASS, merged; migration apply follow-up required
- PR: #69 (`feat: add projects/environments persistence foundation`),
  squash-merged at `240e412`
- Objective: add the projects/environments persistence foundation: public
  contract types, `040_projects_core` migration, and Worker-safe
  `@saas/db/projects` repository methods.
- Verifier fix:
  - Added composite FK `FOREIGN KEY (org_id, project_id) REFERENCES
    projects.projects (org_id, id)` plus a supporting unique index on
    `(org_id, id)` so an environment row cannot reference a project from a
    different organization.
- Durable outcome: `@saas/contracts/projects` exports 12 project/environment
  API types; `packages/db/src/migrations/040_projects_core/up.sql` creates
  `projects.projects` and `projects.environments`; `@saas/db/projects` exposes
  10 repository methods, all scoped by `orgId` and, for environments,
  `orgId + projectId`. 273 db tests and 30 contract tests passed during
  verification.
- PR CI run after verifier fix: `26387568489` — green (9/9 checks).
- Main CI run: `26387697533` — green, but rendered changed plan did not include
  `db-migrate`; `040_projects_core` is not yet proven applied to stage/prod.
- Reports: `ai/reports/task-0028-implementer.md`,
  `ai/reports/task-0028-verifier.md`

## Task 0029

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0029.md`
- Verifier prompt: `ai/tasks/task-0029-verifier.md`
- Status: verified PASS
- PR: #70 (`fix(db-migrate): use spec.path for Orun changed-plan detection`),
  squash-merged at `974b7b2`
- Objective: repair Orun changed-plan ownership for
  `packages/db/src/migrations/**` so `db-migrate` runs on migration-file
  changes, then prove `040_projects_core` applies to `stage` and `prod`
  through the existing merge path.
- Durable outcome: `infra/db-migrate/component.yaml` now uses
  `spec.path: packages/db/src/migrations`, and the db-migrate Stack Tectonic
  job template resolves the runner CLI from the working directory created by
  that path ownership. Migration-file changes now select both `db` and
  `db-migrate`; PR plans use `Migration Plan`, and `github-push-main` uses
  `Migration Apply`.
- PR CI run: `26389113641` — green (6/6 checks), including
  `db-migrate.stage.migrate` and `db-migrate.prod.migrate`.
- Main CI run: `26389807233` — green (6/6 checks). Both `db-migrate` jobs ran
  `Migration Apply` and logged `040_projects_core` in the applied set for
  `stage` and `prod`.
- Reports: `ai/reports/task-0029-implementer.md`,
  `ai/reports/task-0029-verifier.md`

## Task 0030

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0030.md`
- Verifier prompt: `ai/tasks/task-0030-verifier.md`
- Status: verified PASS
- PR: #71 (`feat: add membership-owned internal authorization-context seam`),
  squash-merged at `1928559`
- Objective: add a membership-owned internal authorization-context query seam so
  future non-membership workers can obtain policy-ready membership facts without
  querying `membership.*` storage directly.
- Verifier fix:
  - Fixed `mapRoleAssignmentsToFacts` so a project-scoped role assignment with
    missing `scopeRef` remains project-scoped without `projectId` instead of
    widening into an organization-scoped fact.
- Durable outcome: added `AuthorizationContextRequest` /
  `AuthorizationContextResponse` policy contract types, private internal
  `POST /v1/internal/membership/authorization-context` membership-worker route,
  shared role-assignment-to-policy-fact mapping helper, focused contract tests,
  and focused membership-worker tests. The seam is not exposed through api-edge.
- PR CI run after verifier fix: `26392691908` — green (12/12 checks).
- Main CI run: `26392905135` — green (12/12 checks).
- Reports: `ai/reports/task-0030-implementer.md`,
  `ai/reports/task-0030-verifier.md`

## Task 0031

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0031.md`
- Verifier prompt: `ai/tasks/task-0031-verifier.md`
- Status: verified PASS
- PR: #72 (`feat: add projects-worker with create and get project routes`),
  squash-merged at `3fc15bf`
- Objective: scaffold `apps/projects-worker` and expose the first public
  projects runtime slice through api-edge:
  `POST /v1/organizations/{orgId}/projects` and
  `GET /v1/organizations/{orgId}/projects/{projectId}`.
- Scope boundary: no project list, no environment routes, no policy action
  changes, no migrations, and no `specs-v2/**` work.
- Verifier fix:
  - Committed missing `tests/api-edge/src/project-facade.test.ts` and
    `ai/reports/task-0031-implementer.md` to the PR branch as `1944979`.
- Durable outcome: private `apps/projects-worker` is live on main with create
  and explicit read routes. api-edge forwards those routes through
  `PROJECTS_WORKER` after identity resolution without forwarding bearer tokens.
  projects-worker uses membership-worker authorization-context before
  policy-worker and writes `project.created` event/audit atomically with project
  creation. Stage/prod projects-worker deployments are private
  (`workers_dev: false`), and api-edge stage/prod bind to same-environment
  projects-worker.
- PR CI run after verifier fix: `26409759476` — green (14/14 checks), including
  `api-edge-tests` and `projects-worker-tests`.
- Main CI run: `26409923288` — green (14/14 jobs).
- Reports: `ai/reports/task-0031-implementer.md`,
  `ai/reports/task-0031-verifier.md`

## Task 0032

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0032.md`
- Verifier prompt: `ai/tasks/task-0032-verifier.md`
- Status: verified PASS
- PR: #73 (`feat: add projects-worker list endpoint with project.list policy
  action`), squash-merged at `06c7dbb`
- Objective: add public project list:
  `GET /v1/organizations/{orgId}/projects`.
- Scope boundary: add bounded org-scoped `project.list` policy action,
  projects-worker list handler, api-edge forwarding, and focused tests only. No
  project update/archive/delete, no environment routes, no migrations, no
  infrastructure, and no `specs-v2/**` work.
- Verifier fix:
  - Committed missing `ai/reports/task-0032-implementer.md` to the PR branch as
    `4eff29a`.
- Durable outcome: project list is available through api-edge and
  projects-worker. It uses org-scoped `project.list`, cursor pagination, the
  membership authorization-context seam before policy-worker, and tenant-scoped
  `listProjectsPaged(orgId, pageParams)`. Organization roles owner/admin/builder
  and viewer may list active projects; billing_admin and project-scoped roles
  alone cannot list organization-wide projects.
- PR CI run after verifier fix: `26411612299` — green (22/22 checks).
- Main CI run: `26411761006` — green (23/23 jobs).
- Reports: `ai/reports/task-0032-implementer.md`,
  `ai/reports/task-0032-verifier.md`

## Task 0033

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0033.md`
- Verifier prompt: `ai/tasks/task-0033-verifier.md`
- Status: verified PASS
- PR: #74 (`feat: add project archive endpoint with project.delete policy
  action`), squash-merged at `9666308`
- Objective: add public project archival:
  `DELETE /v1/organizations/{orgId}/projects/{projectId}`.
- Scope boundary: soft-archive via `archiveProject`, authorize with existing
  `project.delete`, write `project.archived` event/audit atomically, and add
  focused projects-worker/api-edge tests only. No project update, restore, hard
  delete, environment routes, migrations, infrastructure, policy action changes,
  or `specs-v2/**` work.
- Verifier fix:
  - Committed missing `ai/reports/task-0033-implementer.md` to the PR branch as
    `fe4b427`.
- Durable outcome: project archive is available through api-edge and
  projects-worker. It uses existing project-scoped `project.delete`, obtains
  role facts through membership-worker authorization-context, soft-archives with
  `archiveProject`, and writes `project.archived` event/audit atomically with
  the archive mutation.
- PR CI run after verifier fix: `26413053582` — green (15/15 checks).
- Main CI run: `26413213117` — green (15/15 jobs).
- Reports: `ai/reports/task-0033-implementer.md`,
  `ai/reports/task-0033-verifier.md`

## Task 0034

- Agent: Implementer -> Verifier
- Prompt: `ai/tasks/task-0034.md`
- Verifier prompt: `ai/tasks/task-0034-verifier.md`
- Status: verified PASS
- PR: #75 (`feat: add environment create/list/get routes with project-scoped
  policy`), squash-merged at `7e4dc5e`
- Objective: add the first public environment runtime slice through
  projects-worker and api-edge:
  - `POST /v1/organizations/{orgId}/projects/{projectId}/environments`
  - `GET /v1/organizations/{orgId}/projects/{projectId}/environments`
  - `GET /v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}`
- Scope boundary: add `env_` public IDs, project-scoped `environment.create`,
  environment create/list/get handlers, api-edge forwarding, atomic
  `environment.created` event/audit wiring, and focused tests only. No
  environment update/archive, project update/restore, role assignment
  management, migrations, infrastructure, public audit API, or `specs-v2/**`
  work.
- Verifier fix:
  - Committed missing `ai/reports/task-0034-implementer.md` to the PR branch as
    `83831f3`.
- Durable outcome: environment create/list/get are available through api-edge
  and projects-worker. Create uses project-scoped `environment.create`; list/get
  use project-scoped `environment.read`; all routes include explicit
  `orgId + projectId`; get includes `environmentId`; parent projects must exist
  and be active; and environment creation writes `environment.created`
  event/audit atomically.
- PR CI run after verifier fix: `26432668853` — green (22/22 checks).
- Main CI runs: `26432854069` and `26432938193` — green.
- Reports: `ai/reports/task-0034-implementer.md`,
  `ai/reports/task-0034-verifier.md`

## Task 0035

- Agent: Implementer, Verifier
- Prompt: `ai/tasks/task-0035.md`
- Status: COMPLETE (verifier verified)
- Implementation: PR #76
- PR CI runs: green (all 497 tests pass)
- Verifier fix: Committed `ai/reports/task-0035-verifier.md` (4672 bytes)
- Durable outcome: Environment archival is available through DELETE
  `/v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}`.
  Uses project-scoped `environment.delete` policy action; soft archive via
  `archiveEnvironment`; parent project must exist and be active; writes
  `environment.archived` event/audit atomically; api-edge forwards DELETE
  without bearer token or body.
- Reports: `ai/reports/task-0035-implementer.md`,
  `ai/reports/task-0035-verifier.md`

## Task 0036

|- Agent: Implementer, Verifier
|- Prompt: `ai/tasks/task-0036.md`
|- Verifier prompt: `ai/tasks/task-0036-verifier.md`
|- Status: verified PASS
|- Implementation: PR #77 (`task-0036/organization-audit-list`),
  squash-merged at `969eb8b`
|- PR CI run: 26439198439 — green (29/29 jobs)
|- Reports: `ai/reports/task-0036-implementer.md`,
  `ai/reports/task-0036-verifier.md`
|- Objective: add the first public audit-read surface through a new private
  events-worker runtime and api-edge forwarding:
  - `GET /v1/organizations/{orgId}/audit` with audit.read policy
    (owner/admin only), category-aware queryAuditByOrg filtering,
    cursor pagination, public ID mapping, and payload redaction
|- Scope boundary: New private `apps/events-worker` Worker runtime (health +
  audit-list route), api-edge forwarding without bearer token, audit.read policy
  action (org-scoped, owner/admin only), public audit response contract types,
  queryAuditByOrg category filtering, focused tests for events-worker, api-edge,
  policy-engine. No per-actor audit, no security-event query APIs, no event
  fanout, no integration/smoke test against live stage.
|- Orun validation: validate PASS, component discovery PASS (events-worker and
  api-edge with correct dependencies), plan 51 jobs across 24 components,
  dry-run PASS (no infra apply jobs, all Verify/Verify-deploy).
|- events-worker: private (workers_dev: false), SOURCEPLANE_DB Hyperdrive
  bindings, MEMBERSHIP_WORKER/POLICY_WORKER service bindings.
|- api-edge: EVENTS_WORKER service bindings (stage→events-worker-stage,
  prod→events-worker-prod).

## Historical Notes

- PR #1 split product-specific V2 Git catalog work away from the reusable SaaS
  starter spec pack.
- PR #2 and PR #3 refined the orchestrator loop, human input pause protocol,
  and operational assumptions.
- PR #33 was not generated by a formal task prompt, but its shipped behavior is
  part of the current Supabase infrastructure baseline.
- PRs #37, #38, and #39 attempted Worker binding/runtime/deployment work after
  Task 0009 but were reverted by PR #44. Do not treat those reverted changes as
  current repo reality.
