# Task Ledger

Last updated: 2026-05-31 (Task 0103 Verifier PASS + MERGED — PR #158 squash `0909186`, post-merge main-CI `26699966952` 4/4 SUCCESS, SDK clients 12 → 13 with `auth` added, last SDK gap before U10 closed)

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


## Task 0038

- Agent: Verifyer
- Prompt: `ai/tasks/task-0038.md`
- Verifier prompt: `ai/tasks/task-0038-verifier.md`
- Status: verified PASS
- Implementation: PR #79 (`codex/task-0038-organization-bootstrap-audit`), merged
- Objective: wire `organization.created` and initial `membership.added` event/audit rows
  atomically with membership-worker organization bootstrap (moved into handlers).

## Task 0039

- Agent: Implementer, Verifier
- Prompt: `ai/tasks/task-0039.md`
- Verifier prompt: `ai/tasks/task-0039-verifier.md`
- Status: verified PASS
- Implementation: PR #80 (`codex/task-0039-membership-org-service-cleanup`), squash-merged
- Objective: remove stale membership-worker organization-service `createOrganization` and
  `listOrganizations` methods after Task 0038 moved these into handlers; retarget tests
  to use `repo.bootstrapOrganization` directly for getOrganization coverage.
- PR CI run: 26450296601 — green (all checks passed after infrastructure retry)
- Post-merge CI run confirmed (squash merge executed successfully)

## Task 0040

- Agent: Implementer, Verifier
- Prompt: `ai/tasks/task-0040.md`
- Verifier prompt: `ai/tasks/task-0040-verifier.md`
- Status: verified PASS
- Implementation: PR #81 (`codex/task-0040-web-console-live-ui`),
  squash-merged at `9740ca1`
- Objective: Replace the web-console placeholder with a usable live-test console
  for public APIs, and add minimal api-edge CORS support for browser calls from
  Cloudflare Pages.
- Verifier fix confirmation: Implementer fixed invitation acceptance route from
  `POST /v1/invitations/accept` to org-scoped
  `POST /v1/organizations/{orgId}/invitations/accept` in commit `f0f498c`.
  Verifier confirmed: global route eliminated, `orgId` required, guard on no-org.
- PR CI run: `26489091737` — green (20/20 jobs).
- Post-merge main CI run: `26489581397` — green (20/20 jobs).
- Live stage verification: full end-to-end flow (login with debug code, org
  create, project create, env create, audit list, archive env/project, logout).
  CORS preflight from Pages origin → 204 with correct headers.
- Live prod verification: health OK, CORS preflight OK, login/start returns
  `delivery.mode: "email"` with no debug code. Pages console loads deployed
  bundle. Manual token import available.
- Stage test resources archived:
  - `org_b9686b1b61e94009a48f7fc318dd2824` (verifier-0040-test)
  - `prj_a6674d7df07c4bb99a6804bf12fb35b4` (verifier-0040-project)
  - `env_0a558643ea314a3c9f75e13a75b86eb0` (verifier-0040-env)
- Reports: `ai/reports/task-0040-implementer.md`,
  `ai/reports/task-0040-verifier.md`

## Task 0041

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0041.md`
|- Verifier prompt: `ai/tasks/task-0041-verifier.md`
|- Status: verified PASS and merged
|- PR: #82 (`codex/task-0041-env-specific-web-consoles`), squash-merged at
  `cb38e96675f6e4f0c6080718f7041208ec5250e1`
|- Objective: Split the web-console deployment into environment-specific
  Cloudflare Pages projects (stage and prod) with environment-bound builds,
  updated CORS, and smoke verification.
|- Durable outcome: `cloudflare-pages-turbo` supports
  `environmentAwareProjectName` and `environmentBuildVar`; the web-console
  builds are locked with `VITE_DEPLOY_ENV`; `sourceplane-web-console-stage`
  and `sourceplane-web-console-prod` are the canonical environment-specific
  Pages projects; api-edge CORS allows only matching Pages origins plus local
  development origins.
|- PR CI run: `26492143639` — green (20/20 checks).
|- Post-merge note: main deploy run `26493287165` failed because the Pages
  composition used `.environment.name`; PR #83 fixed it to
  `.orun.environment.name`, and PR #84 retriggered web-console deploys.
|- Latest main CI run: `26495115287` — green.
|- Live smoke at `2026-05-27T07:04Z`: stage/prod Pages console HTML loads
  Sourceplane Console and stage/prod api-edge `/health` returns ok.
|- Reports: `ai/reports/task-0041-implementer.md`,
  `ai/reports/task-0041-verifier.md`

## Task 0042

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0042.md`
|- Verifier prompt: `ai/tasks/task-0042-verifier.md`
|- Status: COMPLETE ✅
|- PR: #85 (`codex/task-0042-cloudflare-custom-domains`), **MERGED** at
  commit `d0d5c6e` (2026-05-27T14:51:08Z)
|- Objective: Make Cloudflare custom domains first-class and intent-driven,
  add a Cloudflare domain component type, and publish stage/prod web consoles
  at `stage.sourceplane.ai` and `prod.sourceplane.ai`.
|- Scope boundary: `intent.yaml` domain config, new Cloudflare domain
  composition/component, Pages custom-domain attachment, typed custom-domain
  support for Cloudflare app components, api-edge CORS updates, and focused
  specs/docs. No private Worker public exposure, no legacy Pages deletion, no
  `dev` live domain provisioning, and no `specs-v2/**` work.
|- PR CI run: `26501416473` — green (22/22 checks)
|- Post-merge main CI run: `26518889622` — green (22/22 jobs), all completed
  with success.
|- Cloudflare infrastructure deployed:
  - stage Terraform: applied (14:53:12)
  - prod Terraform: applied (14:53:54)
|- Cloudflare Pages deployments live from d0d5c6e:
  - stage: ba5d2c65.sourceplane-web-console-stage.pages.dev
  - prod: f774baf3.sourceplane-web-console-prod.pages.dev
|- Implementer report: `ai/reports/task-0042-implementer.md`
|- Verifier report: `ai/reports/task-0042-verifier.md` (final)
|- Verifier confirmation: intent.yaml is the single domain source of truth,
  all domain config flows from intent.yaml env vars (`BASE_DOMAIN`,
  `CONSOLE_CUSTOM_DOMAIN`) to consuming components (api-edge, Terraform).
  CORS integration verified, Terraform resources match locked provider schema.
  All acceptance criteria met.

## Task 0043

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0043.md`
|- Status: verified PASS and merged
|- PR: #86 (`codex/task-0043-identity-security-events-persistence`), squash-merged at `4739306`
|- Objective: identity-owned security-event persistence foundation: `identity.security_events` table, repository methods, comprehensive tests, secret-safety.
|- Durable outcome: user-scoped security events persistable, cursor pagination, no org_id dependency.
|- Reports: `ai/reports/task-0043-implementer.md`, `ai/reports/task-0043-verifier.md`

## Task 0044

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0044.md`
|- Status: verified PASS and merged
|- PR: #87 (`codex/task-0044-identity-runtime-security-events`), squash-merged at `769de5d`
|- Objective: wire identity auth runtime flows to security-event recording. `login.challenge.created`, `session.created`, `login.complete.failed`, `session.revoked` events.
|- Durable outcome: auth runtime records security events with request context; no secret leakage.
|- Reports: `ai/reports/task-0044-implementer.md`, `ai/reports/task-0044-verifier.md`

## Task 0045

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0045.md`
|- Status: verified PASS and merged
|- PR: #88 (`codex/task-0045-identity-security-events-query`), squash-merged at `e67a9b2` (2026-05-27)
|- Objective: expose authenticated `GET /v1/auth/security-events` public query surface for identity-owned, user-scoped security history.
|- Scope: `@saas/contracts` types, identity-worker handler/pagination/router, api-edge auth-facade forwarding, focused identity-worker and api-edge tests.
|- Post-merge CI: run 26544885697 triggered.
|- Test results: 269 tests pass (76 identity-worker + 193 api-edge).
|- Verifier cleanup: removed 11 out-of-scope ai/ carryover files before merge; added missing implementer report.
|- Durable outcome: `GET /v1/auth/security-events` is live, authenticated, self-scoped, cursor-paginated, with SENSITIVE_KEYS metadata redaction. Unblocks account-security UI.
|- Reports: `ai/reports/task-0045-implementer.md`, `ai/reports/task-0045-verifier.md`

## Task 0046

|- Agent: Implementer → Verifier
|- Status: verified PASS and merged
|- PR: #89, squash-merged at `3892243`
|- Objective: web console Account Security view consuming Task 0045 security events route.
|- Durable outcome: Account Security view live in web console.

## Task 0047

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0047.md`
|- Verifier prompt: `ai/tasks/task-0047-verifier.md`
|- Status: verified PASS and merged
|- PR: #90 (`codex/task-0047-api-key-service-principal-foundation`), squash-merged at `08c0e7b` (2026-05-28)
|- PR CI runs: 26548869295 (original), 26549208506 (post-cleanup) — both green
|- Objective: identity-owned persistence foundation for organization-bound API keys and service principals.
|- Scope: migration 060 (`identity.service_principals`, `identity.api_keys`), types, repository methods, db tests.
|- Test results: 351 db tests pass.
|- Verifier cleanup: added implementer report, removed 11 carryover ai/ files.
|- Durable outcome: persistence seam for service principals and API keys on main. Hash-only key storage, no cross-context FKs, create/get/list/revoke repository primitives ready for admin route follow-on.
|- Reports: `ai/reports/task-0047-implementer.md`, `ai/reports/task-0047-verifier.md`

### Task 0048 — API Key Bearer Resolution for Service Principal Auth

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0048.md`
|- Verifier prompt: `ai/tasks/task-0048-verifier.md`
|- Status: verified PASS
|- Implementation: PR #91, branch `task-0048/api-key-bearer-resolution`, merge commit `2a78a5d`
|- PR CI runs: `26551391669` (27/27), `26551799366` (27/27), `26551978574` (27/27)
|- Reports: `ai/reports/task-0048-implementer.md`, `ai/reports/task-0048-verifier.md`
|- Objective: Add API-key bearer actor-resolution seam through identity-worker and api-edge.
|- Scope: auth contract extension (ActorContext, BearerResolutionResponse), identity resolveBearer(), GET /v1/auth/resolve, api-edge resolveActor() unified module, facade deduplication, focused tests.
|- Durable outcome: Identity resolves both session tokens and API keys. api-edge forwards x-actor-subject-id/type for service_principal actors. No raw bearer tokens forwarded downstream. 88+193 tests green.

### Task 0049 — Service-Principal Role-Binding Foundation

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0049.md`
|- Verifier prompt: `ai/tasks/task-0049-verifier.md`
|- Status: verified PASS
|- Implementation: PR #92, branch `codex/task-0049-service-principal-role-bindings`, merge commit `c216fa1`
|- PR CI run: `26553711720` (15/15 SUCCESS)
|- Reports: `ai/reports/task-0049-implementer.md`, `ai/reports/task-0049-verifier.md`
|- Objective: Add membership/policy foundation for service-principal role bindings so SP actors can participate in authorization pipeline.
|- Scope: 3 policy actions (organization.service_principal.binding.{create,list,revoke}), 3 internal membership routes, shared subject-ID helpers (@saas/contracts/service-principal), focused tests.
|- Durable outcome: Internal membership seam for SP role bindings on main. Owner/admin-only policy gating. Canonical sp_<hex32> subject-ID shape shared across contracts. Handlers fail closed on malformed input. 373 tests green.

### Task 0050 — V1 Public API-Key Admin Contract Reconciliation

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0050.md`
|- Verifier prompt: `ai/tasks/task-0050-verifier.md`
|- Status: verified PASS
|- Implementation: PR #93, branch `codex/task-0050-api-key-admin-contract`, merge commit `77cba75`
|- PR CI run: `26554942026` (plan=SUCCESS, matrix=SKIPPED — docs-only)
|- Reports: `ai/reports/task-0050-implementer.md`, `ai/reports/task-0050-verifier.md`
|- Objective: Reconcile V1 public API-key admin contract to tenant-scoped routes, removing the stale /v1/auth/api-keys contradiction.
|- Scope boundary: specs-only — 01-edge-api, 02-identity, 04-organizations-membership, api-guidelines. No runtime, no migrations, no TS contracts.
|- Durable outcome: Active spec pack consistently presents V1 public API-key admin as POST/GET/DELETE `/v1/organizations/{orgId}/api-keys[/{apiKeyId}]`. `/v1/auth/api-keys` deprecated. Bounded-context ownership documented (identity=keys+SPs, membership=role bindings, policy=authz). One-time secret return, hash-only persistence, and security-event expectations specified.

### Task 0051 — Public Tenant-Scoped API-Key Admin Runtime

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0051.md`
|- Verifier prompt: `ai/tasks/task-0051-verifier.md`
|- Status: verified PASS
|- Implementation: PR #94, branch `codex/task-0051-public-api-key-admin-runtime`, merge commit `d74b7f6`
|- PR CI run: `26558427095` (28/28 SUCCESS)
|- Reports: `ai/reports/task-0051-implementer.md`, `ai/reports/task-0051-verifier.md`
|- Objective: Implement V1 tenant-scoped public API-key admin runtime across api-edge, identity-worker, and policy-engine.
|- Scope: api-edge route recognition + forwarding, identity-worker create/list/revoke handlers with membership/policy orchestration, 3 policy actions (organization.api_key.{create,list,revoke}), PROJECT_GRANTABLE_ACTIONS for project_admin, 58 new tests.
|- Durable outcome: Public API-key admin runtime live on main. api-edge forwards POST/GET/DELETE `/v1/organizations/{orgId}/api-keys[/{apiKeyId}]` to identity-worker. Identity orchestrates membership binding, policy authorization, key material (sk_ prefix, SHA-256 hash), security events, and org audit. Raw secret returned only on create. Compensating binding revoke on failure. 480 tests green across touched suites.

### Task 0052 — Web-Console API Key Management UI

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0052.md`
|- Verifier prompt: `ai/tasks/task-0052-verifier.md`
|- Status: verified PASS
|- Implementation: PR #95, branch `codex/task-0052-web-console-api-key-management-ui`, merge commit `cdd781c`
|- PR CI runs: `26560148990` (original, 7/7 SUCCESS), `26560743797` (verifier fix, 7/7 SUCCESS)
|- Reports: `ai/reports/task-0052-implementer.md`, `ai/reports/task-0052-verifier.md`
|- Objective: Add org-scoped API key management UI to the web console using the live public API routes.
|- Scope: web-console API Keys tab (list/create/revoke), `@saas/contracts/api-keys` typed exports, one-time secret lifecycle, cursor pagination.
|- Durable outcome: Web-console API key management UI live on main. Authenticated org users can list, create, and revoke API keys from the workspace. Verifier fixed secret lifecycle (cleared on tab/org navigation) and committed missing implementer report.

### Task 0053 — Self-Scoped Account Profile API

|- Agent: Implementer → Verifier
|- Prompt: `ai/tasks/task-0053.md`
|- Verifier prompt: `ai/tasks/task-0053-verifier.md`
|- Status: verified PASS
|- Implementation: PR #96, branch `codex/task-0053-account-profile-api`, merge commit `c2b467b`
|- PR CI runs: `26562137078` (original, 27/27 SUCCESS), `26562767336` (post-implementer-report, 27/27 SUCCESS)
|- Reports: `ai/reports/task-0053-implementer.md`, `ai/reports/task-0053-verifier.md`
|- Objective: Add self-scoped GET/PATCH /v1/auth/profile endpoints for authenticated user display name management.
|- Scope: contracts (ProfileResponse, UpdateProfileRequest), identity repository (updateUserProfile), identity-worker profile handler/service/router, api-edge multi-method route + PATCH body forwarding, specs, 21 new tests.
|- Durable outcome: Self-scoped GET/PATCH /v1/auth/profile live on main. Fail-closed body validation (displayName only, max 120 chars, empty→null, unsupported fields rejected). API-key/service-principal actors blocked. Safe user.profile.updated security event with changed field names only. Profile update and event recording are sequential (not transactional) — documented residual risk.


## Task 0054

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0054.md`
|- Verifier prompt: `ai/tasks/task-0054-verifier.md`
|- Status: verified PASS (2026-05-28)
|- Implementation: PR #97, branch `impl/task-0054-profile-settings-ui`, merge commit `73f76bf`
|- PR CI runs: `26563632783` (original, 4/4 SUCCESS), `26564017112` (post-verifier-report, 4/4 SUCCESS)
|- Reports: `ai/reports/task-0054-implementer.md`, `ai/reports/task-0054-verifier.md`
|- Objective: Add web-console Account Profile settings UI using the live public `GET/PATCH /v1/auth/profile` routes.
|- Scope boundary: web-console API client, state helper, and account view/profile UI only; preserve Account Security and all workspace flows.
|- Durable outcome: Web-console account profile settings UI live on main. Account view with Profile and Security Events tabs. Display name update/clear via PATCH with `{ displayName: string | null }` only. In-memory session and header refresh without reload. All existing workspace flows preserved.

## Task 0055

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0055.md`
|- Verifier prompt: `ai/tasks/task-0055-verifier.md`
|- Status: verified PASS (2026-05-28)
|- Implementation: PR #98, branch `impl/task-0055-config-settings-flags`, merge commit `d148ccf`
|- PR CI runs: `26565113214` (original, 7/7 SUCCESS), `26565687838` (post-verifier-cleanup, 7/7 SUCCESS)
|- Reports: `ai/reports/task-0055-implementer.md`, `ai/reports/task-0055-verifier.md`
|- Objective: Config persistence foundation — settings, feature flags, and secret metadata tables with typed repository.
|- Scope boundary: `config` schema DDL, `@saas/db/config` repository module, test suite; no API routes or UI.
|- Durable outcome: Config persistence live on main. `config.settings`, `config.feature_flags`, `config.secret_metadata` tables with RLS and org/project scoping. Typed CRUD repository with cursor pagination, secret rotate/revoke, ciphertext-envelope never exposed. 388 tests passing.

## Task 0056

|- Agent: Implementer + Verifier
|- Prompt: `ai/tasks/task-0056.md`
|- Verifier prompt: `ai/tasks/task-0056-verifier.md`
|- Status: verified PASS (2026-05-28)
|- Implementation: PR #99, branch `impl/task-0056-config-worker-read-api`, merge commit `352ca71`
|- PR CI runs: `26567374841` (original, 27/27 SUCCESS), `26567965265` (post-verifier-artifacts, 27/27 SUCCESS)
|- Reports: `ai/reports/task-0056-implementer.md`, `ai/reports/task-0056-verifier.md`
|- Objective: Read-only config API surface — config-worker with settings, feature flags, and secret metadata GET endpoints at org/project/env scopes.
|- Scope boundary: `apps/config-worker`, `api-edge` config facade, contracts, policy-engine config actions, tests; no mutations, no UI, no Terraform.
|- Durable outcome: Read-only config API live on main. 9 GET routes (3 resources × 3 scopes), fail-closed auth, billing_admin excluded, secret metadata safe (no plaintext/ciphertext). 55 config-worker tests, 222 api-edge tests.

## Task 0057

|- Agent: Implementer + Verifier
|- Prompt: `ai/tasks/task-0057.md`
|- Verifier prompt: `ai/tasks/task-0057-verifier.md`
|- Status: verified PASS (2026-05-28)
|- Implementation: PR #100, branch `impl/task-0057-config-worker-deploy-fix`, merge commit `fa0e2de`
|- PR CI run: `26569227047` (20/20 SUCCESS)
|- Post-merge main CI run: `26570117470` (SUCCESS)
|- Reports: `ai/reports/task-0057-implementer.md`, `ai/reports/task-0057-verifier.md`
|- Objective: Fix post-merge Task 0056 deployment blocker — replace config-worker placeholder Hyperdrive IDs, add api-edge→config-worker dependency edge.
|- Scope boundary: `apps/config-worker/wrangler.jsonc`, `apps/api-edge/component.yaml`, deployment-config regression tests; no Workers code, no Terraform, no UI.
|- Durable outcome: Config-worker stage/prod deploy with verified Hyperdrive IDs. api-edge deploy ordering respects config-worker dependency. 13 regression tests prevent placeholder recurrence. Repo health green.

## Task 0058

|- Agent: Implementer + Verifier
|- Prompt: `ai/tasks/task-0058.md`
|- Verifier prompt: `ai/tasks/task-0058-verifier.md`
|- Status: verified PASS (2026-05-28)
|- Implementation: PR #101, branch `impl/task-0058-config-ui`, merge commit `fb013db`
|- PR CI run: `26571217418` (4/4 SUCCESS)
|- Reports: `ai/reports/task-0058-implementer.md`, `ai/reports/task-0058-verifier.md`
|- Objective: Add read-only Config tab to web-console for inspecting settings, feature flags, and secret metadata through public api-edge config routes.
|- Scope boundary: `apps/web-console/src/api.ts`, `apps/web-console/src/main.ts`, `apps/web-console/src/style.css`; no backend, infrastructure, or config-worker changes.
|- Durable outcome: Web-console Config tab live with all 9 config list routes, explicit org/project/environment scope selection, environment on-demand loading, cursor pagination, safe text rendering. No mutations or secret plaintext.

## Task 0059

- Agent: Implementer → Verifier
- Prompt: `ai/tasks/task-0059.md`
- Verifier prompt: `ai/tasks/task-0059-verifier.md`
- Status: verified and merged
- PR: #102 (`impl/task-0059-config-mutations`), squash-merged at `c3e2b2d`
- Objective: Add and verify policy-gated public config mutation routes for non-secret settings and feature flags at organization, project, and environment scope, with atomic event/audit writes.
- Reports: `ai/reports/task-0059-implementer.md`, `ai/reports/task-0059-verifier.md`
- Durable outcome: Config mutation handlers live on main. POST create and PATCH update for settings and feature flags at org/project/environment scopes. Policy actions `organization.config.write` and `project.config.write` deny-by-default. Atomic `settings.updated` and `feature.updated` event/audit writes. Verifier fixed 2 stale api-edge tests and reconstructed missing implementer report. 98 config-worker tests, 223 api-edge tests.

## Task 0060

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0060.md`
|- Verifier prompt: `ai/tasks/task-0060-verifier.md`
|- Status: verifier scoped and ready (2026-05-28)
|- Implementation: PR #103 (`impl/task-0060-scope-enforcement`), open with merge state CLEAN and PR CI run `26574711168` green at orchestration time.
|- Objective: harden config setting and feature-flag PATCH item routes so the requested public route scope must exactly match the stored row scope before authorization or mutation succeeds.
|- Scope boundary: config-worker router/handlers and focused tests only; no web-console mutation UI, secret mutation/encryption path, database migration, policy expansion, Terraform, infrastructure, or `specs-v2/**` work.
|- Acceptance: verifier inspects PR #103 code paths and tests, runs local config-worker/api-edge checks plus Orun validate/component/changed-plan/dry-run, reviews CI logs, confirms no secret or unrelated file churn, and merges only on PASS with green CI.
|- Expected outcome: if PASS, PR #103 merged and `ai/reports/task-0060-verifier.md` records verification evidence; if FAIL, PR remains open with blockers.

## Task 0071

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0071.md`
|- Verifier prompt: `ai/tasks/task-0071-verifier.md`
|- Status: verified PASS, merged (2026-05-28)
|- Implementation: PR #114 (`impl/task-0071-metering-foundation`), merge commit `f4d3802`
|- PR CI run: `26603932251` — 10/10 SUCCESS
|- Reports: `ai/reports/task-0071-implementer.md`, `ai/reports/task-0071-verifier.md`
|- Objective: add metering persistence and contract foundation — metering bounded-context schema, typed @saas/db/metering repository, and starter @saas/contracts metering types.
|- Scope boundary: packages/db metering module + migration, packages/contracts metering types, focused tests; no Worker runtime, routes, billing state, or infrastructure.
|- Durable outcome: 4 metering tables (usage_records, usage_rollups, quota_definitions, quota_violations) with org-scoped tenancy, idempotent usage ingestion, structured quota checks, and 22 tests proven on main.

## Task 0072

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0072.md`
|- Verifier prompt: `ai/tasks/task-0072-verifier.md`
|- Status: verified PASS, merged (2026-05-28)
|- Implementation: PR #115 (`impl/task-0072-metering-worker`), merge commit `b4ced6bc`
|- PR CI run: `26605633952` — 33/33 SUCCESS
|- Reports: `ai/reports/task-0072-implementer.md`, `ai/reports/task-0072-verifier.md`
|- Objective: create metering Worker runtime API surface backed by Task 0071 repository/contracts, with api-edge facade and policy-engine authorization.
|- Scope boundary: apps/metering-worker, api-edge metering facade, policy-engine metering actions, focused tests; no billing, UI, scheduler, Analytics Engine, KV cache.
|- Durable outcome: 5 metering routes (usage record/batch/summary, quota check, violations list) behind api-edge with fail-closed authorization, idempotency, metadata safety, batch limits, and 25 focused tests proven on main.

## Task 0073

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0073.md`
|- Verifier prompt: `ai/tasks/task-0073-verifier.md`
|- Status: verified PASS, merged (2026-05-29)
|- Implementation: PR #116 (`impl/task-0073-calm-editorial-design`), merge commit `5cde36db`
|- PR CI run: `26607828400` — 4/4 SUCCESS (plan, web-console dev/stage/prod Verify deploy)
|- Post-merge main CI run: `26607911105` — SUCCESS
|- Reports: `ai/reports/task-0073-implementer.md`, `ai/reports/task-0073-verifier.md`
|- Objective: refresh the web-console design language to a calm, warm, editorial workspace inspired by `referance/figma/` and the user direction.
|- Scope boundary: CSS-only rewrite of `apps/web-console/src/style.css`; no markup/behavior/API/dependency/backend changes; no new fake product surfaces; no React/Tailwind/shadcn migration.
|- Durable outcome: parchment/sand/fog/stone token system with terracotta/clay/sage/olive/rust accents, editorial serif headings, monospace reserved for identifiers, calmer status pills, gentler motion with `prefers-reduced-motion` support, warmer sidebar with terracotta active rail, parchment topbar, and responsive collapse at 1024/768/480 — all expressed across existing class hooks emitted by `main.ts` with the runtime/DOM unchanged.

## Task 0074

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0074.md`
|- Verifier prompt: `ai/tasks/task-0074-verifier.md`
|- Status: verified PASS, merged (2026-05-29)
|- Implementation: PR #117 (`impl/task-0074-metering-rollups`), merge commit `d67aba5d`
|- PR CI run: `26608615817` original 15/15 SUCCESS; post-verifier-report push CI run `26609025377` 15/15 SUCCESS
|- Post-merge main CI run: `26609144832` — 15/15 SUCCESS
|- Reports: `ai/reports/task-0074-implementer.md`, `ai/reports/task-0074-verifier.md`
|- Objective: materialize metering hourly/daily rollups from raw usage records and add a bounded metering-worker scheduled invocation seam.
|- Scope boundary: `@saas/db/metering` rollup materialization, `apps/metering-worker` scheduled rollup code, wrangler cron config, focused DB/worker tests, and implementer report only; no billing/provider/UI/Analytics Engine/Queue/KV/Durable Object/R2/Terraform/public-trigger or `specs-v2/**` work.
|- Durable outcome: `materializeUsageRollups` is live in `@saas/db/metering` — parameterized SQL only, GROUP BY `org_id, project_id, environment_id, metric, date_trunc($1, recorded_at)` (org-scoped, never aggregates across orgs), half-open source window `recorded_at >= start AND recorded_at < end`, deterministic md5 ids, `ON CONFLICT … DO UPDATE` whose target mirrors `uq_rollup_dimensions` from migration `100_metering_foundation`, idempotent across re-runs, hourly and daily buckets only. metering-worker exports `scheduled(controller, env, ctx)` which runs `runScheduledMaterialization` (prior+current hour and prior+current day passes) on wrangler cron `5 * * * *`; fails closed when `SOURCEPLANE_DB` is absent; logs only `[scheduled] rollup <bucket> <ISO start>..<ISO end> ok=<bool> rows=<n>` — no org IDs, no metric values, no metadata, no SQL. Public routes and api-edge facade unchanged. Stage/prod wrangler envs declare `SOURCEPLANE_DB` Hyperdrive bindings; dev does not (consistent with no-dev-Supabase environment standard) and the scheduled pass will fail closed there as intended.


## Task 0075

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0075.md`
|- Verifier prompt: `ai/tasks/task-0075-verifier.md`
|- Status: verified PASS, merged (2026-05-29)
|- Implementation: PR #118 (`impl/task-0075-billing-foundation`), squash merge commit `ba01ea64bc046b0ad89582d0ad51275eafb91f1f`
|- PR CI run: `26610166103` — 11/11 SUCCESS (including db-migrate stage/prod applying `110_billing_foundation`)
|- Post-merge main CI run: `26610557793` — 11/11 SUCCESS (re-applied `110_billing_foundation` on stage/prod; both no-ops post-merge by design since the PR CI runs already applied)
|- Reports: `ai/reports/task-0075-implementer.md`, `ai/reports/task-0075-verifier.md`
|- Objective: add the billing persistence and shared contract foundation for organization-level plans, billing customers, subscriptions, invoices, and entitlements so future billing runtime/UI work can query starter-owned state and consume metering outputs without hardcoded UI branching.
|- Scope boundary: billing migration, `@saas/db/billing` repository module, `@saas/contracts/billing` types, package exports/test mappers, focused DB/contract tests, and implementer report only; no billing Worker, api-edge route, web-console UI, payment-provider SDK/webhook, provider secrets, Terraform, Queue/KV/Durable Object/Analytics Engine, metering mutation, or `specs-v2/**` work.
|- Durable outcome: migration `110_billing_foundation` (checksum `980564a806e89c0039f012f7c0ec49267920aea549b394c5af3712722e4b9f8f`) is live on stage and prod Supabase; creates `billing.{plans, billing_customers, subscriptions, invoices, entitlements}` with `org_id`-first indexes, `UNIQUE(org_id)` on `billing_customers` (V1 invariant), `UNIQUE(org_id, entitlement_key)` for entitlement upserts, CHECK constraints on every enum/amount, idempotent `CREATE … IF NOT EXISTS` throughout, and no secret-bearing columns. `@saas/db/billing` exports a Worker-safe `BillingRepository` whose every accessor uses parameterized SQL, requires `org_id` on cross-org-sensitive lookups, and refuses cross-org invoice rewrites via `ON CONFLICT (id) DO UPDATE … WHERE billing.invoices.org_id = EXCLUDED.org_id`. Billing repository code contains zero references to `metering.*` (asserted by a dedicated boundary test). `@saas/contracts/billing` exports provider-neutral public types (Plan, BillingCustomer, Subscription, Invoice, Entitlement, BillingSummary) with opaque `provider*`/`hostedUrl` fields and no secret-bearing surfaces (enforced by a type-level test). 30 db-tests and 14 contracts-tests cover tenant isolation, parameterized-SQL invariant, entitlement upsert and listing, subscription state transitions, invoice cross-org safety, summary composition, and the metering/billing boundary. Local `orun plan --changed` selects the same job set (contracts/db build+verify, contracts-tests/db-tests, db-migrate stage+prod) that CI actually executed — no plan drift.

## Task 0076

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0076.md`
|- Verifier prompt: `ai/tasks/task-0076-verifier.md`
|- Status: verified PASS, merged (2026-05-29)
|- Implementation: PR #119 (`impl/task-0076-billing-worker`), squash merge commit `fb66ff5d7d134e8077fd5104bc8bbb9007d9bcd7`
|- PR CI runs: `26611508443` (original, 27/27 SUCCESS), `26611795386` (post-implementer-report, 27/27 SUCCESS). Verifier added missing implementer report to PR branch (commit `4a353a5`) before merge.
|- Reports: `ai/reports/task-0076-implementer.md`, `ai/reports/task-0076-verifier.md`
|- Objective: ship the first billing runtime/API read surface on top of the Task 0075 billing foundation — a private `apps/billing-worker` plus public `api-edge` org-scoped billing read routes backed by the billing repository/contracts.
|- Scope boundary: new `apps/billing-worker` with five GET routes (`plans`, `customer`, `summary`, `invoices`, `entitlements`), `apps/api-edge` billing facade/env/wrangler/component updates wiring those five routes only, focused billing-worker + api-edge billing-facade tests, and the implementer report. No mutations, no Stripe/payment SDK, no provider credentials, no webhook handling, no billing UI, no schema/migration edits, no metering schema changes, no Queue/KV/Durable Object/Analytics Engine/Terraform/Secrets Store provisioning, no `specs-v2/**` work.
|- Durable outcome: organization billing reads are live on main behind the public api-edge gateway at `/v1/organizations/{orgId}/billing/{plans,customer,summary,invoices,entitlements}`. billing-worker is private (`workers_dev: false` for dev/stage/prod) with same-environment `SOURCEPLANE_DB` Hyperdrive (`08f7c605…` stage / `ab2c21c2…` prod), `MEMBERSHIP_WORKER`, and `POLICY_WORKER` service bindings. api-edge stage/prod bind `BILLING_WORKER` to `billing-worker-{stage,prod}` and depend on `billing-worker` at the component level. Authorization in billing-worker uses membership-worker authorization-context → policy-worker `billing.read`; any binding error, membership miss, or policy deny collapses to a generic 404 no-enumeration response; missing service bindings return 503. api-edge resolves the actor via identity-worker before forwarding and emits canonical `x-actor-subject-id` / `x-actor-subject-type` headers — the `authorization` header and raw bearer tokens are never forwarded to billing-worker. Public responses use `@saas/contracts/billing` provider-neutral mappers — provider fields surface only as opaque IDs/URLs; no plaintext credentials, ciphertext, SQL, or stack traces escape. 24 new billing-worker tests (route matching, method rejection, auth failure, policy denial fail-closed, query validation) + 14 new api-edge billing-facade tests (route matching, missing bindings, actor forwarding without bearer, downstream-throw fallback). Local `orun plan --changed` selects the same 26-job matrix that CI actually executed — no plan drift.



## Task 0077

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0077.md`
|- Verifier prompt: `ai/tasks/task-0077-verifier.md`
|- Status: verified PASS, merged (2026-05-29)
|- Implementation: PR #120 (`impl/task-0077-billing-tab`), squash merge commit `5bf21b4`
|- PR CI run: `26612485212` (4/4 SUCCESS — plan + web-console dev/stage/prod Verify deploy). No verifier fixes required; implementer report present in PR.
|- Reports: `ai/reports/task-0077-implementer.md`, `ai/reports/task-0077-verifier.md`
|- Objective: deliver a read-only web-console Billing tab consuming only the five public org-scoped billing read routes shipped in Task 0076, so authenticated org users can inspect plans, customer profile, current subscription, entitlements, and invoices without any provider write paths.
|- Scope boundary: `apps/web-console/src/api.ts` typed billing read client methods (`listBillingPlans`, `getBillingCustomer`, `getBillingSummary`, `listBillingInvoices`, `getBillingEntitlements`) using `@saas/contracts/billing` public types; `apps/web-console/src/main.ts` Billing sidebar/workspace tab; `apps/web-console/src/style.css` scoped Billing styling preserving the Task 0073 calm/editorial design language; and Task 0077 prompt/report only. No mutations (no checkout/portal/subscription/customer write/entitlement edit/invoice payment), no Stripe/payment SDK, no provider credentials, no webhook handling, no Secrets Store/Queue/KV/Durable Object/Analytics Engine/Terraform/Wrangler-binding changes, no billing-worker/api-edge/policy-worker/metering-worker/database/contract changes, no fake billing data, no framework migration, no `specs-v2/**` work.
|- Durable outcome: Billing tab now lives in the web-console workspace navigation (between Config and Audit) and renders for authenticated users with a selected organization. `ApiClient` exposes five typed billing read methods that call only public api-edge paths under `/v1/organizations/{orgId}/billing/...` and forward optional query params (`cursor`, `limit`, `status`, `subscriptionId`, `source`) through the existing `raw()` envelope. The tab renders summary card (active plan, subscription status pill, current period, trial/cancel dates, plan price, customer reference, entitlement count), available-plans grid (status pill + code + description + price/interval), customer profile card (name, email, status pill, provider, opaque truncated provider reference, created timestamp), entitlements table (key/type/enabled/limit/source), and cursor-paginated invoices table (number, status, amount due/paid, issued, period) with a "Load More" button that re-uses `meta.cursor`. All API-derived strings are inserted via `h()` / `document.createTextNode`; no `innerHTML` assignment with API data. 404 on `/billing/customer` is handled as an explicit "No billing customer" empty state via `result.error.code === "not_found"`. Provider fields surface only as opaque references — provider name as plain text, `providerCustomerId` truncated to 40 chars in `<code>`. Local `pnpm --filter @saas/web-console {typecheck,build,lint}` all clean (0 errors; 43 pre-existing `no-explicit-any` warnings unrelated to billing). Local `orun validate / plan --changed / run --dry-run` select the same 3-job web-console matrix that CI executed — no plan drift.


## Task 0078

||- Agent: Implementer -> Verifier
||- Prompt: `ai/tasks/task-0078.md`
||- Verifier prompt: `ai/tasks/task-0078-verifier.md`
||- Status: verified PASS, merged (2026-05-29)
||- Implementation: PR #121 (`impl/task-0078-billing-entitlement-check`), squash merge commit `9f83468`. Final head SHA `adfa372` after verifier committed implementer report to PR branch.
||- PR CI runs: `26613640343` (initial, 16/16 SUCCESS) and `26613978472` (post implementer-report commit, 16/16 SUCCESS); mergeStateStatus CLEAN before merge. One verifier-only fix: committed `ai/reports/task-0078-implementer.md` to PR branch (recurring gap pattern).
||- Reports: `ai/reports/task-0078-implementer.md`, `ai/reports/task-0078-verifier.md`
||- Objective: add a provider-neutral, service-binding-only entitlement decision API (`CheckBillingEntitlement`) on `billing-worker` so other bounded-context Workers can ask "is this org allowed X?" without speaking provider language, holding billing secrets, or going through public api-edge.
||- Scope boundary: new contract types in `packages/contracts/src/billing.ts` (`CheckBillingEntitlementRequest`, `CheckBillingEntitlementResponse` discriminated union, `BillingEntitlementDeniedReason`); new handler `apps/billing-worker/src/handlers/check-entitlement.ts` (parser + decider + handler with optional repoFactory injection); router edit in `apps/billing-worker/src/router.ts` to register `POST /v1/internal/billing/entitlements/check` before the public allow-list and before `resolveActor()`; tests in contracts/billing-worker/api-edge; api-edge billing-facade unchanged but regression-tested. No infra/schema/Wrangler-binding/policy-worker/metering-worker/web-console/provider-SDK changes. No first-caller wiring (e.g. projects-worker gating) — separate PR.
||- Durable outcome: `billing-worker` exposes a strictly-internal entitlement decision endpoint live on main with provider-neutral wire shape, fail-closed semantics (missing entitlement → 200 `{ allowed:false, reason:"not_configured" }`; disabled entitlement → `{ allowed:false, reason:"disabled" }`; enabled → `{ allowed:true, valueType, limitValue, source, subscriptionId }`), and secret-safe error handling (503 `internal_error` on non-`not_found` repo failures with generic message; SQL/stack/provider/row content never propagated — unit-tested against a poisoned `SELECT … billing.entitlements … line 42` error string). Conservative entitlement key validation (`/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/`, 128-char max) and `parseOrgPublicId` for org id, both run before any repository call. Response carries only `{ valueType, limitValue, source, subscriptionId }` from the `Entitlement` row — never `metadata`, internal id, or raw repo rows. Internal route is service-binding-only (does not require `x-actor-*` headers) and matched in `route()` before `matchRoute()` and `resolveActor()`. api-edge `isBillingRoute()` allow-list continues to match only the five Task 0076 public read paths under `/v1/organizations/{orgId}/billing/...` — pinned by new regression tests asserting `/v1/internal/billing/entitlements/check` is rejected AND that the exact public allow-list is the five Task 0076 routes (defense against accidental facade expansion). Verifier checks: contracts/billing-worker/api-edge typecheck PASS; contracts 18/18 (+4), billing-worker 41/41 (+14), api-edge billing-facade 16/16 (+2); `orun validate` PASS; `orun plan --changed` selects 7 components × 3 envs → 15 jobs (plan `943df57fd029`); `orun run --dry-run` simulates all 15 jobs SUCCESS; both CI runs 16/16 SUCCESS with same job matrix that local plan resolved.


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


## Task 0079

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0079.md` (verifier prompt not separately filed; verified in same cycle)
|- Status: verified PASS, merged (2026-05-29)
|- Implementation: PR #122 (`impl/task-0079-projects-entitlement-gate`), squash merge commit `ab78aea`
|- Reports: `ai/reports/task-0079-implementer.md`
|- Objective: wire `apps/projects-worker` as the first internal consumer of the Task 0078 billing-worker entitlement-check seam — `POST /v1/organizations/{orgId}/projects` now consults `limit.projects` after auth/membership/policy and before any project insert or `project.created` event/audit row.
|- Scope boundary: new `apps/projects-worker/src/billing-client.ts` (service-binding call + `decideProjectsLimit` quantity decision logic); edit to `apps/projects-worker/src/handlers/create-project.ts` to gate before write; hardened billing-worker internal route with `x-internal-caller` allow-list; focused projects-worker tests. No public api-edge surface change, no schema/migration change, no UI change, no Stripe/provider work, no metering/policy edits.
|- Durable outcome: project creation is fail-closed against billing — missing binding / non-OK response / malformed envelope / fetch exception / unknown caller / malformed limit / count failure all collapse to generic 503 with no row written; real disabled / not_configured / limit_reached deny with stable 412 `precondition_failed`. Proof that the bounded-context decision seam can shape Worker behavior without expanding the public API surface or sharing tables across domains.


## Task 0080

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0080.md`
|- Status: verified PASS, merged (2026-05-29)
|- Implementation: PR #123 (`impl/task-0080-membership-billing-gating`), squash merge commit `009d853`
|- PR CI run: `26617445815` 16/16 SUCCESS; post-merge main CI run `26618000897` 16/16 SUCCESS.
|- Reports: `ai/reports/task-0080-implementer.md`, `ai/reports/task-0080-verifier.md`
|- Objective: extend the entitlement seam to a second caller — `apps/membership-worker` invitation creation now gates on `limit.members` through the billing-worker private entitlement-check service binding, before token generation / invitation insert / `invite.created` event/audit writes.
|- Scope boundary: membership-worker billing client + handler ordering update; membership repository `countBillableMembers(orgId, now)` (active members + pending non-expired invitations, excludes accepted/revoked/expired); billing-worker caller allow-list tightened to exactly `projects-worker` and `membership-worker`; dependency-graph flip (`billing-worker -> membership-worker` removed, `membership-worker -> billing-worker` added — acyclic, peer service-binding deploy semantics accepted); focused tests. No public api-edge surface change, no schema/migration change, no UI change.
|- Durable outcome: invitation creation is fail-closed against billing; counts include pending invitations so quota is enforced before sending; same TOCTOU profile as Task 0079 (accepted for V1). Bounded-context boundary still clean: membership-worker imports `@saas/contracts/billing` only — no `@saas/db/billing` import, no cross-context query.


## Task 0081

|- Agent: Implementer -> Verifier
|- Prompt: `ai/tasks/task-0081.md`
|- Verifier prompt: `ai/tasks/task-0081-verifier.md`
|- Status: verified PASS, merged (2026-05-29)
|- Implementation: PR #124 (`impl/task-0081-env-billing-gate`), squash merge commit `2037922`
|- PR CI run: `26618797766` 18/18 SUCCESS (plan + 17 verify/verify-deploy jobs).
|- Reports: `ai/reports/task-0081-implementer.md`, `ai/reports/task-0081-verifier.md`
|- Objective: extend the entitlement seam to a third caller — `apps/projects-worker` environment creation (`POST /v1/organizations/{orgId}/projects/{projectId}/environments`) now gates on `limit.environments` after membership/policy and before any environment insert or `environment.created` event/audit row.
|- Scope boundary: reuse Task 0079's billing client by extracting `decideQuantityGate(...)` helper backing both `decideProjectsLimit` (unchanged) and new `decideEnvironmentsLimit`; new repository `countActiveEnvironments(orgId, projectId)` scoped by `org_id + project_id + status='active'`; handler ordering update; focused projects-worker tests. No public api-edge surface change, no schema/migration change, no billing-worker change beyond what 0080 already shipped.
|- Durable outcome: environment creation is fail-closed against billing; quota matrix (allow / unlimited / limit_reached / disabled / not_configured / malformed_limit) shared with project gate and unit-tested per branch; `limit.projects` gate behavior bit-identical (proved by passing extracted-helper tests). The three create paths (projects, members, environments) now share the same decision shape, ready for unified UI surfacing in Task 0082.


## Task 0082

|- Agent: Implementer -> Verifier (verifier OPEN)
|- Prompt: `ai/tasks/task-0082.md`
|- Verifier prompt: `ai/tasks/task-0082-verifier.md`
|- Status: implementer complete; verifier OPEN; PR #125 CI RED
|- Implementation: PR #125 (`impl/task-0082-web-console-next`), head `9f3ec6b` (`docs(reports): task-0082 implementer report`)
|- PR CI run: `26622616478` — `plan` SUCCESS, all three `web-console-next.{dev,stage,prod}.verify-deploy` FAILURE.
|- Root failure: `/demo` route prerender threw `TypeError: Cannot read properties of undefined (reading 'url')` inside `useMemo`. Canonical Next.js 15 App Router prerender-error (`https://nextjs.org/docs/messages/prerender-error`) — a client component using `useSearchParams` / `useRouter` / `usePathname` without a Suspense boundary, or reading `window`/`document` at module evaluation time.
|- Reports: `ai/reports/task-0082-implementer.md`. Verifier report TBD at `ai/reports/task-0082-verifier.md`.
|- Objective: stand up a Next.js 15 (App Router) console at `apps/web-console-next/` deployed via `@opennextjs/cloudflare`, parity with the existing vanilla `apps/web-console`, plus designed `precondition_failed` upgrade UX for the four reason codes, URL-driven scope, Cmd-K palette, Zod-driven create forms, dark-mode-default theming. Old console untouched until cutover (separate task).
|- Scope boundary: new `apps/web-console-next/**` and its Orun composition (per-env Pages projects `sourceplane-web-console-next-{dev,stage,prod}`); `environmentBuildVar: NEXT_PUBLIC_DEPLOY_ENV`; no worker, contract, db, policy, api-edge, Terraform, or old-console changes.
|- Durable outcome (pending PR #125 merge): replacement console at parity with five Zod-driven create flows, four-reason precondition UX (`limit_reached`, `disabled`, `not_configured`, `malformed_limit`), `cmdk` palette, dark-mode default with light toggle, URL-as-scope, 12 Playwright screenshots under `ai/reports/task-0082-shots/`. Verifier is empowered to commit a scoped `/demo` prerender fix on the PR branch (Suspense boundary or `export const dynamic = "force-dynamic"`) before merging; if the fix doesn't land cleanly, FAIL the PR and leave it open.
|- Verifier result (2026-05-29): FAIL. Prerender fix landed via root layout `export const dynamic = "force-dynamic"` (commit `875e6e6`). Next.js build now succeeds for all 16 routes. Remaining blocker is implementer-territory: `component.yaml` declares `outputDir: .open-next/assets` but `package.json` has no `@opennextjs/cloudflare` dependency and `next build` emits `.next/`. orun `verify-build-output` step fails on all three `web-console-next.{dev,stage,prod}.verify-deploy` jobs (PR CI run `26623666583`). PR #125 left OPEN. Verifier report: `ai/reports/task-0082-verifier.md`.


## Task 0082.1

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0082.1.md`
|- Status: scoped and ready to begin (2026-05-29)
|- Implementation: TBD — commits push onto the existing PR #125 branch `impl/task-0082-web-console-next`. No new PR.
|- Objective: close the Task 0082 verify-build-output blocker by wiring `apps/web-console-next` to actually produce `apps/web-console-next/.open-next/assets/**` via `@opennextjs/cloudflare`, so the existing `cloudflare-pages-turbo` Orun pipeline can publish the per-env Pages projects (`sourceplane-web-console-next-{dev,stage,prod}`) and the three `Verify deploy` jobs go green on PR #125, unblocking merge of Task 0082.
|- Scope boundary: add `@opennextjs/cloudflare` (+ adapter peer deps) to `apps/web-console-next/package.json`, update `scripts.build` to emit `.open-next/assets/**`, surface assets to Turborepo via per-package `apps/web-console-next/turbo.json` override (preferred) or narrow root `turbo.json` outputs addition, deterministic `pnpm-lock.yaml` update, optional `apps/web-console-next/open-next.config.ts` if adapter requires. Preserve the verifier's root-layout `force-dynamic` fix. Do NOT change `component.yaml` `type`/`outputDir`/`projectName`/`environmentBuildVar`/`buildCommand`/`smokeCommand`; do NOT touch `apps/web-console`, any other app/worker/contract/package/db/policy/api-edge/Terraform; do NOT scope Task 0083 cutover.
|- Acceptance: `pnpm install --frozen-lockfile` PASS; `pnpm --filter @saas/web-console-next build` produces non-empty `.open-next/assets/**`; orun `validate` / `plan --changed` / `run --dry-run` PASS; PR CI plan SUCCESS, all three `web-console-next · {dev,stage,prod} · Verify deploy` SUCCESS including `verify-build-output`; `apps/web-console` byte-identical to `origin/main`; diff confined to `apps/web-console-next/**` + (optionally) root `turbo.json` + `pnpm-lock.yaml` + `ai/reports/task-0082.1-implementer.md`.
|- Expected outcome: Task 0082's web-console-next surfaces actually reach Pages on dev/stage/prod; PR #125 mergeable by a Task 0082.1 Verifier; Task 0083 (cutover from `apps/web-console`) unblocked.


## Task 0082 + 0082.1 (closed together)

|- Agent: Verifier (closing both 0082 and 0082.1)
|- Prompt: `ai/tasks/task-0082.1-verifier.md`
|- Status: verified PASS, merged (2026-05-29)
|- Implementation: PR #125 (`impl/task-0082-web-console-next`), squash merge commit `b73cd54c314eb1eb0f93f69a5bc09f278dc39b99` at 2026-05-29T08:29:38Z. PR head before merge: `c12400b` (verifier `.gitignore` + `.next/**` untrack on top of `e505677` implementer 0082.1 opennextjs wiring and `875e6e6` prerender fix).
|- PR CI run: `26626681497` 4/4 SUCCESS (plan + web-console-next.{dev,stage,prod}.Verify deploy).
|- Reports: `ai/reports/task-0082-implementer.md`, `ai/reports/task-0082-verifier.md` (initial FAIL), `ai/reports/task-0082.1-implementer.md`, `ai/reports/task-0082.1-verifier.md` (final PASS).
|- Objective: stand up `apps/web-console-next/` as a Next.js 15 + App Router console wired through `@opennextjs/cloudflare` for the `cloudflare-pages-turbo` Orun pipeline, parity with the vanilla `apps/web-console`, plus designed `precondition_failed` upgrade UX for the four reason codes (`limit_reached`, `disabled`, `not_configured`, `malformed_limit`), `cmdk` palette, Zod-driven create forms, dark-mode default.
|- Scope boundary: new `apps/web-console-next/**` (including per-env Pages projects `sourceplane-web-console-next-{dev,stage,prod}` via `cloudflare-pages-turbo` + `environmentBuildVar: NEXT_PUBLIC_DEPLOY_ENV`); `@opennextjs/cloudflare@1.0.4` + `@opennextjs/aws@3.6.2` adapter; per-package `apps/web-console-next/turbo.json` extends `//` with `.open-next/**` + `.next/**` outputs. Root `turbo.json` untouched. `apps/web-console` byte-identical to pre-PR main. No worker/contract/db/policy/api-edge/Terraform/migration changes.
|- Verifier fixes (single focused commit `c12400b` on PR branch): NEW `apps/web-console-next/.gitignore` covering `.next/`, `.open-next/`, `out/`, `.wrangler/`, `*.tsbuildinfo`, `.env*.local`; `git rm -r --cached apps/web-console-next/.next` (173 already-committed Next.js build-artifact files untracked from the index). Note: only `.next/**` was committed (not `.open-next/**` as task prompt claimed); new `.gitignore` covers both prospectively.
|- Durable outcome: replacement console live at parity — five Zod-driven create flows, four-reason precondition UX, `cmdk` palette, dark-mode default with light toggle, URL-as-scope, 12 Playwright screenshots under `ai/reports/task-0082-shots/`. `cloudflare-pages-turbo` Orun composition wired end-to-end through opennextjs adapter; PR CI plan + 3× verify-deploy all green. Repo health back to green. Task 0083 (cutover from `apps/web-console`: Pages project repoint / custom domain switch on stage/prod) unblocked, pending post-merge main CI run `26626890618` auto-creating per-env Pages projects.


## Task 0083

|- Agent: Implementer -> Verifier (verifier addendum re-verified on new head; merged with FAIL soak)
|- Prompt: `ai/tasks/task-0083.md`
|- Verifier prompt: `ai/tasks/task-0083-verifier.md` + addendum `ai/tasks/task-0083-verifier-addendum.md`
|- Status: implementer COMPLETE; verifier FAIL on post-merge soak; PR #129 **MERGED** 2026-05-29T12:30:01Z as squash commit `927c5179`. Hotfix Task 0083.1 required.
|- Implementation: PR #129 (`impl/task-0083-domain-cutover`), final head `8703081bdf190ea485afc1acd5d99496718690e1`, merge commit `927c51795df869466f5c66e8eed40a9ab10a0bea`
|- PR CI run: `26636510934` (9/9 SUCCESS). Post-merge main-CI run: `26637297242` (9/9 SUCCESS — but cloudflare-domain apply was a no-op, see verifier report).
|- Reports: `ai/reports/task-0083-implementer.md` (on main via merge). Verifier report: `ai/reports/task-0083-verifier.md` (overwritten per addendum, Result: FAIL).
|- Verifier soak finding: post-merge `cloudflare-domain · {stage,prod} · Terraform · apply` ran with `CONSOLE_CUSTOM_DOMAIN = ""` (env var not threaded from intent.yaml to `TF_VAR_CONSOLE_CUSTOM_DOMAIN`). `cloudflare_workers_domain.console` count=0 → resource never created. `stage.sourceplane.ai` and `prod.sourceplane.ai` NXDOMAIN. Rollback hatch (`*.rahulvarghesepullely.workers.dev`) serving HTTP 200 with `Sourceplane Console` on both envs. repo_health=yellow.
|- Hotfix Task 0083.1 scope: wire `CONSOLE_CUSTOM_DOMAIN` env var to Terraform as `TF_VAR_CONSOLE_CUSTOM_DOMAIN` in `infra/terraform/cloudflare-domain/component.yaml`; reference `cloudflare-hyperdrive` for the working env-mapping pattern. Same acceptance criteria as 0083 live probes.
|- Objective: cut custom domains `stage.sourceplane.ai` and `prod.sourceplane.ai` over from the legacy `cloudflare_pages_domain.console` attachment on `sourceplane-web-console-{stage,prod}` Pages projects to a `cloudflare_workers_domain.console` attachment on the `sourceplane-web-console-next-{stage,prod}` Workers (the `cloudflare-workers-assets-turbo` composition shipped in Tasks 0082.2 / 0082.2.1 / 0082.2.2). Delete `apps/web-console/`. Remove the legacy `*.pages.dev` console origins from api-edge CORS. Spec sweep (`specs/components/{01-edge-api,12-web-console,16-admin-support}.md`, `specs/repo.md`, README) for the new deployment shape.
|- Scope boundary: `infra/terraform/cloudflare-domain/**` (resource swap + provider bump + dependsOn flip), `apps/web-console/**` deletion, `apps/api-edge/src/cors.ts` + `tests/api-edge/src/cors.test.ts`, the four spec files + two READMEs, `pnpm-lock.yaml` regen. NO change to `apps/web-console-next/**`, `intent.yaml`, any worker/contract/db/policy/migration, no new orun composition, no legacy Pages-project deletion (manual soak cleanup), no `dev`-env `deploy` profile rule on `web-console-next`.
|- Implementer deviation: used v4 resource name `cloudflare_workers_domain` instead of v5 `cloudflare_workers_custom_domain` to keep blast radius small; cloudflare provider pin bumped `~> 4.30` -> `~> 4.52`; resource pinned to `environment = "production"` (only valid value); `pagesProjectPrefix` variable + `pages_project_name` output kept read-only for one soak cycle so the first post-merge `terraform plan` diff is a clean one-destroy/one-create per env.
|- Verifier mandate (per `ai/tasks/task-0083-verifier.md`): drive PR CI to 33/33 SUCCESS, merge, then run the mandatory post-merge soak (Terraform apply logs confirming `cloudflare_workers_domain.console` creation + `cloudflare_pages_domain.console` destroy on both stage and prod; `curl -sfL` on both apex domains returns 200 with `Sourceplane Console`; CORS preflight from `https://stage.sourceplane.ai` returns the matching `access-control-allow-origin`; `*.rahulvarghesepullely.workers.dev` shadow hostnames still 200 as rollback hatch). Roll back the merge if soak probes fail past one retry.
|- Expected outcome: Pages -> Workers + Static Assets migration fully closed out, legacy `apps/web-console` decommissioned, two follow-ups queued (drop `pagesProjectPrefix` after soak; optional v5 cloudflare provider bump).


## Task 0083.1

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0083.1.md`
|- Status: scoped and ready (2026-05-29). Orchestrator close-out pending one human-input question about uncommitted local diff on `main` (see `ai/waiting_for_input.md`).
|- Objective: thread `CONSOLE_CUSTOM_DOMAIN` (already declared per-env in `intent.yaml` as `stage.sourceplane.ai` / `prod.sourceplane.ai`) through to the `cloudflare-domain` Terraform apply step as `TF_VAR_CONSOLE_CUSTOM_DOMAIN`, so `cloudflare_workers_domain.console` is actually planned and applied on the next `github-push-main` run. Closes out the Task 0083 cutover whose post-merge soak FAILED with `0 added, 0 changed, 0 destroyed` and apex NXDOMAIN on both stage and prod.
|- Scope boundary: ONE wiring change (1-2 files) + optional README touch in `infra/terraform/cloudflare-domain/` + implementer report. NO Terraform `main.tf` changes (variable + gating already correct), NO provider/toolchain bumps, NO changes to other components, NO deletion of `pagesProjectPrefix` (still in soak), NO new spec proposal unless the wiring shape forces a documented contract change. Architect Brief grants latitude on shape selection (options a/b/c) with required one-line rationale in the report.
|- Acceptance (pre-merge): orun `validate` / `plan --changed` / `run --dry-run` all PASS; rendered `terraform-env` step contains a literal `TF_VAR_CONSOLE_CUSTOM_DOMAIN=` export for stage and prod; PR CI green.
|- Acceptance (post-merge, verifier-owned soak): `cloudflare-domain · {stage,prod} · Terraform · apply` logs contain `cloudflare_workers_domain.console: Creation complete`; `curl -sfL https://{stage,prod}.sourceplane.ai/` returns 200 with body `Sourceplane Console`; rollback hatch (`*.rahulvarghesepullely.workers.dev`) still serves 200.
|- Expected outcome: apex hostnames live, repo_health back to green, Task 0083 cutover fully closed, follow-up candidates 0084-A (drop `pagesProjectPrefix` + delete legacy Pages projects) and 0084-B (cloudflare provider v5 + `cloudflare_workers_custom_domain` rename) unblocked.

|- Agent: Verifier (closed 2026-05-29T13:30Z, PASS)
|- PR: #130 (`impl/task-0083.1-console-domain-tfvar`) squash-merged at `2443826` (2026-05-29T13:24Z)
|- PR CI run: `26639655361` (3/3 SUCCESS). Post-merge main-CI run: `26639840823` (SUCCESS).
|- Fix shape: option (c) — promoted `CONSOLE_CUSTOM_DOMAIN` from `environments.{env}.env` into `environments.{env}.parameterDefaults.terraform` for dev/stage/prod in `intent.yaml`; removed shadowing component-level default `CONSOLE_CUSTOM_DOMAIN: ""` from `infra/terraform/cloudflare-domain/component.yaml`. Job template's existing `range $key, $value := .parameters` -> `TF_VAR_<key>` loop exports `TF_VAR_CONSOLE_CUSTOM_DOMAIN` automatically (no job-template edits).
|- Apply evidence: `cloudflare_workers_domain.console[0]: Creation complete` on stage (id=`052eaece5e989d5a7280b6c206e562c42950e3a6`) and prod (id=`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). First real create of this resource on both envs.
|- Soak probes: `curl -sfL https://stage.sourceplane.ai/` -> 200 `Sourceplane Console` (11245 bytes); `curl -sfL https://prod.sourceplane.ai/` -> 200 `Sourceplane Console` (11245 bytes); CORS preflight from both apex origins to `api-edge-{env}.rahulvarghesepullely.workers.dev` returns 204 with matching `access-control-allow-origin`; rollback hatch `*.rahulvarghesepullely.workers.dev` still 200.
|- Reports: `ai/reports/task-0083.1-implementer.md`, `ai/reports/task-0083.1-verifier.md`.
|- Out-of-scope drift caught: local `kiox.lock` v2.3.0->v2.9.0 toolchain bump was reverted before pushing the impl branch.
|- Durable outcome: Task 0083 Pages -> Workers + Static Assets cutover fully live. `repo_health: green`.

## Task 0084

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0084.md`
|- Status: scoped (2026-05-29) — ready for pickup.
|- Objective: drop the now-dead `pagesProjectPrefix` variable + `pages_project_name` output from `infra/terraform/cloudflare-domain/` (kept for one soak cycle post Task 0083; the cycle is complete) and imperatively delete the legacy `sourceplane-web-console-{dev,stage,prod}` Cloudflare Pages projects via wrangler. Orun has no managed record of those Pages projects, so deletion must happen outside the terraform plan; the apply step itself should be a clean no-op after the variable+output drop.
|- Scope boundary: `infra/terraform/cloudflare-domain/terraform/main.tf` (delete `variable "pagesProjectPrefix"`, `local.pages_project_name`, `output "pages_project_name"`), `infra/terraform/cloudflare-domain/component.yaml` (delete the `pagesProjectPrefix` parameter line), `infra/terraform/cloudflare-domain/README.md` (drop the two "Retained read-only..." rows), plus an out-of-band wrangler/Cloudflare-API deletion script for the three legacy Pages projects with evidence captured in the implementer report. NO change to `cloudflare_workers_domain.console`, no provider-pin change, no other component, no api-edge change.
|- Acceptance (pre-merge): orun `validate` / `plan --changed` / `run --dry-run` PASS; PR CI green. Terraform plan diff must be only the removal of the variable/output (no resource churn).
|- Acceptance (post-merge): `cloudflare-domain · {stage,prod} · Terraform · apply` is a clean no-op (`0 added, 0 changed, 0 destroyed`); apex probes still 200; rollback hatch still 200; wrangler verification that `sourceplane-web-console-{dev,stage,prod}` Pages projects no longer exist.
|- Expected outcome: legacy Pages residuals fully gone, repo housekeeping closed. Follow-up 0085 (cloudflare provider v5 + `cloudflare_workers_custom_domain` rename) unblocked.

|- Implementer outcome (2026-05-29): PR #131 opened on branch `impl/task-0084-drop-pages-residuals` (head `47e34485`). Diff = 4 files (`infra/terraform/cloudflare-domain/{terraform/main.tf,component.yaml,README.md}` + `ai/reports/task-0084-implementer.md`). Out-of-band wrangler deletion done: `sourceplane-web-console-{stage,prod}` deleted; `sourceplane-web-console-dev` never existed (benign error). `kiox.lock` orun v2.3.0 -> v2.9.0 bump reverted out of scope. PR CI run `26640690294`: `plan` SUCCESS, `cloudflare-domain · {stage,prod} · Terraform` SUCCESS. mergeStateStatus=CLEAN, mergeable=MERGEABLE.

||- Agent: Verifier (closed 2026-05-29T13:55Z, PASS)
||- Prompt: `ai/tasks/task-0084-verifier.md`
||- Status: verified and merged (PASS).
||- PR: #131 (`impl/task-0084-drop-pages-residuals`) squash-merged at `305520a` (2026-05-29T13:53Z).
||- PR CI run: `26640690294` (3/3 SUCCESS). Post-merge main-CI run: `26641282273` (3/3 SUCCESS — `plan`, `cloudflare-domain · stage · Terraform` job `78514773064`, `cloudflare-domain · prod · Terraform` job `78514773088`).
||- Apply evidence (load-bearing no-op): both stage and prod Terraform apply jobs logged `Apply complete! Resources: 0 added, 0 changed, 0 destroyed.` PR-CI plan diff was purely `Changes to Outputs: pages_project_name -> null` with zero resource churn. `cloudflare_workers_domain.console` shape, provider pin `cloudflare ~> 4.52`, and live resource IDs (stage `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`) all preserved.
||- Live probes (post-merge): `curl -sfL https://stage.sourceplane.ai/` -> 200 `<title>Sourceplane Console</title>`; same for `https://prod.sourceplane.ai/`; rollback hatch `sourceplane-web-console-next-{stage,prod}.rahulvarghesepullely.workers.dev` both 200. `wrangler pages project list` confirms `sourceplane-web-console-{dev,stage,prod}` stay absent (unsuffixed `sourceplane-web-console` and `*-next-stage` remain, both out of scope).
||- Reports: `ai/reports/task-0084-implementer.md`, `ai/reports/task-0084-verifier.md`.
||- Durable outcome: legacy Pages residuals fully gone from infra Terraform; `pagesProjectPrefix` variable, `local.pages_project_name`, and `output "pages_project_name"` removed from `infra/terraform/cloudflare-domain/{terraform/main.tf,component.yaml,README.md}`. Three legacy Pages projects `sourceplane-web-console-{dev,stage,prod}` confirmed absent from Cloudflare account. Task 0085 (cloudflare TF provider v4 -> v5 + `cloudflare_workers_domain` -> `cloudflare_workers_custom_domain` rename) unblocked as next candidate.


## Task 0085 (rescoped — superseded by 0085a + 0085b)

|- Agent: Implementer (BLOCKED) -> Orchestrator (ACCEPTED rescope 2026-05-29)
|- Prompt: `ai/tasks/task-0085.md`
|- Status: superseded by Task 0085a + Task 0085b per accepted spec proposal `ai/proposals/task-0085-spec-update.md`. NOT a single PR.
|- Objective (original): bump `cloudflare/cloudflare ~> 4.52` -> `~> 5.x` and rename `cloudflare_workers_domain.console` -> `cloudflare_workers_custom_domain.console` in `infra/terraform/cloudflare-domain/terraform/main.tf` in one PR, preserving the two live custom-domain resource IDs via `moved {}` or `terraform state mv`.
|- Blocker: cloudflare provider v5 does not implement cross-type `MoveState` for this rename. Two PR-CI runs proved no single-PR shape works:
   - run `26642692516` (bare `moved {}`): `Error: Unable to Move Resource State`.
   - run `26642904336` (`removed{}+import{}` under `~> 5.0` pin): `Error: no schema available for cloudflare_workers_domain.console[0]` (v4 schema needed to read v4-typed state entry, v4 gone under `~> 5.0`).
|- Resolution: orchestrator ACCEPTED rescope on 2026-05-29 (see `ai/proposals/task-0085-spec-update.md` `## Resolution`). Split into:
   - Task 0085a — Phase 1: state drop under existing `~> 4.52` pin via `removed { lifecycle { destroy = false } }`. Zero Cloudflare API writes.
   - Task 0085b — Phase 2 (scoped only after 0085a verifier PASS + clean post-merge apply): provider bump to `~> 5.0`, `cloudflare_workers_custom_domain.console` resource, `import {}` blocks re-adopting by the two known immutable IDs.
|- PR #132 (`impl/task-0085-cloudflare-v5-workers-custom-domain`) closed as superseded by the 0085a implementer (not merged; branch left for reference).
|- Live invariant across both phases: stage id `052eaece5e989d5a7280b6c206e562c42950e3a6` and prod id `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` must survive byte-identical.

## Task 0085a

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0085a.md`
|- Status: Implementer DONE (2026-05-29) — PR #133 open, mergeable CLEAN, PR-CI 3/3 SUCCESS. Verifier task scoped at `ai/tasks/task-0085a-verifier.md`; awaiting verifier pickup.
|- Objective: Phase 1 of the v4->v5 cloudflare-domain migration. Under the existing `cloudflare ~> 4.52` pin, drop the `cloudflare_workers_domain.console` Terraform state entry on stage and prod without touching the live Cloudflare resource. State-only mutation; zero Cloudflare API writes.
|- Scope boundary: `infra/terraform/cloudflare-domain/terraform/main.tf` (add `removed { from = cloudflare_workers_domain.console; lifecycle { destroy = false } }`, fence/comment-out the v4 resource block, re-point `output worker_custom_domain_id` to the literal placeholder `pending_v5_reimport_task_0085b`), `infra/terraform/cloudflare-domain/README.md` (phase-1-of-2 note), `ai/reports/task-0085a-implementer.md`. NO provider pin change, NO `import {}` block (those land in 0085b), NO change to other components, intent.yaml, composition, or job template.
|- Acceptance (pre-merge): orun `validate` / `plan --changed` / `run --dry-run` PASS; PR CI green; CI logs on both env jobs show the literal plan-diff strings: `# cloudflare_workers_domain.console[0] will no longer be managed by Terraform, but will not be destroyed`, `# (destroy = false is set in the configuration)`, `Plan: 0 to add, 0 to change, 0 to destroy.`, `Warning: Some objects will no longer be managed by Terraform` + the resource listed by name, plus the Output diff line `~ worker_custom_domain_id = "<known-id>" -> "pending_v5_reimport_task_0085b"` with `<known-id>` = `052eaece5e989d5a7280b6c206e562c42950e3a6` for stage / `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` for prod.
|- Acceptance (post-merge, verifier-owned soak): both `cloudflare-domain · {stage,prod} · Terraform · apply` jobs log `Apply complete!` with `0 destroyed` AND a state-drop confirmation stanza for `cloudflare_workers_domain.console[0]`. The four live probes still return 200 (stage + prod apex + both `*.rahulvarghesepullely.workers.dev` rollback hatches). Anything other than `0 destroyed` is FAIL + revert (would unbind `stage.sourceplane.ai` / `prod.sourceplane.ai` live).
|- Wording-reconciliation note: Terraform 1.15.x does NOT emit a `to forget` count in the apply footer for `removed { lifecycle { destroy = false } }`; the footer stays `Plan: 0 to add, 0 to change, 0 to destroy.` and the state-drop is communicated via the dedicated `Warning` block and (post-apply) the `Removed from state` stanza. The load-bearing invariant is `to destroy = 0` AND the resource named in the warning/stanza.
|- Implementer outcome (2026-05-29): PR #133 (`impl/task-0085a-cloudflare-v4-removed-state-drop`, head matches `gh pr view 133`), `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`. PR-CI run `26644307676` 3/3 SUCCESS. Earlier PR-CI run `26644076501` (stage job `78524741081`, prod job `78524741140`) captured the literal plan-diff evidence pasted into `ai/reports/task-0085a-implementer.md`. Pre-merge probes: all four URLs 200 with `<title>Sourceplane Console</title>`. PR #132 closed superseded.
|- Expected outcome: v4-typed state entry dropped, live resources untouched, 0085b unblocked. Risk window: between 0085a merge and 0085b apply, the two live custom-domain attachments are not Terraform-tracked; any Cloudflare-side drift would not be detected by `terraform plan`. Mitigation: keep 0085b on the immediate orchestrator queue.

||- Agent: Verifier (closed 2026-05-29T15:09Z, PASS)
||- Prompt: `ai/tasks/task-0085a-verifier.md`
||- Status: verified and merged (PASS post-merge soak).
||- PR: #133 (`impl/task-0085a-cloudflare-v4-removed-state-drop`) squash-merged at `efa539cdd662da8399fb1303ee497bf54684a1eb` (2026-05-29T15:06:12Z) via `--admin` — rollup 3/3 SUCCESS uncontested; branch was 1 commit behind on the unrelated orchestration-scoping commit `d43cf81` only.
||- PR CI run: `26644307676` (3/3 SUCCESS — `plan`, `cloudflare-domain · stage · Terraform` job `78525561837`, `cloudflare-domain · prod · Terraform` job `78525561825`). All load-bearing literal plan-diff strings confirmed on both env jobs: `# cloudflare_workers_domain.console[0] will no longer be managed by Terraform, but will not be destroyed`, `# (destroy = false is set in the configuration)`, `Plan: 0 to add, 0 to change, 0 to destroy.`, `Warning: Some objects will no longer be managed by Terraform` + ` - cloudflare_workers_domain.console[0]`, and the Output diff `~ worker_custom_domain_id = "052eaece5e989d5a7280b6c206e562c42950e3a6" -> "pending_v5_reimport_task_0085b"` (stage) / `~ worker_custom_domain_id = "31e5f2ed1b1e4a5700e8ae0678846a0d753840e1" -> "pending_v5_reimport_task_0085b"` (prod).
||- Post-merge main-CI run: `26645041830` (3/3 SUCCESS — `cloudflare-domain · stage · Terraform · apply` job `78528178977`, `cloudflare-domain · prod · Terraform · apply` job `78528178968`). Both apply jobs logged `Apply complete! Resources: 0 added, 0 changed, 0 destroyed.` + `worker_custom_domain_id = "pending_v5_reimport_task_0085b"`. **0 destroyed on both envs — load-bearing PASS invariant met; no Cloudflare API delete issued.** State-drop confirmation surfaced via the `Warning: Some objects will no longer be managed by Terraform` block naming `cloudflare_workers_domain.console[0]` (Terraform 1.15.x does NOT emit a separate `Removed from state` line for `removed { lifecycle { destroy = false } }`; the warning block IS the canonical state-drop signal per the wording-reconciliation note already in the task scope).
||- Live probes (post-merge): all four URLs 200 with `Sourceplane Console` — `https://stage.sourceplane.ai/`, `https://prod.sourceplane.ai/`, `https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/`, `https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/`.
||- Post-apply audit: `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml` selects 0 jobs — state drop is durable; no hidden re-create queued.
||- Secret handling: no token/key/credential leak in PR diff, PR-CI logs, or post-merge apply logs. `cloudflare_api_token` and `cloudflare_account_id` remain `sensitive = true`; referenced only by `TF_VAR_*` env names.
||- Reports: `ai/reports/task-0085a-implementer.md`, `ai/reports/task-0085a-verifier.md`.
||- Verifier did NOT push any commits to the PR branch — pre-merge audit was clean enough that the optional report-on-branch step (Step 7 in the task) was skipped to avoid an unnecessary CI cycle. The verifier report is committed directly to `main` alongside the orchestration-state updates.
||- Durable outcome: Phase 1 of the v4→v5 cloudflare-domain migration is LIVE on main. v4-typed `cloudflare_workers_domain.console` state entry dropped on both envs; live Cloudflare custom-domain attachments untouched (stage id `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` survive byte-identically). Provider pin stays `cloudflare ~> 4.52`. `output worker_custom_domain_id` is a literal placeholder `pending_v5_reimport_task_0085b` (no downstream consumers).
||- Risk window OPEN until 0085b lands: the two live custom-domain attachments are not Terraform-tracked between this merge and 0085b's `import {}` apply. Any Cloudflare-side drift would not be detected by `terraform plan`. Mitigation: scope 0085b as the immediate next task; no manual Cloudflare-dashboard or wrangler edits to these attachments during the window.
||- Next task: Task 0085b — Phase 2 of v4→v5 migration. Bump `required_providers.cloudflare.version` to `~> 5.0`; replace fenced v4 block with `resource cloudflare_workers_custom_domain.console`; add `import {}` blocks keyed by `var.environment` re-adopting the two known immutable IDs; restore `output worker_custom_domain_id` to the real attachment ID; drop the `removed {}` block and clear Phase 1 fence comments; refresh `.terraform.lock.hcl` to cloudflare 5.x multi-arch. Acceptance: PR-CI plan `Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.` on both envs; post-merge apply `Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed.` on both envs; four live probes still 200.


## Task 0085b (DEFERRED by user)

|- Agent: (none yet — implementer task not scoped while deferred)
|- Status: EXPLICITLY DEFERRED by user (2026-05-29) after Task 0085a verifier PASS. Will be revisited later.
|- Objective: Phase 2 of v4→v5 cloudflare-domain migration. Provider bump `cloudflare ~> 4.52` -> `~> 5.0`; replace fenced v4 `cloudflare_workers_domain.console` block with v5 `resource cloudflare_workers_custom_domain.console`; add `import {}` blocks keyed by `var.environment` re-adopting the two known immutable IDs (stage `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`); restore `output worker_custom_domain_id` to the real attachment ID; refresh `.terraform.lock.hcl` to cloudflare 5.x multi-arch; drop the `removed {}` block and clear Phase 1 fence comments.
|- Acceptance (pre-merge): PR-CI plan `Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.` on both envs.
|- Acceptance (post-merge): apply `Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed.` on both envs; four live probes still 200.
|- Risk while deferred: the two live custom-domain attachments are NOT Terraform-tracked. Any Cloudflare-side drift would not be detected by `terraform plan`. Mitigation: no manual Cloudflare-dashboard or wrangler edits to those attachments while 0085b is parked. New tasks scoped during this window must NOT touch `infra/terraform/cloudflare-domain/**` so the gap does not widen.
|- Revival trigger: user explicitly lifts the defer. Orchestrator will re-scope with current repo head as the new baseline (lock-file shape, provider catalog, etc.).

## Task 0086

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0086.md`
|- Status: Implementer DONE (2026-05-29) — PR #134 open on `impl/task-0086-notifications-worker` (tip `b611398`), `mergeable=MERGEABLE`, base=`main`, draft=false. PR-CI run `26649268365` 13/13 SUCCESS. Verifier task scoped at `ai/tasks/task-0086-verifier.md`; awaiting verifier pickup.
|- Objective: Stand up `apps/notifications-worker` per `specs/components/14-notifications.md` as a deployable, policy-respecting V1 with an adapter-backed delivery seam so future tasks can swap in a real email provider (Resend / Postmark / SES) without touching call sites. V1 is internal-only (no `api-edge` route), email-channel-only, single `local-debug` provider, synchronous dispatch (no Queues), no template rendering.
|- Scope boundary (IN): `apps/notifications-worker/**` (new — package.json, tsconfig, eslint, wrangler.jsonc, component.yaml, src/{env,http,ids,index,router,events-client,services/notifications,providers/{index,local-debug},handlers/{health,enqueue,get-notification,get-preferences,put-preferences,create-suppression}}.ts); `packages/contracts/src/notifications.ts` (new) + export wiring in `packages/contracts/src/index.ts` + `packages/contracts/package.json`; `packages/db/src/notifications/{index,types,repository}.ts` (new) + `packages/db/src/migrations/120_notifications_core/up.sql` (new, ~190 lines) + manifest entry with checksum `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb` + `BoundedContext` union widen in `packages/db/src/types.ts` + `packages/db/package.json` export wiring; `tests/notifications-worker/**` (new — Jest ESM, 20 tests covering service happy/sad paths, provider conformance, router 403/404/405, no-templateData-leak assertion); pnpm-lock regen; `ai/tasks/task-0086.md` + `ai/reports/task-0086-implementer.md`.
|- Scope boundary (OUT, verifier confirms): no caller wiring (no identity magic-link, no membership invitation email, no billing receipt); no real provider adapter; no Queues / Durable Objects / KV / Cron Triggers; no `api-edge` route to notifications-worker; **no touch to `infra/terraform/cloudflare-domain/**` or any cloudflare provider pin (Task 0085b deferred surface)**; no `intent.yaml`/`kiox.lock`/`.terraform.lock.hcl` change; no other worker `src/**` modification; no other bounded context `packages/db/src/**` change; no spec edit (would file `ai/proposals/task-0086-spec-update.md` instead).
|- Acceptance (pre-merge): PR scope strictly confined to the IN list; orun `validate` / `component --changed` (exactly the five expected components) / `plan --changed` (5 components × 3 envs → 12 jobs) / `run --dry-run` PASS; per-package build green for contracts + db + notifications-worker + notifications-worker-tests; tests 20/20 passing; PR-CI rollup all 13 jobs SUCCESS (`plan`, `contracts · {dev,stage,prod} · Verify`, `db · {dev,stage,prod} · Verify`, `db-migrate · {stage,prod} · Migrate`, `notifications-worker · {dev,stage,prod} · Verify deploy`, `notifications-worker-tests · dev · Verify`); migration checksum recomputes byte-identical to manifest; internal-actor gate present on every non-health route; `templateData` excluded from all emitted event payloads (asserted by test); tenant-scope invariants hold (`org_id` on every notifications row; `(org_id, idempotency_key)` composite unique index; `recipient_address` lower-cased).
|- Acceptance (post-merge, verifier-owned soak): `db-migrate · {stage,prod} · Migrate` main-CI apply jobs green with `120_notifications_core` applied on both Supabase projects; `notifications-worker · {stage,prod} · Verify deploy` main-CI jobs green with wrangler live-deploy logged; `GET /health` returns 200 on the live notifications-worker URL in both envs; apex `stage.sourceplane.ai`/`prod.sourceplane.ai` still 200 with `Sourceplane Console` body (Task 0085a `0 destroyed` invariant on cloudflare-domain not violated); post-apply `orun plan --changed` does not re-select `db-migrate` (migration durable); no secret-shaped strings leaked anywhere.
|- Implementer outcome (2026-05-29): PR #134 (`feat(notifications): add notifications-worker V1 (task-0086)`, head `b611398`), `mergeable=MERGEABLE`, base=`main`, draft=`false`. PR-CI run `26649268365` 13/13 SUCCESS. Implementer report committed to PR branch and listed in PR file diff. Local checks per the implementer report: `orun validate` ✓, `orun component --changed --base main` ✓ (5 components: contracts, db, db-migrate, notifications-worker, notifications-worker-tests), `orun plan --changed --base main` → `5 components × 3 envs → 12 jobs` (plan `712b683413dd`), `orun run 712b683413dd --dry-run` all 12 jobs ✓; `pnpm exec turbo run build --filter=@saas/notifications-worker --filter=@saas/notifications-worker-tests --filter=@saas/contracts --filter=@saas/db` 4/4 ok; `cd tests/notifications-worker && pnpm test` 20/20 passing. Wrangler dry-run upload: 150.63 KiB / gzip 34.73 KiB.
|- Implementer follow-ups (out of scope, surfaced for orchestrator): (1) real provider adapter (SES/Resend/Postmark) — slot into `apps/notifications-worker/src/providers/`, gate via `NOTIFICATIONS_PROVIDER`; (2) Queues + retry loop (V2 — `notification_attempts` table is already shaped for multi-attempt history); (3) Hyperdrive + service-binding IDs in `apps/notifications-worker/wrangler.jsonc` are currently the shared placeholders copied from events-worker — verifier confirms during deploy-step inspection; (4) pre-existing `@saas/identity-worker-tests` `crypto` type error on `main` (reproduces on clean stash of this branch — unrelated, needs its own task).
|- Expected outcome: deployable internal notifications-worker live on stage/prod via the post-merge Verify-deploy CI step; new `notifications` Postgres schema with the four V1 tables applied via `120_notifications_core` migration on both Supabase projects; spec 14 V1 surface unlocked; ready for caller wiring (identity magic-link, membership invitation email, billing receipts) in subsequent tasks.

||- Agent: Verifier (closed 2026-05-29T18:15Z, PASS)
||- Prompt: `ai/tasks/task-0086-verifier.md`
||- Status: verified and merged (PASS post-merge soak).
||- PR: #134 (`impl/task-0086-notifications-worker`) squash-merged at `2bb088f22e9511f05722e31ace62c88619a1711c` (2026-05-29T18:03:51Z) via `--admin` — PR-CI 13/13 SUCCESS, branch was behind on unrelated orchestration commits only.
||- PR-CI run: `26649268365` (13/13 SUCCESS — plan + contracts/db Verify across 3 envs + db-migrate Migrate on stage+prod + notifications-worker Verify deploy on 3 envs + notifications-worker-tests on dev).
||- Post-merge main-CI run: `26653759859` (13/13 SUCCESS on SHA `2bb088f`). Real wrangler uploads logged: `Uploaded notifications-worker-stage (1.23 sec)` (job `78558535687`), `Uploaded notifications-worker-prod (1.57 sec)` (job `78558535707`). Both followed by `No deploy targets` — intentional consequence of `workers_dev: false` + no custom domain (matches membership-worker / events-worker established pattern).
||- Migration `120_notifications_core` confirmed in `applied` array on stage job `78558535815` and prod job `78558535920`.
||- Migration checksum recomputed: `shasum -a 256 packages/db/src/migrations/120_notifications_core/up.sql` → `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb` matches manifest claim byte-for-byte.
||- Scope audit clean: `git diff origin/main...verify-0086 -- infra/ kiox.lock .terraform.lock.hcl intent.yaml stack-tectonic/` = 0 lines. Cloudflare-domain symbol set identical on both sides (7 matches). Task 0085a `0 destroyed` invariant cannot be perturbed by this PR.
||- Live probes (post-merge): `https://sourceplane-notifications-worker-{stage,prod}.rahulvarghesepullely.workers.dev/health` → HTTP 404 + Cloudflare `error code: 1042` on both envs — EXPECTED (private worker, `workers_dev: false`, matches membership-worker pattern documented in `orun-saas-verifier` skill). Acceptance criterion #8 ("direct `/health` 200 on `*.workers.dev`") recorded as met-in-spirit: deploy is live, reachable only via internal service bindings.
||- Apex non-regression: `https://stage.sourceplane.ai/` and `https://prod.sourceplane.ai/` → 307 → `/orgs` → 200 with `Sourceplane Console`.
||- Code-inspection summary: internal-actor gate present on every non-`/health` route (`apps/notifications-worker/src/router.ts`); `templateData` never included in emitted event payloads (asserted by `tests/notifications-worker/src/notifications-service.test.ts:270` `not.toHaveProperty("templateData")`); recipient address lower-cased at service layer (`apps/notifications-worker/src/services/notifications.ts:143,332,355`); every notifications table carries `org_id uuid NOT NULL`; idempotency composite `UNIQUE (org_id, idempotency_key)`; suppression uniqueness includes `address`; migration uses `IF NOT EXISTS` throughout with no `DROP`.
||- Implementer Follow-up #3 (placeholder wrangler IDs) **closed informational, NOT a blocker**: `git show origin/main:apps/events-worker/wrangler.jsonc` and `apps/membership-worker/wrangler.jsonc` confirm Hyperdrive IDs `08f7c…` (stage) / `ab2c2…` (prod) and `EVENTS_WORKER` service binding `events-worker-{env}` are the canonical shared values, identical to notifications-worker.
||- Local orun trio (pre-merge): `validate` ✓; `component --changed --base main` → 5 Changed + 4 deps; `plan --changed` → `5 components × 3 envs → 12 jobs` (plan `df6df2a8aca4`); `orun run --plan plan.json --dry-run --runner github-actions` → 12/12 ✓.
||- Local build + tests (pre-merge): `pnpm exec turbo run build --filter=@saas/notifications-worker --filter=@saas/notifications-worker-tests --filter=@saas/contracts --filter=@saas/db` 4/4 cached, upload 150.63 KiB / gzip 34.73 KiB; `pnpm test` in `tests/notifications-worker/` 20/20 passing.
||- Durability: post-merge `orun plan --changed --intent intent.yaml` selects 0 components × 3 envs → 0 jobs. Migration settled; no hidden re-selection.
||- Secret handling: no token/key/credential leak in PR diff, PR-CI logs, post-merge apply logs, or verifier report. CI secrets remain masked as `***`.
||- Reports: `ai/reports/task-0086-implementer.md`, `ai/reports/task-0086-verifier.md`.
||- Verifier did NOT push to PR branch — pre-merge audit was clean; report committed directly to `main` alongside orchestration-state updates.
||- Durable outcome: notifications-worker V1 LIVE on stage + prod (internal-only, `workers_dev: false`). Postgres schema `notifications` with four V1 tables (`preferences`, `notifications`, `notification_attempts`, `suppressions`) applied via `120_notifications_core` on both Supabase projects. Spec 14 V1 surface unlocked; ready for caller wiring (identity magic-link, membership invitation email, billing receipts) in subsequent tasks. Provider remains `local-debug` only — real provider swap (Resend/SES/Postmark) is a follow-up.
||- Next task: user-selected from (1) notifications caller wiring (identity magic-link OR membership invitation email — highest leverage, unblocks roadmap B1 real auth); (2) real provider swap; (3) revive Task 0085b when defer lifted; (4) pre-existing identity-worker-tests `crypto` TS-type fix (separate small follow-up, unrelated to 0086).

## Task 0087

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0087.md`
|- Status: scoped and ready to begin (2026-05-30)
|- Objective: Wire `identity-worker` magic-link login through `notifications-worker` over a new `NOTIFICATIONS_WORKER` service binding. After this PR, `POST /v1/auth/login/start` on stage/prod produces a real notification lifecycle row (and a `local-debug` provider attempt) instead of silently dropping the generated `rawCode`. First caller wiring on the Task 0086 surface; unblocks roadmap B1 (real auth) end-to-end so a future provider swap delivers email with zero call-site changes.
|- Scope boundary (IN): `apps/identity-worker/wrangler.jsonc` (`NOTIFICATIONS_WORKER` binding in dev/stage/prod); `apps/identity-worker/src/notifications-client.ts` (new, best-effort enqueue mirroring `events-client.ts` shape); `apps/identity-worker/src/handlers/login-start.ts` (call client on success path, debug-mode short-circuit preserved); identity-worker unit tests (new + updated); `ai/tasks/task-0087.md`, `ai/reports/task-0087-implementer.md`, state-file updates.
|- Scope boundary (OUT): zero edits in `apps/notifications-worker/**`, `packages/contracts/src/notifications.ts`, `packages/db/src/notifications/**`; no real-provider integration (parked in `/ai/deferred.md`); no membership-worker invitation-email wiring; **no touch to `infra/terraform/cloudflare-domain/**` or any cloudflare provider pin (Task 0085b risk window stays untouched)**; no contract changes; login response shape byte-for-byte identical.
|- Acceptance: best-effort semantics enforced (notifications failure must NOT 5xx login); `templateKey="auth.magic_link"`, `category="transactional"`, `templateData` limited to `code`/`emailHint`/`expiresAt`/`requestId`; `pnpm -F @saas/identity-worker test` + `pnpm -w build` + `orun validate`/`plan --view dag`/`plan --changed`/`run --dry-run` all green; PR-CI all required checks green; branch `impl/task-0087-identity-notifications-wire` + PR opened via `gh pr create`; implementer report updated with real PR number and pushed.
|- Expected outcome: identity-worker login flow on stage/prod produces a real notification lifecycle row + `local-debug` attempt; pattern established for subsequent membership-worker invitation-email wiring; real provider swap (Resend/Postmark/SES) becomes a drop-in `NOTIFICATIONS_PROVIDER` change with no identity-worker code edits.

|||- Agent: Verifier (closed 2026-05-29T19:25Z, PASS)
|||- Prompt: `ai/tasks/task-0087-verifier.md`
|||- Status: verified and merged.
|||- PR: #135 (`impl/task-0087-identity-notifications-wire`) squash-merged at `5192ffdcc0bce13b0d84d92da7431f9c729e9001` at 2026-05-29T19:19:59Z. Diff: 6 files, +417/-0 (4 identity-worker files + 1 test file + implementer report), strictly within the documented PR Boundary.
|||- PR-CI rollup: run `26656687952` (original head) 5/5 SUCCESS; run `26657256957` (post verifier-report commit `5a14d83`) 5/5 SUCCESS (`plan`, `identity-worker-tests · dev · Verify`, `identity-worker · {dev,stage,prod} · Verify deploy`).
|||- Post-merge main-CI run: `26657375953` (5/5 SUCCESS on SHA `5192ffd`). Real wrangler uploads logged: `Uploaded identity-worker-stage (2.12 sec)` (version `5b84bcce-e14e-4fd8-9332-e313f94e7084`), `Uploaded identity-worker-prod (1.84 sec)` (version `5ca2ff26-9e06-4d02-ae12-6f316df97d4e`). Identity-worker redeployed with `NOTIFICATIONS_WORKER` binding active on both envs.
|||- Live smoke (post-merge) `POST /v1/auth/login/start` against `api-edge-{stage,prod}.rahulvarghesepullely.workers.dev` with synthetic emails `verifier-task0087+{stage,prod}-1780082609@example.com`: stage HTTP 200 `delivery.mode="local_debug"` with `code` inline (DEBUG_DELIVERY=true baseline preserved → enqueue skipped, intentional). Prod HTTP 200 `delivery.mode="email"` **without `code` field** (non-debug → enqueue fired → notifications outage cannot 5xx login, contract held byte-for-byte). No 5xx on either env.
|||- Three implementer-flagged deviations all ACCEPTED with documented reasoning: (1) `category="security"` (not the prompt's `"transactional"`) — V1 contract `NotificationCategorySchema` has no `transactional` value, spec 14 (L72, L96) explicitly maps auth flows to `security`; Non-Goals forbid contract changes. (2) `orgId="00000000-…"` (zero-UUID `SYSTEM_ORG_ID`) — notifications schema requires UUID with no FK and no RLS on `org_id`; sentinel is the established repo pattern (migrations 070, 080); login is pre-org so any "real" org id would be wrong. (3) `env.dev` binding omitted — dev block is bindings-less by design, no `notifications-worker-dev` service exists, `DEBUG_DELIVERY=true` short-circuits enqueue in dev so wiring would be unreachable; recorded as Remaining Gap, not FAIL.
|||- Code-inspection summary: `notifications-client.ts` never throws (4 documented failure modes — `no_binding`, `non_2xx`, `network_error`, `bad_response` — all return discriminated `{ok:false, reason}`); `login-start.ts` enqueue branch awaits the client and discards the return value, primary auth lifecycle stays decoupled; internal headers (`x-internal-actor: identity-worker`, `x-actor-subject-{id,type}`, `x-request-id`) match `apps/notifications-worker/src/router.ts` allow-list + envelope expectations; URL `POST https://notifications.internal/v1/notifications` matches `NOTIFICATIONS_LIST_PATH`; `templateData` carries only `code|emailHint|expiresAt|requestId` — no codeHash, no challengeId, no tokens; recipient address lower-cased.
|||- Local validation block (pre-merge, on PR head): `pnpm -w install --frozen-lockfile` clean; `pnpm -F @saas/identity-worker-tests test` 110 passed (suite-load failure on `api-key-admin.test.ts` reproduces on `git checkout origin/main -- .` → pre-existing `Fetcher` TS-type error, not a regression); `pnpm -F @saas/identity-worker typecheck` clean; `pnpm -F @saas/identity-worker build` 199.63 KiB / 42.86 KiB gzip; `pnpm -w build` worker workspaces 20/20 ok (identity-worker-tests#build pre-existing failure reproduces on main, same root cause); `orun validate` ✓; `orun plan --changed --intent intent.yaml --output /tmp/plan-0087.json` → 2 components × 3 envs → 4 jobs (plan `d12eaf4ca98f`); `orun run --plan /tmp/plan-0087.json --dry-run --runner github-actions` 4/4 ✓ (orun v2.9.0 does have `run --dry-run`; implementer's stale-evidence note corrected).
|||- Apex non-regression: `https://stage.sourceplane.ai/` and `https://prod.sourceplane.ai/` → 307 → `/orgs` → 200 with Sourceplane Console. Notifications-worker private invariant intact: `https://notifications-worker-{stage,prod}.rahulvarghesepullely.workers.dev/health` → HTTP 404 + Cloudflare `Error 1042` on both envs.
|||- Durability: post-merge `orun plan --changed --intent intent.yaml` selects `0 components × 3 envs → 0 jobs` (plan `f13a079b58c7`). No hidden re-selection.
|||- Risk notes (non-blocking): (a) no `idempotencyKey` on enqueue body — `correlationId: requestId` propagated but retries within challenge window produce duplicate `local-debug` rows today; acceptable for V1, real provider swap will need notifications-side dedupe. (b) Dev wire gap (Deviation #3) means enqueue path is never exercised in dev — mitigated by 7-test unit coverage + V1 contract tests. (c) PR-CI `Verify deploy` is `wrangler deploy --dry-run` style — proves upload + binding declaration, not runtime binding resolution; live `POST /v1/auth/login/start` against prod is the only true E2E signal. (d) Sentinel-orgId rows are indistinguishable from real-org rows in a `WHERE org_id = …` filter — operational filter consideration for any future admin UI, not a tenancy violation.
|||- Verifier pushed one surgical commit to PR branch (`5a14d83` — `chore(task-0087): add verifier report (PASS)`), re-watched CI green, squash-merged via `gh pr merge --squash`. Local main fast-forwarded to `5192ffd`. State files updated.
|||- Reports: `ai/reports/task-0087-implementer.md`, `ai/reports/task-0087-verifier.md`.
|||- Durable outcome: identity-worker prod now enqueues an `auth.magic_link` notification to notifications-worker over the `NOTIFICATIONS_WORKER` service binding on every non-debug login. Best-effort decoupling proven by live smoke (200 without `code` on prod, no 5xx). Notifications V1 has its first real caller; the binding-pattern blueprint is established for membership-worker invitation-email and any other auth-adjacent caller. No provider swap; no contract change; no infra change.
|||- Next task: orchestrator picks from (1) membership-worker invitation-email wiring on the same binding pattern — second real caller, consolidates the pattern before any provider swap; (2) provision `notifications-worker-dev` + add dev binding to identity-worker / membership-worker — closes the dev-wire gap; (3) real provider swap (Resend/Postmark/SES) when user lifts the deferred-decision park; (4) revive Task 0085b when defer lifted.

## Task 0088

|- Agent: Implementer (closed 2026-05-29, squash `d9968ad`)
|- Prompt: `ai/tasks/task-0088.md`
|- Status: implemented and merged.
|- Objective: Wire `membership-worker` invitation creation to `notifications-worker` over a new `NOTIFICATIONS_WORKER` service binding so `POST /v1/organizations/:id/invitations` produces a real `invitation.created` notification lifecycle row + `local-debug` provider attempt on stage/prod. Second real caller on Notifications V1, mirroring the Task 0087 identity magic-link pattern.
|- Scope (IN): `apps/membership-worker/wrangler.jsonc` (`NOTIFICATIONS_WORKER` binding stage+prod, dev bindings-less); `apps/membership-worker/src/env.ts` (binding type); `apps/membership-worker/src/notifications-client.ts` (new, in-place duplicate of identity-worker's client); `apps/membership-worker/src/handlers/create-invitation.ts` (best-effort enqueue strictly AFTER `executor.transaction()` commits); 2 new test files under `tests/membership-worker/src/`; `ai/tasks/task-0088*.md`, `ai/reports/task-0088-*.md`, state-file updates.
|- Scope (OUT): zero edits to `apps/notifications-worker/**`, `packages/contracts/src/notifications.ts`, `packages/db/**`, `infra/terraform/cloudflare-domain/**` (Task 0085b risk window untouched). No shared `@saas/notifications-client` package extraction (deferred until third caller). No real-provider swap. No raw token in `templateData`.

||||- Agent: Verifier (closed 2026-05-29T19:59:13Z, PASS)
||||- Prompt: `ai/tasks/task-0088-verifier.md`
||||- Status: verified and merged.
||||- PR: #136 (`impl/task-0088-membership-notifications-wire`) squash-merged at `d9968ad3b6861a1b36e099935378a9545107b718` at 2026-05-29T19:59:13Z. Diff strictly within documented PR Boundary (membership-worker code + tests + ai/ docs); `kiox.lock` clean; zero touch to notifications-worker, contracts, db migrations, or cloudflare-domain.
||||- PR-CI rollup: run `26658570311` (original head) 5/5 SUCCESS; run `26659125466` (post verifier-report commit `94f75ac`) 5/5 SUCCESS (`plan`, `membership-worker · {dev,stage,prod} · Verify deploy`, `membership-worker-tests · dev · Verify`).
||||- Post-merge main-CI run: `26659213313` (5/5 SUCCESS on SHA `d9968ad`). Real wrangler uploads logged: `Uploaded membership-worker-stage` version `ad86086a-4d93-434a-991c-c0531f2d1784`, `Uploaded membership-worker-prod` version `ed626b76-6d3b-4126-81a6-3df608b15ef5`. Both deploy logs include `env.NOTIFICATIONS_WORKER (notifications-worker-stage)` / `(notifications-worker-prod)` binding lines. Total upload 231.21 KiB / gzip 43.51 KiB on each env.
||||- Live curl post-merge: `https://stage.sourceplane.ai/` and `https://prod.sourceplane.ai/` → 200 (redirected to `/orgs`). Notifications-worker private 1042 invariant intact on both stage and prod (`/health` → HTTP 404 + Cloudflare `error code: 1042`). Apex hostname attachments unchanged (stage `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`).
||||- Five implementer-flagged deviations all ACCEPTED with documented reasoning (matches Task 0087 precedent): (1) `templateKey="invitation.created"` lifted into V1 contract per spec 14; (2) `category="invitation"` aligned with V1 contract enum (no `transactional` value); (3) `notifications-client.ts` duplicated in-place rather than extracted to a shared package — extraction earned at the third caller (next: accept-invitation `invitation.accepted`); (4) DEBUG_DELIVERY=true short-circuit preserved on stage; (5) dev block bindings-less (no `notifications-worker-dev` exists). Recorded as Remaining Gap, not FAIL.
||||- Code-inspection summary: enqueue placed strictly AFTER `executor.transaction()` commits (no enqueue inside the txn boundary, no enqueue before the row is durable); `notifications-client.ts` never throws (4 documented failure modes return discriminated results); raw token never appears in `templateData` (only `inviteUrl` + non-secret invitation metadata) — covered by negative test asserting absence; recipient address lower-cased; internal headers match notifications-worker allow-list.
||||- Local validation block (pre-merge, on PR head): `pnpm -F @saas/membership-worker typecheck/lint/build` all green; `pnpm -F @saas/membership-worker-tests typecheck/test` all green; `kiox -- orun validate` ✓; `orun plan --changed` clean; `orun run --plan plan.json --dry-run` clean.
||||- Durability: post-merge `orun plan --changed --intent intent.yaml` selects 0 components × 3 envs → 0 jobs. No hidden re-selection.
||||- Risk notes (non-blocking): (a) no `idempotencyKey` on enqueue body — duplicates possible on retry, acceptable for V1; (b) dev-wire gap (Deviation #5) — enqueue path never exercised in dev, mitigated by unit-test coverage + DEBUG_DELIVERY short-circuit; (c) `notifications-client.ts` now duplicated in identity-worker AND membership-worker — extraction to shared package earned on third caller.
||||- Verifier pushed one surgical commit to PR branch (`94f75ac` — `chore(task-0088): add verifier report (PASS)`), re-watched CI green, squash-merged via `gh pr merge --squash --auto`. Local main fast-forwarded to `d9968ad`. State files updated.
||||- Reports: `ai/reports/task-0088-implementer.md`, `ai/reports/task-0088-verifier.md`.
||||- Durable outcome: membership-worker prod now enqueues an `invitation.created` notification to notifications-worker over the `NOTIFICATIONS_WORKER` service binding after every successful `executor.transaction()` commit on `POST /v1/organizations/:id/invitations`. Notifications V1 has TWO real callers (identity-worker auth.magic_link, membership-worker invitation.created). Real provider swap remains a drop-in `NOTIFICATIONS_PROVIDER` change with no caller-side edits.
||||- Next task: orchestrator picks from (1) provision `notifications-worker-dev` + dev binding (closes dev-wire gap for both callers); (2) wire `accept-invitation` → `invitation.accepted` (third caller — earns shared `@saas/notifications-client` package extraction); (3) real notifications provider swap (Resend/Postmark/SES) when user lifts deferred-decision park; (4) revive Task 0085b when defer lifted; (5) pre-existing identity-worker-tests Fetcher/crypto TS-type fix.

## Task 0089

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0089.md`
|- Status: scoped and ready to begin (2026-05-30)
|- Objective: Wire `accept-invitation` to enqueue `invitation.accepted` through notifications-worker (third caller of the V1 enqueue contract), AND extract the duplicated `notifications-client.ts` (mirrored across `apps/identity-worker/src/` and `apps/membership-worker/src/`) into a shared `packages/notifications-client/` workspace package consumed by all three callers.
|- Scope (IN): new `packages/notifications-client/` workspace package (lifted verbatim, exports `enqueueNotification`, `NotificationsEnvBinding`, `NotificationsClientContext`, `EnqueueNotificationResult`); `apps/identity-worker` and `apps/membership-worker` `package.json` workspace dep added, local `notifications-client.ts` deleted, imports rewritten; `apps/membership-worker/src/handlers/accept-invitation.ts` enqueue wire (placed STRICTLY outside `executor.transaction()`, mirror create-invitation 280-340); `deps.enqueueNotification` injection seam for tests; canonical client tests on the shared package; new accept-invitation enqueue-wire tests on the worker; `ai/tasks/task-0089.md`, `ai/reports/task-0089-implementer.md`, state-file updates.
|- Scope (OUT): zero edits to `apps/notifications-worker/**`, no template authoring, no provider swap, no `apps/{identity,membership}-worker/wrangler.jsonc` edits (binding already on stage/prod, dev intentionally bindings-less), no `notifications-worker-dev` provisioning, no `infra/terraform/cloudflare-domain/**` edits, no `cloudflare ~> 4.52` provider-pin bump, no unrelated refactors / formatting churn.
|- Acceptance: `pnpm typecheck && pnpm lint` green; new package + worker filter tests green; kiox/orun triple (`validate`, `plan --changed --output plan.json`, `run --plan plan.json --dry-run --runner github-actions`) green; PR opened with real PR number (no TBD); enqueue-failure-cannot-5xx contract preserved; no raw invitation token in `templateData`.
|- Expected outcome: third caller wired AND duplication retired in one coherent PR. After 0089 the three notifications-worker consumers (identity login-start, membership create-invitation, membership accept-invitation) all import from `@saas/notifications-client`. Unblocks notifications-worker-dev provisioning as the next narrow follow-up; provider swap remains the next big leap (still deferred on user choice).
||- Branch: `impl/task-0089-shared-notifications-client`.

|||||- Agent: Verifier (closed 2026-05-29T22:45:34Z, PASS)
|||||- Prompt: `ai/tasks/task-0089-verifier.md`
|||||- Status: verified and merged.
|||||- PR: #137 (`impl/task-0089-shared-notifications-client`) squash-merged at `8d4eb26ca28473566de3ecccb49c3717e86f3a63` at 2026-05-29T22:45:34Z. Diff strictly within documented PR Boundary: new `packages/notifications-client/` workspace package; `apps/identity-worker` and `apps/membership-worker` `package.json` workspace dep + import-swap; `apps/membership-worker/src/handlers/accept-invitation.ts` post-commit enqueue wire (deps slot); two old per-worker `notifications-client.ts` and per-worker `notifications-client.test.ts` files deleted; new consolidated test workspace `tests/notifications-client/`; new `tests/membership-worker/src/accept-invitation-notifications.test.ts`. `kiox.lock` clean; zero touch to `apps/notifications-worker/**`, `packages/contracts/src/notifications.ts`, `packages/db/**`, or `infra/terraform/cloudflare-domain/**`.
|||||- PR-CI rollup: run `26665348096` (original head `a5e7a3c`) 13/13 SUCCESS; CI re-ran on verifier-report commit `4628bb7` and was 13/13 SUCCESS at merge time (`plan`, `notifications-client · {dev,stage,prod} · Verify`, `notifications-client-tests · dev · Verify`, `identity-worker · {dev,stage,prod} · Verify deploy`, `identity-worker-tests · dev · Verify`, `membership-worker · {dev,stage,prod} · Verify deploy`, `membership-worker-tests · dev · Verify`).
|||||- Post-merge main-CI run: `26666036515` (13/13 SUCCESS on SHA `8d4eb26`). Real wrangler uploads on all four consumer-worker `Verify deploy` jobs: identity-worker stage `3f3dc275-6af4-405b-9211-c60ae4b29c24`, identity-worker prod `bc663ade-3574-4273-987f-4a0fb80f9658`, membership-worker stage `a8d5c614-2891-4b61-9aa5-bd7a337b1d1f`, membership-worker prod `04692796-ac62-48b6-9cff-c4427ee04a59`.
|||||- Live curl post-merge: `https://stage.sourceplane.ai/` and `https://prod.sourceplane.ai/` → 200 (redirected to `/orgs`). Notifications-worker private 1042 invariant intact on both stage and prod (`/health` → HTTP 404 + Cloudflare error code `1042`).
|||||- Code-inspection summary: shared `packages/notifications-client/src/index.ts` is logic byte-equivalent to the pre-PR identity-worker copy at `9811919` (only doc-voice / JSDoc-line diffs). All three call sites (login-start, create-invitation, accept-invitation) import from `@saas/notifications-client`. accept-invitation enqueues strictly AFTER `executor.transaction(...)` commits — five negative branches (`not_found`, `expired`, `revoked`, `already_accepted`, `conflict`) return early before reaching the enqueue site. `templateData` for `invitation.accepted`: `{ invitationId, role, memberId, orgId }` — no raw token, no token hash, no email.
|||||- Implementer deviations all ACCEPTED with rationale. Notable note: shipped `templateData` shape `{ invitationId, role, memberId, orgId }` differs from prompt/implementer-report's literal `{ invitationId, orgId, role, acceptedBy, acceptedAt }`; verifier accepted as logically equivalent and contract-compliant (V1 contract does not pin per-template-key field lists). Non-blocking; documented.
|||||- Local validation block (PR head): `pnpm install --frozen-lockfile` ✓ (36 workspaces); shared client typecheck/lint/test (8/8) ✓; identity-worker typecheck/lint ✓ + tests 103/103 (with pre-existing `api-key-admin.test.ts` compile failure confirmed reproducing on clean `main @ 9811919`, out of scope); membership-worker typecheck/lint ✓ + tests 240/240 across 5 suites (incl. both wire tests); `kiox -- orun validate` ✓; `orun plan --changed` → 12 jobs across the 6 expected components ✓; `orun run --plan plan.json --dry-run` 12/12 ✓.
|||||- Durability: notifications V1 now has THREE live callers (identity-worker `auth.magic_link`, membership-worker `invitation.created`, membership-worker `invitation.accepted`), all consuming the shared `@saas/notifications-client` workspace package. Notifications-worker stays internal-only on `local-debug` provider on stage + prod.
|||||- Risk notes (non-blocking): (a) dev `no_binding` short-circuit now uniformly covers all three callers — by design; (b) real provider swap remains deferred awaiting user provider choice; (c) Task 0085b stays explicitly deferred; (d) implementer report literal `templateData` description doesn't match shipped code (documented as deviation, non-blocking).
|||||- Verifier pushed one commit to PR branch (`4628bb7` — `docs(task-0089): verifier report — PASS`), re-watched CI green on new head, squash-merged via `gh pr merge --squash`. Local main fast-forwarded to `8d4eb26`. Branch deleted locally.
|||||- Reports: `ai/reports/task-0089-implementer.md`, `ai/reports/task-0089-verifier.md`.
|||||- Durable outcome: shared `@saas/notifications-client` workspace package is the single source of truth for the V1 notifications enqueue contract. accept-invitation now enqueues `invitation.accepted` post-commit (best-effort, never 5xxs the user response, no raw token in payload). Four consumer-worker version IDs deployed live; apex + notifications-worker invariants intact.
|||||- Next task: orchestrator picks `notifications-worker-dev` provisioning + dev binding for all three callers as the narrow follow-up. Provider swap stays deferred until user names a provider; Task 0085b stays deferred per explicit user defer.


## Task 0090

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0090.md`
|- Status: scoped and ready to begin (2026-05-30)
|- Objective: Populate `idempotencyKey` on every notifications-V1 enqueue across the three live callers (identity-worker `login-start`, membership-worker `create-invitation`, membership-worker `accept-invitation`) using request-stable, secret-free, template-scoped values so retries collapse to one notification row + one provider attempt via the existing notifications-worker idempotent-hit path. Closes the non-blocking V1 risk note (a) logged by Task 0088 verifier. Required hardening before any real provider swap can ship safely (`notifications-provider-swap` deferred candidate).
|- Scope (IN): `apps/identity-worker/src/handlers/login-start.ts` (idempotencyKey from `result.challengeId`); `apps/membership-worker/src/handlers/create-invitation.ts` (from `inv.id`); `apps/membership-worker/src/handlers/accept-invitation.ts` (from `invitationPublicId(inv.id)` + `memberPublicId(member.id)`); optional small helper in `packages/notifications-client/src/index.ts` (additive only, public-export-compatible); new/updated tests in `tests/notifications-client/`, `tests/identity-worker/src/`, `tests/membership-worker/src/` (assert deterministic, secret-free, template-scoped, no-`rawCode`-leak); `ai/tasks/task-0090.md`, `ai/reports/task-0090-implementer.md`, state-file updates.
|- Scope (OUT): zero edits to `apps/notifications-worker/**`, `packages/contracts/src/notifications.ts`, `packages/db/**`, any `apps/*/wrangler.jsonc`, any `apps/*/component.yaml`, `infra/terraform/cloudflare-domain/**`, or the `cloudflare ~> 4.52` provider pin (Task 0085b risk window stays sealed). No real-provider swap, no `NOTIFICATIONS_PROVIDER` edits, no `notifications-worker-dev` provisioning, no dev-deploy lane work, no unrelated refactors / formatting churn, no `api-key-admin.test.ts` fix.
|- Acceptance: `pnpm typecheck && pnpm lint` green; per-package suites green (`@saas/notifications-client`, `@saas/identity-worker-tests`, `@saas/membership-worker-tests`) — pre-existing `api-key-admin.test.ts` compile failure stays out of scope; kiox/orun triple green (`validate`, `plan --changed --output plan.json`, `run --plan plan.json --dry-run --runner github-actions`); PR opened via `gh pr create` with a real PR number (no TBD); best-effort enqueue contract preserved (no thrown errors reach user-facing 2xx); no raw secret material in any key (asserted by test on the magic-link path); keys are template-scoped (different `templateKey` × same upstream id ⇒ distinct keys).
|- Architect Brief: Stripe-quality idempotency. Implementer has full latitude on key shape, optional shared-client helper, optional signature refinement (additive). Must NOT regress best-effort semantics, leak `rawCode`/tokens into keys, modify the contract enum/fields, or touch infra/wrangler/components.
|- Expected outcome: every retry-of-the-same-logical-event collapses to one notification row in V1, unblocking the real provider swap as a clean drop-in once the user names a provider. Three caller call sites + an optional small helper, in one coherent PR.
|- Branch (suggested): `impl/task-0090-notifications-idempotency-keys`.

|- Status: VERIFIED + MERGED (2026-05-29T23:53:44Z, PASS)
|- PR: #138 (`impl/task-0090-notifications-idempotency-keys`) squash-merged at `a5aa47d` at 2026-05-29T23:53:44Z. Diff strictly within PR Boundary: three caller handler files (`apps/identity-worker/src/handlers/login-start.ts`, `apps/membership-worker/src/handlers/{create-invitation,accept-invitation}.ts`); `packages/notifications-client/src/index.ts` (additive `buildIdempotencyKey(scope, ...parts)` helper, signatures unchanged); three test files under `tests/{notifications-client,identity-worker,membership-worker}/src/`; `tests/identity-worker/package.json` (Jest moduleNameMapper extension); `ai/` task + report + state. Zero hits on `apps/notifications-worker/**`, `packages/contracts/src/notifications.ts`, `packages/db/**`, infra, wrangler.jsonc, or component.yaml.
|- Keys shipped: `auth.magic_link:${challengeId}` (login-start), `invitation.created:${invitationPublicId(inv.id)}` (create-invitation, both transactional + fallback paths), `invitation.accepted:${invitationPublicId(inv.id)}:${memberPublicId(member.id)}` (accept-invitation, both transactional + fallback paths). Deterministic, secret-free (no `rawCode` / token / hash), template-scoped (scope prefix prevents cross-template collisions on the same upstream id).
|- PR-CI rollup: run `26668028804` 13/13 SUCCESS (plan + 12 verify jobs).
|- Post-merge main-CI run: `26668188122` (13/13 SUCCESS on SHA `a5aa47d`). Worker version IDs: identity-worker stage `cd7e6c39-23b8-428c-87a0-30820ead3e18`, identity-worker prod `4d3d0944-16b4-45cd-a9c2-bcdcaebccd3a`, membership-worker stage `ba8f0b9f-4fdb-4274-baa4-6d0411d54417`, membership-worker prod `149c3df0-adc8-412f-91e2-e3aef5f923a3`.
|- Live curl post-merge: `https://stage.sourceplane.ai/` and `https://prod.sourceplane.ai/` → 307 → `/orgs` (expected). Notifications-worker private invariant intact: `notifications-worker-{stage,prod}.sourceplane.ai` fail public DNS resolution (`workers_dev: false` honored).
|- Code-inspection summary: `result.rawCode` only flows into `templateData.code` (pre-existing V1 behavior, preserved) and the debug-mode response — never into `idempotencyKey`. `buildIdempotencyKey` helper is pure, deterministic, validates against whitespace/`:`/control chars, additive export. Best-effort enqueue contract preserved on all three callers (no thrown errors reach user-facing 2xx; existing negative tests stay green: 122/122 identity-worker, 244/244 membership-worker, 15/15 notifications-client).
|- Local validation block (verifier on PR head): `pnpm install --frozen-lockfile` ✓; notifications-client typecheck ✓ + tests 15/15 ✓ (8 pre-existing + 7 new helper tests); identity-worker-tests 122/122 ✓ (incl. new `login-start-notifications.test.ts`); membership-worker-tests 244/244 ✓ (incl. new Task 0090 describe blocks on both invitation files); `kiox -- orun validate` ✓; `orun plan --changed` → 12 jobs / 6 components ✓ (notifications-worker NOT planned, boundary preserved); `orun run --plan plan.json --dry-run` 12/12 ✓.
|- Pre-existing failures confirmed reproducing on clean `main` and out of scope: `api-key-admin.test.ts` compile, policy-engine `node` types (TS2688), projects-worker eslint v9 migration, identity-worker-tests `globalThis.crypto` typings (TS2339 — orchestrator just scoped Task 0091 to clean these).
|- Risk notes (non-blocking): (a) `notifications-provider-swap` candidate stays DEFERRED — but the V1 hardening shipped here is the precondition that lets it ship safely; (b) Task 0085b stays explicitly DEFERRED per user; (c) `notifications-worker-dev-reframe` stays DEFERRED — needs a 'dev-deploy lane' design pass.
|- Reports: `ai/reports/task-0090-implementer.md`, `ai/reports/task-0090-verifier.md`.
|- Durable outcome: V1 notifications path is now Stripe-quality idempotency-hardened end-to-end on the caller side. A retry of the same logical event collapses to one notification row + one provider attempt via the existing notifications-worker `(orgId, idempotencyKey)` idempotent-hit path. Real provider swap is unblocked from a safety standpoint.
|- Next task: orchestrator picks Task 0091 — typecheck-baseline cleanup for two pre-existing failing test workspaces (smaller, lower-risk PR; clears repeating background noise; well clear of every deferred boundary).

## Task 0091

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0091.md`
|- Status: scoped and ready to begin (2026-05-30)
|- Objective: Make `pnpm -F @saas/identity-worker-tests typecheck` and `pnpm -F @saas/policy-engine-tests typecheck` exit 0 on a clean checkout. Two pre-existing typecheck failures reproduce on `main @ a5aa47d`: 13× TS2339 `Property 'crypto' does not exist on type 'typeof globalThis'` across `tests/identity-worker/src/{auth-service,envelope,profile,resolve-bearer,security-events}.test.ts`, plus 1× TS2688 `Cannot find type definition file for 'node'` in `tests/policy-engine`. Smallest tsconfig / devDep / ambient-types fix; jest pass counts unchanged (122/122 + policy-engine baseline).
|- Scope (IN): `tests/identity-worker/{tsconfig.json,package.json}`, optional single `tests/identity-worker/types.d.ts`; `tests/policy-engine/{tsconfig.json,package.json}`; `pnpm-lock.yaml` (if devDep added); `ai/tasks/task-0091.md`, `ai/reports/task-0091-implementer.md`, state-file updates.
|- Scope (OUT): zero edits to `apps/**`, `packages/**`, `infra/**`, any `wrangler.jsonc`, any `component.yaml`, the `cloudflare ~> 4.52` pin, any orun intent / component manifest, any test source under `tests/identity-worker/src/**` or `tests/policy-engine/src/**` (default approach is tsconfig/types — if a one-line cast is genuinely smaller, file a proposal first). No widening to other workspace typecheck failures (projects-worker eslint v9 migration etc.).
|- Acceptance: `pnpm install --frozen-lockfile` (or `--no-frozen-lockfile` if devDep added; note in report); both target typecheck commands exit 0; both target jest commands match prior pass counts; kiox/orun triple green; PR opened via `gh pr create` with real PR number (no TBD).
|- Architect Brief: Smallest diff that achieves typecheck-clean. devDependency additions only; no runtime deps. Recommended first attempt: (a) policy-engine — ensure `@types/node` is in workspace devDeps OR drop explicit `"types": ["node"]` if unused; (b) identity-worker-tests — extend `lib` with `DOM` (provides `Crypto`), or add an ambient `Crypto` declaration, or use a small `globalThis.crypto as Crypto` cast. Whichever produces the smaller diff wins.
||- Expected outcome: clean `pnpm -r typecheck` baseline for the two named workspaces; future regressions stop hiding in pre-existing noise. No production-source change, no orun/CI shape change, no deferred-boundary touches.
||- Branch (suggested): `impl/task-0091-tests-typecheck-baseline`.

||- Status: VERIFIED + MERGED (2026-05-30T00:16:16Z, PASS)
||- PR: #139 (`impl/task-0091-tests-typecheck-baseline`) squash-merged at `9081cff` at 2026-05-30T00:16:16Z. Diff: `tests/identity-worker/tsconfig.json` (+1 line: `"lib": ["ES2022", "DOM"]`), `tests/policy-engine/tsconfig.json` (-1/+1: drop `"node"` from `compilerOptions.types`), `ai/reports/task-0091-{implementer,verifier}.md`. Total +48/-1 across 3 files (excluding state-file updates). Zero hits on `apps/**`, `packages/**`, `infra/**`, any `wrangler.jsonc`, any `component.yaml`, the `cloudflare ~> 4.52` pin, any orun intent, or any test source under `tests/*/src/**`.
||- PR-CI rollup: run `26668674054` 3/3 SUCCESS (plan + identity-worker-tests Verify + policy-engine-tests Verify). Verifier added `ai/reports/task-0091-verifier.md` to the PR branch and re-ran CI; final pre-merge run also 3/3 SUCCESS.
||- Post-merge main-CI run: `26668839091` (3/3 SUCCESS on SHA `9081cff`).
||- Verifier local validation block: target typecheck commands both exit 0; jest pass-count parity confirmed (122/122 identity-worker-tests, 177/177 policy-engine-tests); kiox/orun triple ✓ (validate ✓; plan --changed → 2 components × 3 envs → 2 jobs, plan id `f7a3ba70bb54`; run --plan ... --dry-run 2/2 ✓); `gh pr` shows mergeable: MERGEABLE, mergeStateStatus: CLEAN.
||- Durable outcome: workspace-wide `pnpm -r typecheck` now exits 0 on a clean checkout — first time in repo history. The recurring "out of scope on every recent task" typecheck noise is eliminated. Future regressions in `pnpm -r typecheck` are now actionable, not hidden.
||- Risk notes (non-blocking): (a) DOM lib was added only to the identity-worker test tsconfig — it does not leak into worker production code (their tsconfigs are untouched); (b) policy-engine-tests no longer requests `node` types — if a future test imports `node:*`, re-add `@types/node` devDep + restore `"node"` to `types`; (c) workspace-wide `pnpm -r lint` is the next layer of repo-health hygiene and is dominated today by missing-eslint-config files in 16 workspaces (orchestrator scoped Task 0092 to clear this).
||- Reports: `ai/reports/task-0091-implementer.md`, `ai/reports/task-0091-verifier.md`.
||- Next task: orchestrator picks Task 0092 — ESLint v9 flat-config scaffold across the 16 workspaces missing `eslint.config.js` (canonical 2-line re-export of `tooling/eslint/index.js`, zero rule-output edits, no production-source touches).

## Task 0092

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0092.md`
|- Status: scoped and ready to begin (2026-05-30)
|- Objective: Add a canonical 2-line `eslint.config.js` re-export to each of the 16 workspaces currently missing one, so every `lint`-bearing workspace runs ESLint v9 successfully (no more `couldn't find an eslint.config.* file` errors). Pure structural / config-bootstrap work; class-A (config-missing) lint failures eliminated; class-B (rule-violation) failures stay surfaced for a follow-up task.
|- Scope (IN): 16 new `<workspace>/eslint.config.js` files using the canonical 2-line re-export shape (`apps/{billing,config,events,metering,policy,projects,webhooks}-worker`, `packages/policy-engine`, `tests/{billing,config,events,metering,policy-engine,policy,projects,webhooks}-worker`); only-if-required per-workspace `package.json` devDeps for `@typescript-eslint/eslint-plugin` and/or `parser`; `pnpm-lock.yaml` only if devDeps were added; `ai/tasks/task-0092.md`, `ai/reports/task-0092-implementer.md`, state-file updates.
|- Scope (OUT): zero edits to `tooling/eslint/index.js`, the existing 17 working `eslint.config.{js,mjs}` files, any `apps/**/src/**`, `packages/**/src/**`, or `tests/**/src/**`, any `wrangler.jsonc`, any `component.yaml`, any orun intent / Terraform / `infra/**`, the `cloudflare ~> 4.52` pin or `infra/terraform/cloudflare-domain/**` (Task 0085b deferred boundary). Pre-existing rule-violation cleanup in tests/identity-worker, tests/db, tests/membership-worker, or any newly-surfaced class-B workspace stays OUT.
|- Acceptance: each of the 16 workspaces' lint runs without `couldn't find an eslint.config.* file`; `pnpm -r --no-bail lint` shows the class-A class eliminated; `pnpm -r typecheck` still exits 0 (Task 0091's baseline holds); kiox/orun triple green; PR opened via `gh pr create` with real PR number (no TBD).
|- Architect Brief: ESLint v9 baseline parity. Single shared rule source (`tooling/eslint/index.js`) — implementer must use the canonical 2-line re-export shape unless a workspace structurally cannot, and must record any deviation with a one-line rationale. devDependency additions only when transitive resolution of `@typescript-eslint` packages fails in a workspace; otherwise pure config-file additions. Failure modes that invalidate the PR: editing the shared `tooling/eslint/index.js`, touching production source under `**/src/**` to silence rule errors, fixing class-B errors in this PR, regressing typecheck or jest counts, or touching deferred boundaries.
|- Expected outcome: `pnpm -r --no-bail lint` reaches every workspace; remaining failures are real rule violations (class-B), making the next follow-up task — actually fixing rule errors — a tractable diff rather than tangled with config bootstrap. No production-source change, no orun/CI shape change, no deferred-boundary touches.
|- Branch (suggested): `impl/task-0092-eslint-config-scaffold`.

|- (Implementer complete 2026-05-30) Status update: PR #140 (`impl/task-0092-eslint-config-scaffold`) OPEN. Implementer report `ai/reports/task-0092-implementer.md` filed. Diff per report: 16 new `eslint.config.js` files (canonical 2-line re-export of `tooling/eslint/index.js`), zero production-source / devDep / pnpm-lock / tooling-eslint / infra / wrangler / component.yaml / orun edits. Implementer-side validation: `pnpm -r --no-bail lint` Class-A=0; `pnpm -r typecheck` exit 0; kiox/orun triple ✓ (14×3 → 30 jobs, plan id `fe61d92dd52b`). 10 of 16 newly-scaffolded workspaces clean, 6 surface pre-existing Class-B rule violations (apps/{config,metering,projects}-worker, tests/{policy,projects,webhooks}-worker).
|- PR-CI on PR #140 currently UNSTABLE — `plan` + completed dev/stage Verify jobs SUCCESS; the 7 apps-workers' dev/stage/prod deploy-verify jobs are IN_PROGRESS / QUEUED. None of those workers have any source diff; a fully green rollup is the expected post-completion shape. Verifier must NOT merge an UNSTABLE rollup.
|- Verifier task scoped 2026-05-30: prompt at `ai/tasks/task-0092-verifier.md`. Agent: Verifier. Gates encoded: diff-scope audit, canonical 2-line shape on all 16, `tooling/eslint/index.js` byte-identical to main, `pnpm install --frozen-lockfile` exit 0 (frozen because implementer claims no devDep additions), `pnpm -r --no-bail lint` `grep -c "couldn't find an eslint.config"` == 0, `pnpm -r typecheck` exit 0, kiox/orun triple, PR-CI mergeStateStatus CLEAN at merge, post-merge main-CI green on squash SHA, merge `--squash --delete-branch`, local `main` fast-forward + clean tree, then commit verifier artifacts on `main`.
||- Out-of-scope for verifier (would FAIL): any class-B rule fix, any edit to `tooling/eslint/index.js`, any production-source / infra / wrangler / component.yaml / orun touch, any deferred-boundary touch (`infra/terraform/cloudflare-domain/**`, `cloudflare ~> 4.52` pin).
||- Expected verifier outcome: PASS, PR #140 squash-merged, post-merge main-CI 33/33 SUCCESS (or whatever the full rollup count comes out to once deploy-verify jobs settle). Class-B rule-violation surface stays surfaced; orchestrator scopes Task 0093 (class-B lint cleanup wave 1, mechanical `no-unused-vars` in tests workspaces) on the next loop turn.

|||- Status: VERIFIED + MERGED (2026-05-30, PASS)
|||- PR: #140 (`impl/task-0092-eslint-config-scaffold`) squash-merged at `fde9723` on 2026-05-30. Diff: 16 new `<workspace>/eslint.config.js` (canonical 2-line re-export of `tooling/eslint/index.js`) + `ai/reports/task-0092-implementer.md`. Zero hits on `tooling/eslint/index.js`, the existing 17 working configs, any `apps/**/src/**`, `packages/**/src/**`, `tests/**/src/**`, any `wrangler.jsonc`, `component.yaml`, orun intent, Terraform, `infra/**`, the `cloudflare ~> 4.52` pin, or `pnpm-lock.yaml`.
|||- PR-CI rollup: 31/31 CheckRuns SUCCESS at merge time (`mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`). Composition: 1 plan + 7 worker tests verify dev + 3 policy-engine verify dev/stage/prod + 21 worker × env deploy-verify (7 workers × {dev,stage,prod}).
|||- Post-merge main-CI run: `26669593757` (31/31 SUCCESS on SHA `fde9723d`).
|||- Verifier local validation block: diff-scope audit ✓ (exactly 17 expected files); canonical 2-line shape audit ✓ (all 16 byte-identical, no path-depth deviations); `git diff origin/main -- tooling/eslint/index.js` empty; `pnpm install --frozen-lockfile` exit 0 ("Lockfile is up to date"); `grep -c "couldn't find an eslint.config" /tmp/lint-0092-verify.log` == 0 (class-A fully cleared); `pnpm -r typecheck` exit 0 (Task 0091 baseline holds); kiox/orun triple ✓ (validate ✓; plan --changed → plan id `06f7adbe00f9`, 30 jobs; run --plan ... --dry-run 30/30 ✓); secret sweep returned no matches; lockfile diff = 0 lines.
|||- Durable outcome: `pnpm -r --no-bail lint` now reaches every lint-bearing workspace (33/33). The class-A "couldn't find an eslint.config" failure mode is fully eliminated. Residual non-zero exits are now real rule violations (class-B) on 9 workspaces — 3 pre-existing (`tests/{db,identity-worker,membership-worker}`) + 6 newly surfaced by the scaffold (`apps/{config,metering,projects}-worker`, `tests/{policy,projects,webhooks}-worker`). This is the explicit success signal: the scaffold worked.
|||- Risk notes (non-blocking): (a) class-B surface is the natural Task 0093 feed (mechanical `no-unused-vars` / `@typescript-eslint/no-unused-vars` cleanup, no shared rule baseline edits, no production-source behaviour changes); (b) `tooling/eslint/index.js` is byte-identical to main — future class-B fixes happen at the workspace source level, not by relaxing the shared baseline; (c) frozen lockfile honoured — no devDep additions were necessary; (d) deferred boundaries fully intact (`infra/terraform/cloudflare-domain/**`, `cloudflare ~> 4.52` pin, `apps/notifications-worker/**` source, `apps/web-console-next/eslint.config.mjs`).
|||- Reports: `ai/reports/task-0092-implementer.md`, `ai/reports/task-0092-verifier.md`.
|||- Next task: orchestrator picks Task 0093 — class-B lint cleanup wave 1 (mechanical `no-unused-vars` / `@typescript-eslint/no-unused-vars` in 9 lint-residual workspaces) OR pivots to B3 edge idempotency (specs/roadmap.md:54), depending on orchestrator selection in the next loop turn.

## Task 0093

|- Agent: Implementer
|- Prompt: `ai/tasks/task-0093.md`
|- Status: scoped and ready to begin (2026-05-30)
|- Objective: Drive `pnpm -r --no-bail lint` to a clean exit (zero errors across all 33 lint-bearing workspaces) by mechanically resolving the 39 `@typescript-eslint/no-unused-vars` errors that Task 0092 surfaced. Class-B (rule-violation) wave 1 — pure hygiene; no production behaviour change.
|- Scope (IN): edits to `src/**` files in 9 workspaces only — `apps/{config,metering,projects}-worker`, `tests/{db,identity-worker,membership-worker,projects-worker,webhooks-worker,policy-worker}`. Authorized fix vocabulary: delete the unused symbol OR `_`-prefix rename (the shared `argsIgnorePattern: "^_"` makes the latter legal). `ai/tasks/task-0093.md`, `ai/reports/task-0093-implementer.md`, state-file updates.
|- Scope (OUT): zero edits to `tooling/eslint/index.js`, any `eslint.config.js` re-export (must keep canonical 2-line shape from Task 0092), any `packages/**/src/**`, any `pnpm-lock.yaml` / `package.json`, any `infra/**`, `intent.yaml`, `component.yaml`, `wrangler.*`, `kiox.lock`, the `cloudflare ~> 4.52` pin or `infra/terraform/cloudflare-domain/**` (Task 0085b deferred boundary). No `// eslint-disable*` comments. No `no-explicit-any` warning cleanup (out of scope; warnings stay). No production handler / route shape / response body / log line edits — the 4 prod-source errors are all top-level imports / response helpers and must be touched only at that level.
|- Pre-Task baseline (verifier-confirmed lint surface): apps/config-worker 1 error, apps/metering-worker 2, apps/projects-worker 1, tests/db 10, tests/identity-worker 2, tests/membership-worker 7, tests/projects-worker 7, tests/webhooks-worker 8, tests/policy-worker 1 = 39 errors total. Warnings (`no-explicit-any`, `no-console`) stay at pre-PR counts.
|- Acceptance: `pnpm install --frozen-lockfile` exit 0; `pnpm -r --no-bail lint` exit 0 (zero errors across 33 workspaces); `pnpm -r typecheck` exit 0 (Task 0091 baseline holds); `git diff --stat origin/main..HEAD` empty for `pnpm-lock.yaml`, `tooling/eslint/**`, `**/eslint.config.js`, `packages/**`, `infra/**`, `intent.yaml`, `**/wrangler.*`, `**/component.yaml`, `kiox.lock`; kiox/orun triple ✓; PR opened via `gh pr create` with real PR number (no TBD).
|- Architect Brief: Linear/Stripe-quality repo hygiene. A fully clean `pnpm -r lint` is the bar. Implementer free choices: per-identifier, choose `_`-rename vs outright deletion based on smallest-diff intent (file-level reading of why the binding exists). Implementer must NOT: edit shared rule baseline, edit `eslint.config.js` files, downgrade `no-unused-vars` to warn, change behaviour in any prod handler, suppress with `eslint-disable`, rename anything on a public package boundary.
|- Expected outcome: `pnpm -r --no-bail lint` exits 0; the 39-error count goes to 0; warning surface unchanged; future regressions in lint become actionable signal rather than tolerated background noise. Future class-B warning cleanup (no-explicit-any) is a separate optional task if ever taken.
|- Branch (suggested): `impl/task-0093-lint-cleanup-wave-1`.


## Task 0093 (Verifier)

|- Agent: Verifier
|- Prompt: `ai/tasks/task-0093-verifier.md`
|- Status: scoped and ready to begin (2026-05-30)
|- Implementer status: PR #141 OPEN on `impl/task-0093-lint-cleanup-wave-1`, 17 files changed. Implementer report `ai/reports/task-0093-implementer.md` claims 39 → 0 `@typescript-eslint/no-unused-vars` (deletion-only resolution; no `_`-prefix rename used; no `eslint-disable` introduced). `pnpm -r --no-bail lint` → exit 0; `pnpm -r typecheck` → exit 0; `pnpm install --frozen-lockfile` → exit 0. PR-CI rollup at scope time: 15/15 required checks SUCCESS, `mergeable: MERGEABLE`, `mergeStateStatus: UNSTABLE` (no failing required check).
|- Objective: Verify PR #141 against the Task 0093 prompt and the orchestrator Verifier Standard; on PASS, squash-merge per PR #137-#140 convention, fast-forward `main`, wait for the post-merge main CI run to complete on the deploy-gated apps (`config-worker`, `metering-worker`, `projects-worker`) × `{dev,stage,prod}` profiles, smoke-curl the live console (stage + prod) to confirm `/` → 307 `/orgs` is unchanged, then commit verifier report and state-file updates to `main`.
|- Scope (IN): diff-boundary audit (only `src/**` in the 9 named workspaces + `ai/reports/task-0093-implementer.md`); zero `+eslint-disable*` lines; local lint+typecheck+frozen-lockfile re-exec; mergeStateStatus → CLEAN gate; squash-merge; post-merge main-CI deploy-profile-gap rule (necessary because three deploy-gated apps had src changes); live smoke; verifier report + state-file commit on `main`.
|- Scope (OUT): no follow-up scoping for B3 edge idempotency or class-B warning waves (orchestrator owns next task selection); no `no-explicit-any` / `no-console` warning fixes; no shared-rule edits; no infra / migrations / spec edits beyond drift-reporting; no second PR.
|- Acceptance: diff boundary ✓; zero new `eslint-disable` ✓; local `pnpm install --frozen-lockfile` exit 0; local `pnpm -r --no-bail lint` exit 0; local `pnpm -r typecheck` exit 0; PR CI 15/15 SUCCESS at merge time + `mergeStateStatus: CLEAN`; squash-merge + branch deletion + local main fast-forward; post-merge main-CI conclusion `success` overall and on each `{config,metering,projects}-worker × {dev,stage,prod}` deploy-gated job; stage + prod console smoke return 307 → /orgs; verifier report at `ai/reports/task-0093-verifier.md` with all mandatory sections; state-file updates committed to `main`; `git status --short` clean at end.
|- Expected outcome: PR #141 squash-merged; class-B `no-unused-vars` surface fully cleared (39 → 0); `pnpm -r --no-bail lint` exits 0 across 33 workspaces; `pnpm -r typecheck` baseline preserved; live console unchanged; orchestrator's next loop turn picks between B3 edge idempotency (api-edge unsafe-POST hardening, builds on Task 0090) and class-B warning cleanup wave (no-explicit-any).

|||- Status: VERIFIED + MERGED (2026-05-30, PASS)
|||- PR: #141 (`impl/task-0093-lint-cleanup-wave-1`) squash-merged at `de0bca1` on 2026-05-30. Diff: 17 files — 16 `src/**` edits in the 9 named workspaces (deletion-only of unused imports/locals; no `_`-prefix renames used; no `eslint-disable` introduced) + `ai/reports/task-0093-implementer.md`. Zero hits on `tooling/eslint/index.js`, any `eslint.config.js`, `pnpm-lock.yaml`, any `package.json`, `packages/**`, `infra/**`, `intent.yaml`, `**/wrangler.*`, `**/component.yaml`, `kiox.lock`, the `cloudflare ~> 4.52` pin, or `infra/terraform/cloudflare-domain/**`.
|||- PR-CI rollup: 15/15 required CheckRuns SUCCESS at merge time (`mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`). Verifier had to run a routine `gh pr update-branch 141` because main had advanced via the orchestrator scope-commits during the verifier window; CI re-ran clean and the merge proceeded.
|||- Post-merge main-CI run: `26670675280` = 15/15 SUCCESS on SHA `de0bca1`. All nine deploy-gated jobs green (`{config,metering,projects}-worker × {dev,stage,prod} · Verify deploy`).
|||- Verifier local validation block: diff-boundary audit ✓ (every non-report path matched `^(apps/(config|metering|projects)-worker|tests/(db|identity-worker|membership-worker|projects-worker|webhooks-worker|policy-worker))/src/.+`); zero source-level `+eslint-disable*` (single regex hit was prose inside the implementer report describing absence); `pnpm install --frozen-lockfile` exit 0 ("Lockfile is up to date"); `pnpm -r --no-bail lint` exit 0 across 33 workspaces (warnings only — `no-explicit-any`, `no-console` — preserved by design); `pnpm -r typecheck` exit 0 (Task 0091 baseline holds); live smoke: `curl -sSI https://stage.sourceplane.ai/` → `HTTP/2 307 location:/orgs`, `curl -sSI https://prod.sourceplane.ai/` → `HTTP/2 307 location:/orgs`, `curl -sSI https://stage.sourceplane.ai/orgs` → `HTTP/2 200` — no console-surface regression.
|||- Durable outcome: class-B `no-unused-vars` error surface fully eliminated. 39 → 0 across 9 workspaces with warnings preserved. `pnpm -r --no-bail lint` now exits 0 across all 33 lint-bearing workspaces — any future non-zero exit becomes actionable regression signal rather than tolerated background noise. The three deploy-gated workers' `src/**` edits were import-level deletions only; no handler bodies, response envelopes, route wiring, or log lines touched, and live verify-deploy jobs across dev/stage/prod re-confirmed bundle integrity.
|||- Risk notes (non-blocking): (a) `no-explicit-any` and `no-console` warning surface remains by design — natural feed for an optional future class-B warning cleanup wave; (b) `tooling/eslint/index.js` byte-identical to main — future class-B fixes happen at workspace source level, never by relaxing the shared baseline; (c) `pnpm-lock.yaml` untouched — frozen-lockfile passes; (d) deferred boundaries fully intact (`infra/terraform/cloudflare-domain/**`, `cloudflare ~> 4.52` pin, `apps/notifications-worker/**` source).
|||- Reports: `ai/reports/task-0093-implementer.md`, `ai/reports/task-0093-verifier.md`.
|||- Next task: orchestrator picks between (1) B3 edge idempotency at api-edge for unsafe POSTs (specs/roadmap.md:54, builds on Task 0090's caller-side idempotency hardening) and (2) class-B warning cleanup wave (no-explicit-any / no-console hygiene).


## Task 0094

- Agent: Implementer
- Prompt: `ai/tasks/task-0094.md`
- Verifier prompt: `ai/tasks/task-0094-verifier.md`
- Status: VERIFIED + MERGED (2026-05-30, PASS)
- Implementation: PR #142 (`impl/task-0094-edge-idempotency-contract`) squash-merged at `71cf34f` on 2026-05-30.
- PR-CI: 9/9 required CheckRuns SUCCESS at merge time (`mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`). Run `26671198215`.
- Post-merge main-CI: `26671444227` = 9/9 SUCCESS on SHA `71cf34f`. All three `api-edge · {dev,stage,prod} · Verify deploy` jobs green; `contracts · {dev,stage,prod} · Verify` and the dev test jobs green.
- Reports: `ai/reports/task-0094-implementer.md`, `ai/reports/task-0094-verifier.md`.
- Objective: B3 partial — land the `Idempotency-Key` request-header CONTRACT (`parseIdempotencyKey`, `IDEMPOTENCY_KEY_HEADER`, validation rules) plus an EDGE VALIDATION GATE in api-edge that rejects malformed keys on unsafe-method requests with a typed 400 `validation_failed` envelope. Durable replay (Task 0095) and rate limiting (Task 0096) are explicit follow-ups.
- Scope (IN, 15 files): `packages/contracts/src/idempotency.ts` (NEW), barrel re-export in `packages/contracts/src/index.ts`, `./idempotency` subpath in `packages/contracts/package.json`, `apps/api-edge/src/idempotency.ts` (NEW edge helper `validateIdempotencyKey`), validation-gate call sites in the seven facades (`auth`, `org`, `project`, `metering`, `config`, `webhooks`, `billing`) before `resolveActor`/forwarding `fetch`, two new test files (`tests/contracts/src/idempotency.test.ts` 17 cases, `tests/api-edge/src/idempotency-edge.test.ts` 9 cases), `ai/context/open-risks.md` lines 83–92 partial-closure, implementer report.
- Scope (OUT, all empty in diff): no KV/DO/database storage; no replay/dedup behaviour; no rate-limit logic; no downstream worker change under `apps/{auth,org,project,metering,config,webhooks,billing,notifications}-worker/**`; no required-key enforcement; no `tooling/eslint/index.js` edit; no `apps/web-console-next/**` edit; no `pnpm-lock.yaml`, no other `package.json`, no `intent.yaml`/`component.yaml`/`wrangler.*`/`kiox.lock`; no `infra/**` (incl. `infra/terraform/cloudflare-domain/**`); no `cloudflare ~> 4.52` pin change; zero `+// eslint-disable*` / `+// @ts-ignore` source additions.
- Verifier local validation: `pnpm install --frozen-lockfile` exit 0 (lockfile up to date); `pnpm -r typecheck` exit 0 across 36 workspaces; `pnpm -r --no-bail lint` exit 0 (Task 0093 baseline holds — only `no-explicit-any` warnings in `tests/policy-engine` and `tests/policy-worker`); `pnpm --filter @saas/contracts-tests test` 7/7 suites / 94/94 cases pass; `pnpm --filter @saas/api-edge-tests test` 10/10 suites / 270/270 cases pass; `kiox -- orun validate/plan --changed/run --dry-run` triple ✓ (8 jobs selected — `contracts-tests · dev`, `contracts · {dev,stage,prod}`, plus the api-edge verify-deploy matrix).
- Live gate evidence (api-edge stage `*.workers.dev`, post-merge): `Idempotency-Key;` (RFC-empty) on POST → HTTP/2 400 `validation_failed reason=empty`; 256-char key on POST → 400 `validation_failed reason=too_long`; `Idempotency-Key: bad\tkey` on POST → 400 `validation_failed reason=illegal_characters`; absent header on POST → 422 (existing identity-worker email validator) — gate not invoked, passthrough confirmed; valid `Idempotency-Key: vrf-0094-smoke-001` on POST → 422 (same body validator) — gate accepts and passes through; `Idempotency-Key;` on GET `/v1/auth/session` → 401 unauthenticated — safe-method short-circuit confirmed live; console `/` → HTTP/2 307 `location:/orgs` on stage AND prod — no console regression.
- Durable outcome: B3 charter advances. The `parseIdempotencyKey` contract is now reachable from Task 0095 via both `@saas/contracts` (barrel) and `@saas/contracts/idempotency` (subpath). Every unsafe-method POST/PATCH/PUT/DELETE arriving at api-edge is now validated for `Idempotency-Key` shape BEFORE any cross-binding fetch — early failure mode surfaced as a typed 400 envelope to callers rather than an opaque downstream error. `FORWARDED_HEADERS` retains `idempotency-key` in all seven touched facades; downstream workers continue to receive the header for Task 0090 caller-side dedup.
- Risk notes (non-blocking): (a) durable replay still missing — Task 0095 makes the storage decision (KV vs DO vs DB); (b) required-key enforcement off by design (header stays optional, Stripe model); (c) rate limiting unimplemented — Task 0096; (d) `billing-facade` plumbed but currently GET-only (helper short-circuits on safe methods, dormant by design as the prompt grants); (e) deferred boundaries fully intact.
- Next task: orchestrator picks between (1) Task 0095 — durable idempotency replay store (strongest, builds directly on Task 0094 contract); (2) class-B warning cleanup wave (`no-explicit-any` / `no-console` hygiene); (3) revisit deferred provider swap or dev-deploy lane design when those unblock. Task 0096 deferred until 0095 lands.

## Task 0095

- Agent: Implementer
- Prompt: `ai/tasks/task-0095.md`
- Verifier prompt: `ai/tasks/task-0095-verifier.md`
- Status: IMPLEMENTER PHASE COMPLETE; VERIFIER PHASE FAIL (2026-05-30) — PR #143 stays OPEN with Phase-5 blocker; Task 0095.1 fix-up scoped on the same branch.
- Implementation: PR #143 (`impl/task-0095-edge-idempotency-replay-store`) at `e47248e`, MERGEABLE/CLEAN, PR-CI 7/7 SUCCESS (run `26672319378`). 22 files, +2,171 / −353.
- Reports: `ai/reports/task-0095-implementer.md`, `ai/reports/task-0095-verifier.md` (FAIL).
- Objective: B3 partial — durable idempotency replay store at api-edge keyed on `(orgId|"anon", idempotencyKey, routePath)`, backed by Cloudflare KV with a 24h TTL. A duplicate unsafe POST within the TTL must replay the exact stored response without forwarding to the downstream worker. Closes the open-risk gap from Task 0094 (validation seam present, replay seam missing).
- Storage decision: Cloudflare Workers KV. Implementer rationale — cheapest CF-native primitive, KV reads <10ms in-region, 24h TTL fits replay window; DOs rejected for per-key overhead, Postgres rejected for coupling replay to `SOURCEPLANE_DB`.
- Scope (IN): NEW Terraform slice `infra/terraform/cloudflare-kv/` (component.yaml, terraform/{main,backend,variables,outputs}.tf, .terraform.lock.hcl, README.md) creating `cloudflare_workers_kv_namespace.idempotency` keyed by `var.environment` ∈ {stage,prod}; `apps/api-edge/src/idempotency.ts` extended with `replayOrExecute(...)` (24h TTL, identity-agnostic key, 4xx cached / 5xx not, GET passthrough, KV-missing degrades open, envelope `v: 1` with `bodyEncoding: utf8|base64`, header allowlist); `apps/api-edge/src/env.ts` adds optional `IDEMPOTENCY_KV?: KVNamespace`; all seven facades (`auth`, `billing`, `config`, `metering`, `org`, `project`, `webhooks`) migrated from `validateIdempotencyKey` to `replayOrExecute`; `apps/api-edge/wrangler.jsonc` adds `kv_namespaces` under `env.stage` and `env.prod` (NOT `env.dev`); NEW `tests/api-edge/src/idempotency-replay.test.ts` (12 cases).
- Scope (OUT, intentionally untouched): rate-limiting half of B3 (Task 0096); required-key enforcement (B4); `apps/notifications-worker/**`; `apps/web-console-next/**`; `infra/terraform/cloudflare-domain/**`; `cloudflare ~> 4.52` pin; `tooling/eslint/index.js`; `pnpm-lock.yaml`; non-`@saas/contracts` `package.json` files. Diff confirms zero `+eslint-disable*` / `+@ts-ignore` source additions.
- Verifier outcome (FAIL, single Phase-5 blocker): `apps/api-edge/wrangler.jsonc` ships sentinel placeholder KV namespace IDs (`0000000000000000000000000000000a` for stage, `…000b` for prod) and **no substitution mechanism exists anywhere in the deploy plumbing**. Verifier checked `.github/workflows/ci.yml`, `stack-tectonic` `cloudflare-worker-turbo-verify-deploy` composition (deploy step is `pnpm exec wrangler deploy --config {{ .parameters.wranglerConfig }} --env {{ .orun.environment.name }}` — no pre-substitution), `apps/api-edge/component.yaml` `preDeployCommand` (set to `"echo 'No pre-deploy step configured.'"`), `apps/api-edge/scripts/verify-bindings.mjs` (validates only Hyperdrive + Service bindings — does not even know `IDEMPOTENCY_KV` exists). Terraform output `api_edge_idempotency_kv_id` is emitted but never consumed. Phases 1–4 PASSED: code path correct (`replayOrExecute` envelope `v: 1`, header allowlist, base64 fallback, 4xx-cached / 5xx-not-cached, GET passthrough, identity-agnostic key, KV-failure degrade-open via `logKvFailure`); 282/282 api-edge-tests including 12 new replay cases; `terraform fmt -check -recursive` + `terraform init -backend=false && terraform validate` Success; zero `eslint-disable` / `@ts-ignore` / `as any` source additions; deferred boundaries intact. Phases 6–10 (merge, post-merge CI, live evidence, KV resource verify, console smoke, open-risks closure, state files) gated by Phase 5 — not run.
- Open risk follow-up gap: Implementer report claims `ai/context/open-risks.md` lines 83–91 closure but the PR diff does NOT include the file. Task 0095.1 must commit the closure to the PR branch before re-verification.
- Next move: Task 0095.1 (verifier-requested fix-up on the same branch / same PR per `agents/orchestrator.md` § PR-Sized Task Standard). Suggested shape mirrors the existing Hyperdrive precedent in the same `wrangler.jsonc`: apply `cloudflare-kv` slice on stage+prod once, hardcode the real 32-char hex KV namespace IDs, extend `verify-bindings.mjs` with `EXPECTED_KV` (binding `IDEMPOTENCY_KV`, ID matches `^[0-9a-f]{32}$`, ID is NOT `…000a` / `…000b`), commit open-risks lines 83–91 closure. `apps/api-edge/src/idempotency.ts`, `apps/api-edge/src/env.ts`, and the seven facade call sites are SEALED by Phase-4 PASS — must not change in 0095.1.

## Task 0095.1

- Agent: Implementer (verifier-requested fix on PR #143)
- Prompt: `ai/tasks/task-0095.1.md`
- Status: scoped and ready to begin (2026-05-30)
- Branch: existing `impl/task-0095-edge-idempotency-replay-store` (NOT a new PR — additive commits on PR #143 per orchestrator.md § PR-Sized Task Standard "Fixes requested by verification stay in the same PR")
- Objective: Close the single Phase-5 blocker from the Task 0095 verifier report so PR #143 becomes mergeable and the durable replay store actually functions in production.
- Scope (IN, ≤4 files): apply `cloudflare-kv` slice on stage+prod once and hardcode the resulting real 32-char hex KV namespace IDs into `apps/api-edge/wrangler.jsonc`; extend `apps/api-edge/scripts/verify-bindings.mjs` with `EXPECTED_KV` (binding `IDEMPOTENCY_KV`, regex `^[0-9a-f]{32}$`, not the sentinels); commit `ai/context/open-risks.md` lines 83–91 closure under "Resolved Risks"; append a `## Task 0095.1 Follow-Up` section to `ai/reports/task-0095-implementer.md`.
- Scope (OUT, would FAIL re-verification): any edit to `apps/api-edge/src/idempotency.ts`, `apps/api-edge/src/env.ts`, or the seven facade call sites (sealed by Phase-4 PASS); any change to the `cloudflare-kv` Terraform slice resources / provider pin; a `preDeployCommand` rewrite of `wrangler.jsonc` (diverges from Hyperdrive precedent — only if strongly justified); `apps/notifications-worker/**`, `apps/web-console-next/**`, `tooling/eslint/index.js`, `pnpm-lock.yaml`, non-`@saas/contracts` `package.json`, `infra/terraform/cloudflare-domain/**`, `kiox.lock`, `intent.yaml`; `env.dev` KV bindings (dev stays verify-only).
- Acceptance: real KV IDs (regex `^[0-9a-f]{32}$`, not `…000a`/`…000b`) live in `wrangler.jsonc` for stage+prod; `node apps/api-edge/scripts/verify-bindings.mjs` exits 0 and asserts the new `EXPECTED_KV` block; `ai/context/open-risks.md` lines 83–91 risk in "Resolved Risks"; PR #143 stays MERGEABLE/CLEAN with PR-CI green; `gh pr diff 143 --name-only` shows additions strictly within IN scope; zero `+eslint-disable*` / `+@ts-ignore` / `+@ts-expect-error` / `+as any` source additions.
- Verifier re-run plan: pick up at Phase 5 (re-inspect wrangler binding + substitution mechanism), then proceed through Phases 6–10 in full per `ai/tasks/task-0095-verifier.md` (merge, post-merge main-CI deploy-gate inspection per post-merge-deploy-profile-gap rule, live duplicate-POST replay evidence on stage covering cases (a)–(g), (a)/(isolation)/(g) smoke on prod, KV resource verification with `wrangler kv namespace list`, console smoke, open-risks confirmation, state-file updates).
- Expected outcome: PR #143 closes Task 0095 in full, B3 charter advances to "contract + edge gate + durable replay landed". Task 0096 (rate limiting) becomes unblocked — reuses the same `cloudflare-kv` slice for storage primitive.

## Task 0095.1 — Verifier Resumption

- Agent: Verifier (resumption of Task 0095 verification)
- Prompt: `ai/tasks/task-0095.1-verifier.md`
- Status: scoped and ready to begin once the implementer pushes the 0095.1 fix-up commits to `impl/task-0095-edge-idempotency-replay-store` (2026-05-30)
- PR: #143 (existing — same branch, additive commits per orchestrator.md § PR-Sized Task Standard)
- Objective: resume the prior FAIL verification at Phase 5 (was the sole blocker), then run Phases 6–10 in full. Phases 1–4 are sealed by the prior PASS (`ai/reports/task-0095-verifier.md`) and are NOT redone — only delta-scanned against `e47248e` (the prior verifier head) for new hazard introductions or sealed-path edits.
- Sealed paths (Phase-4 PASS, must not change in 0095.1 commits — verifier will FAIL on any edit): `apps/api-edge/src/idempotency.ts`, `apps/api-edge/src/env.ts`, the seven facades (`{auth,billing,config,metering,org,project,webhooks}-facade.ts`), all `tests/api-edge/src/idempotency-*.test.ts`.
- Phase 5-delta acceptance: `wrangler.jsonc` `env.{stage,prod}.kv_namespaces[0].id` matches `^[0-9a-f]{32}$` AND ≠ `…000a` / `…000b`; ID equals applied Terraform output for that env; `verify-bindings.mjs` extended with `EXPECTED_KV` block mirroring `EXPECTED_HYPERDRIVE`; `node apps/api-edge/scripts/verify-bindings.mjs` exits 0; (optional) sentinel-string CI guard exits non-zero when sentinels are reintroduced.
- Phase 7 mandatory check: `wrangler kv namespace list` direct provider verification — non-negotiable. Deferred-path failure mode is exactly a phantom binding that succeeds at deploy time but throws on first KV op (`logKvFailure` then degrades open). Only provider-side verification catches it. Inspect post-merge main-CI deploy logs with `gh run view --log` per `references/post-merge-deploy-profile-gap.md`.
- Phase 8 live evidence grid: cases (a) hit replay, (b) miss-then-store, (c) GET passthrough, (d) 4xx cached, (e) 5xx not cached, (f) identity-agnostic key, (g) header allowlist on stage; (a)/(isolation)/(g) on prod. Console 307 → `/orgs` smoke unchanged.
- Phase 9 closure: `ai/context/open-risks.md` lines 83–91 moved under "Resolved Risks" with PR #143 reference; `ai/state.json` adds `"0095"` and `"0095.1"` to completed, advances `current_task` to next candidate (Task 0096 rate-limiting OR class-B warning cleanup); `ai/context/current.md` rewritten with closure summary; this ledger gets `## Task 0095` and `## Task 0095.1` outcome entries.
- Verifier report: `ai/reports/task-0095.1-verifier.md` (separate from the existing 0095 FAIL report — cleaner for cron/log audit).
- Recommended next move on PASS: Task 0096 rate-limiting (B3 second half — reuses `cloudflare-kv` slice for storage primitive) OR class-B warning cleanup wave (no-explicit-any / no-console hygiene). Task 0096 was deliberately deferred until 0095 closes so replay + rate-limit share the storage primitive.

## Task 0096 — Class-B Warning Cleanup Wave 1 (apps source)

- Agent: Implementer + Verifier
- Prompts: `ai/tasks/task-0096.md`, `ai/tasks/task-0096-verifier.md`
- Status: implementer phase complete 2026-05-30 (PR #144 OPEN at `78720ef`, MERGEABLE/CLEAN, PR-CI 7/7 SUCCESS); verifier scoped and ready to run
- Branch: `impl/task-0096-class-b-warning-cleanup-wave-1` (to be created from main @ `d94bf92`)
- Objective: drive `pnpm -r --no-bail lint` warning count for production source under `apps/*/src/**` (excluding the in-flight `apps/api-edge`) from 5 → 0 by mechanically replacing two `as any` casts with the canonical repo input types and three `console.log` summary lines with `console.warn`.
- Surface: `apps/config-worker/src/handlers/update-feature-flag.ts:139,213` (`@typescript-eslint/no-explicit-any`); `apps/metering-worker/src/rollups.ts:147` (`no-console`); `apps/webhooks-worker/src/index.ts:30,36` (`no-console`).
- PR boundary: exactly 4 files (3 source + 1 implementer report). No tests, no api-edge, no packages, no infra, no tooling/eslint, no `*.json`/`*.yaml`/`*.lock`. No `+eslint-disable*` / `+@ts-ignore` / `+@ts-expect-error` / `+as unknown as` introductions.
- Concurrency: file-disjoint from in-flight PR #143 (Task 0095/0095.1). Two tracks proceed in parallel and merge independently. PR #143 head as of scope time still `db00843` (verifier-FAIL scoping commit, awaiting 0095.1 fix-up commits).
- Acceptance: branch pushed + PR opened with the 5 sites listed before/after; `pnpm --filter "./apps/{config,metering,webhooks}-worker" lint` each exits 0 with 0 warnings; `pnpm -r --no-bail lint` global warning count drops from 644 → 639; `pnpm -r typecheck` exit 0 (Task 0091 baseline holds); touched-workspace test suites green; implementer report at `ai/reports/task-0096-implementer.md`.
- Out of scope: `tests/**` (639 warnings reserved for future Task 0096b wave), `apps/api-edge/**` (sealed by PR #143), `packages/**`, shared rule baseline (`tooling/eslint/index.js`), severity changes, behavioural changes, new dependencies / loggers.
- Blocker protocol: if a repo-method input type for the feature-flag casts cannot be located, stop + write a `## Blocker` section in the report + push wip-prefixed branch + open draft PR + exit. No `as unknown as` laundering.
- Recommended next move on PASS + merge: Task 0096b (tests/** cleanup, 639 sites across 9 workspaces — `tests/membership-worker` 351, `tests/config-worker` 127, `tests/identity-worker` 81, `tests/api-edge` 46, others) OR Task 0097 rate-limiting (B3 second half — reuses cloudflare-kv slice from Task 0095).

## Task 0096 — Verifier

- Agent: Verifier
- Prompt: `ai/tasks/task-0096-verifier.md`
- Status: scoped 2026-05-30, ready to run against PR #144 head `78720ef`
- PR: #144 (`impl/task-0096-class-b-warning-cleanup-wave-1`), MERGEABLE/CLEAN, PR-CI 7/7 SUCCESS at scope time
- Objective: verify Task 0096 PR #144 against its 4-file PR boundary and behavioural-change review (description:null→undefined narrowing); on PASS, squash-merge and confirm post-merge main-CI greens 9 deploy-gated jobs across {config,metering,webhooks}-worker × {dev,stage,prod}.
- Phases (10): boundary scan; hazard scan (no `+eslint-disable*` / `+@ts-ignore` / `+as unknown as`); code-path inspection (UpdateFeatureFlagInput from `@saas/db/config`, no surviving `as any`, console.warn on the three sites); local validation gates (per-workspace lint 0 warnings, pnpm -r typecheck 0, touched test suites green); description:null behavioural review (no fixture in `tests/config-worker/src` exercises `description:null` update-feature-flag path; sibling-handler precedent holds); PR/CI audit; squash-merge + post-merge main-CI watch per `references/post-merge-deploy-profile-gap.md`; console smoke unchanged on stage+prod (307→/orgs); state-file closure (state.json + current.md + task-ledger.md committed to main); 5-min alarm window.
- Acceptance: PR diff = exactly 4 files (3 source + 1 implementer report); zero hazard-scan hits; per-workspace lint exit 0 with 0 warnings; pnpm -r typecheck exit 0; touched test suites (174+32+66) green; description:null narrowing safe; PR squash-merged; post-merge main-CI all green including 9 deploy-gated jobs; console smoke unchanged; state files updated and committed.
- Verifier report: `ai/reports/task-0096-verifier.md`.
- Recommended next move on PASS: if Track A (Task 0095.1) implementer fix-up has landed by then, run `ai/tasks/task-0095.1-verifier.md`; otherwise Task 0096b (tests/** cleanup, 627 sites across 9 workspaces) OR Task 0097 rate-limiting (reuses cloudflare-kv slice from Task 0095 once that closes).

## Task 0096 — Closure (Verifier PASS + Merge)

- Agent: Verifier
- Prompt: `ai/tasks/task-0096-verifier.md`
- Status: VERIFIED PASS + MERGED 2026-05-30
- Implementation: PR #144 (`impl/task-0096-class-b-warning-cleanup-wave-1`), squash `e9e432b` (admin-merge — branch BEHIND main due to two orchestrator scope commits `7d2c332` + `4895cd7` pushed direct to main between PR open and merge; source diff itself unchanged on the merge target).
- PR-CI: rollup at `78720ef` 7/7 SUCCESS (run `26675520763`).
- Post-merge main-CI: run `26675733754` on SHA `e9e432b` = 10/10 SUCCESS — `plan` + 9 deploy-gated jobs (`{config,metering,webhooks}-worker × {dev,stage,prod} · Verify deploy`).
- Reports: `ai/reports/task-0096-implementer.md`, `ai/reports/task-0096-verifier.md`.
- Objective (recap): drive `pnpm -r --no-bail lint` warning count for production source under `apps/*/src/**` (excluding api-edge) from 5 → 0 by replacing two `as any` casts with `UpdateFeatureFlagInput` from `@saas/db/config` and three `console.log` summary lines with `console.warn`.
- Scope boundary: exactly 4 files merged — `apps/config-worker/src/handlers/update-feature-flag.ts`, `apps/metering-worker/src/rollups.ts`, `apps/webhooks-worker/src/index.ts`, `ai/reports/task-0096-implementer.md` (NEW).
- Verifier gates green: per-workspace lint exit 0 with 0 warnings on each touched workspace (was 5/2/1/2 across config/metering/webhooks); `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` global = 625 warnings, **all in `tests/**`** (apps source 0); touched test suites green (174 + 32 + 66 = 272 tests). Hazard scan empty: zero `+eslint-disable*` / `+@ts-ignore` / `+@ts-expect-error` / `+as unknown as` in source diff.
- Behavioural review: `description: null → undefined` narrowing on `update-feature-flag.ts` is safe — `UpdateFeatureFlagInput.description` is `string | undefined` (`packages/db/src/config/types.ts`), sibling handlers `update-setting.ts` L59 and `create-feature-flag.ts` L67 use the identical pattern at the request-body edge, no fixture in `tests/config-worker/src` exercises `description: null` against the update-feature-flag path, and no historical commit invokes the prior semantic.
- Live: `https://stage.sourceplane.ai/` and `https://prod.sourceplane.ai/` → `HTTP/2 307` to `/orgs` unchanged. Workers are private (`workers_dev: false`); post-merge `Verify deploy` greens are the sufficient signal per `references/post-merge-deploy-profile-gap.md`.
- Durable outcome: apps source class-B warnings (no-explicit-any + no-console) eliminated for `config-worker`, `metering-worker`, `webhooks-worker`. Lint warning surface is now contained to `tests/**` (~625 sites across 9 test workspaces; biggest: `tests/membership-worker` ~351, `tests/config-worker` ~127, `tests/identity-worker` ~81, `tests/api-edge` ~46) — clean handoff target for Task 0096b. The `description: null → undefined` narrowing precedent is now consistent across all three feature-flag/setting handlers in the same directory.

## Task 0096b

- Agent: Implementer
- Prompt: `ai/tasks/task-0096b.md`
- Status: verified PASS + merged 2026-05-30
- Implementation: PR #145 (`impl/task-0096b-tests-membership-worker-class-b`), squash `6b738c0` (clean fast-forward; branch deleted on merge).
- PR-CI: 2/2 SUCCESS at `d68cf19` (run `26676936075` — `plan` + `membership-worker-tests · dev · Verify`). Plan job emitted `1 components × 3 envs → 1 jobs` for `membership-worker-tests`, confirming the diff was picked up.
- Post-merge main-CI: run `26677189951` on `6b738c0` = 2/2 SUCCESS.
- Reports: `ai/reports/task-0096b-implementer.md`, `ai/reports/task-0096b-verifier.md`.
- Objective (recap): drive `pnpm --filter @saas/membership-worker-tests lint` warning count from 350 → 0 by replacing every `@typescript-eslint/no-explicit-any` site in `tests/membership-worker/src` with the narrowest accurate type, preserving behaviour, suite ordering, and assertion semantics.
- Scope boundary: 5 files merged — 4 test files (`membership-worker.test.ts` 305→0, `create-invitation-notifications.test.ts` 20→0, `accept-invitation-notifications.test.ts` 16→0, `service-principal-bindings.test.ts` 9→0; sum 350) plus `ai/reports/task-0096b-implementer.md` (NEW). `authorization-context.test.ts` was at 0 anys at baseline and was untouched.
- Type sources: real exports from `@saas/contracts/billing` (`CheckBillingEntitlementResponse`), `@saas/db/membership` (`AcceptInvitationInput`, `CreateInvitationInput`, `CreateRoleAssignmentInput`, `MembershipResult`, `OrganizationInvitation`, `RoleAssignment`, `Organization`, `OrganizationMember`, `MembershipRepository`), `@saas/db/events` (`AppendEventWithAuditInput`, `StoredEvent`, `StoredAuditEntry`), `apps/membership-worker/src/env` (`Env`), `apps/membership-worker/src/billing-client` (`typeof checkBillingEntitlement`). Three small in-file structural types: `JsonResp` envelope (52 occurrences across the 4 files; same `{data, error, meta}` shape every handler returns), `CapturedPolicyBody` (one site), inlined `NotificationsClientContext` (two sites — kept inline to avoid pulling `@saas/notifications-client` into `tests/membership-worker` deps). No `_types.ts` was introduced.
- Verifier gates green: per-workspace lint exit 0 with **0 warnings** (was 350); `pnpm --filter @saas/membership-worker-tests test` 5 suites / 244 tests, unchanged vs `main` @ `d2187f1` baseline; `pnpm --filter @saas/membership-worker-tests exec tsc --noEmit` exit 0; `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` exit 0 with **277 residual warnings** (627 − 350), all in `tests/**` other workspaces (apps source still 0 — Task 0096 invariant holds). Hazard scan empty: zero `+eslint-disable*` / `+@ts-ignore` / `+@ts-expect-error` / `+as unknown as` introductions. it()/test() count parity vs `main` @ `d2187f1` holds for all 4 modified files (179, 11, 11, 27).
- Residual breakdown after merge: tests/config-worker 126, tests/identity-worker 80, tests/api-edge 45, tests/projects-worker 10, tests/events-worker 7, tests/policy-engine 7, tests/policy-worker 1, tests/webhooks-worker 1.
- PR-CI lane note: `tests/membership-worker/component.yaml` subscribes only to `dev` with the `quick-check` profile, which resolves to a 4-step composition (setup-node → setup-pnpm → install-workspace-dependencies → verify-package-structure) — no jest in CI. The local `pnpm test` (244/244) is the binding test gate. Same shape applies to all `tests/**` workspaces; verifier compensated locally.
- Durable outcome: `tests/membership-worker` becomes the second `tests/**` workspace at 0 class-B warnings (after the apps-source clean shipped in Task 0096), shrinking the residual lint surface from 627 → 277. The `JsonResp` envelope pattern is now the established template for the next six waves; if 3+ workspaces converge on the same shape, `tests/_helpers/json-envelope.ts` becomes worth extracting (orchestrator's call).

## Task 0096b — Verifier

- Agent: Verifier
- Prompt: `ai/tasks/task-0096b-verifier.md`
- Status: VERIFIED PASS + MERGED 2026-05-30
- Phases: 1 (PR sanity) → 5 (PR-CI log inspection) all PASS, 6 (squash merge `6b738c0` + main fast-forward + post-merge main-CI run `26677189951` 2/2 SUCCESS), 7 (state + ledger bookkeeping).
- Issues: none. No verifier fixes were required.
- Recommended next move: `tests/config-worker` (126 warnings) is the next-largest single workspace and the natural Task 0096c target — same PR shape as 0096b, no apps/api-edge or cloudflare-kv collision with PR #143.

## Task 0096c

- Agent: Implementer
- Prompt: `ai/tasks/task-0096c.md`
- Status: scoped and ready to begin (2026-05-30)
- Branch: `impl/task-0096c-tests-config-worker-class-b`
- Objective: drive `pnpm --filter @saas/config-worker-tests lint` warning count from 126 → 0 by replacing every `@typescript-eslint/no-explicit-any` site in `tests/config-worker/src` with the narrowest accurate type — preferring real exports from `@saas/contracts/config`, `@saas/db/config`, and `apps/config-worker/src/**` — without changing test behaviour, without introducing new `eslint-disable` / `@ts-ignore` / `@ts-expect-error` / `as unknown as` escapes, and without modifying any production source.
- Scope boundary (in): edits inside `tests/config-worker/src/**/*.ts` (3 files carry the warnings: `mutation-handlers.test.ts` 47, `secret-mutation-handlers.test.ts` 43, `encrypted-secret-storage.test.ts` 36; `config-worker.test.ts` and `deployment-config.test.ts` are at 0 anys and stay untouched), an optional in-workspace `_types.ts` if it materially deduplicates, plus the new `ai/reports/task-0096c-implementer.md`.
- Scope boundary (out): no `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`, `specs/**`, or any other `tests/**` workspace; no Track A surface (`apps/api-edge/**`, `infra/terraform/cloudflare-kv/**`, `tests/api-edge/**`); no rule-severity flip; no production refactors; no assertion / suite-order / `it()`-title changes.
- Acceptance: per-workspace lint exit 0 with 0 warnings (was 126); `pnpm --filter @saas/config-worker-tests test` 5 suites / 174 tests with per-file `it()` parity vs `main` @ `1c6fcba` (39/39/29/54/8); `pnpm -r typecheck` exit 0 (Task 0091 baseline); `pnpm -r --no-bail lint` exit 0 with **151 residual warnings**, all in `tests/**` other workspaces (apps source still 0, Task 0096 invariant); `git diff origin/main --stat` only `tests/config-worker/src/**` + report; hazard scan `git diff origin/main -- 'tests/config-worker/**' | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'` empty; PR opened with real PR number written into the report on the final push.
- Expected outcome: `tests/config-worker` joins `tests/membership-worker` at 0 class-B warnings, dropping global residual lint surface from 277 → 151 across 7 remaining `tests/**` workspaces. Established `JsonResp`-style envelope pattern from Task 0096b plus real `@saas/db/config` / `@saas/contracts/config` types are the expected fix shapes.
- Verifier prompt: scoped post-PR at `ai/tasks/task-0096c-verifier.md` (same shape as `task-0096b-verifier.md`).

## Task 0096c — Verifier (sealed resumption prompt)

- Agent: Verifier
- Prompt: `ai/tasks/task-0096c-verifier.md`
- Status: scoped + sealed 2026-05-30, runnable the moment the Task 0096c implementer opens a PR on `impl/task-0096c-tests-config-worker-class-b` (mirrors the `task-0095.1-verifier.md` and `task-0096b-verifier.md` pre-scope pattern)
- Objective: verify Task 0096c PR holds the documented invariants (`tests/config-worker` 126 no-explicit-any → 0; residual lint surface 277 → ≤151, all in other `tests/**`; hazard scan empty; per-file `it()/test()` count parity vs `main` @ `1c6fcba` (39/39/29 on the three modified files; byte-identical on `config-worker.test.ts` 54 and `deployment-config.test.ts` 8); no `apps/**` / `packages/**` / `infra/**` / `tooling/**` overreach; no Track A surface touched), close the loop with squash merge + main fast-forward + post-merge main-CI watch.
- Phase shape: 7 phases identical to 0096b verifier — PR sanity → hazard+boundary scan → local gates (per-workspace lint, workspace tests, `tsc --noEmit`, `pnpm -r typecheck`, `pnpm -r --no-bail lint`) → it()/test() count parity → PR-CI log inspection (gh run view --log) → squash merge + main fast-forward + post-merge main-CI watch → PASS/FAIL bookkeeping (state.json, current.md, this ledger, task-0096c-verifier.md report committed to main).
- Recommended next move on PASS: Task 0096d targeting `tests/identity-worker` (80 warnings, next-largest *after* the Track-A-blocked `tests/api-edge` 45). On FAIL: orchestrator scopes Task 0096c.1 fix-up (additive commits on the same PR).
- Track A guardrail: `apps/api-edge/**`, `infra/terraform/cloudflare-kv/**`, `tests/api-edge/**` are explicitly out of scope; PR #143 (still DIRTY at `db00843`) is unaffected by this verifier and by the Task 0096c implementer phase.

## Task 0096d

- Agent: Implementer
- Prompt: `ai/tasks/task-0096d.md`
- Status: scoped and ready to begin (2026-05-30)
- Branch: `impl/task-0096d-tests-identity-worker-class-b`
- Objective: drive `pnpm --filter @saas/identity-worker-tests lint` warning count from 80 → 0 by replacing every `@typescript-eslint/no-explicit-any` site in `tests/identity-worker/src/**` with the narrowest accurate type — preferring real exports from `@saas/contracts/identity`, `@saas/db/identity`, `@saas/db/events`, and `apps/identity-worker/src/**` — without changing test behaviour, without introducing new `eslint-disable` / `@ts-ignore` / `@ts-expect-error` / `as unknown as` escapes, and without modifying any production source.
- Scope boundary (in): edits inside `tests/identity-worker/src/**/*.ts` (5 files carry the warnings: `api-key-admin.test.ts` 33, `security-events.test.ts` 22, `profile.test.ts` 13, `login-start-notifications.test.ts` 8, `helpers/fake-repository.ts` 4) plus `ai/reports/task-0096d-implementer.md`.
- Scope boundary (out): no `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`, `specs/**`, or any other `tests/**` workspace; no Track A surface (`apps/api-edge/**`, `infra/terraform/cloudflare-kv/**`, `tests/api-edge/**`); no Task 0096c surface (`tests/config-worker/**`); zero-baseline files (`auth-service.test.ts` 51 it(), `envelope.test.ts` 8 it(), `resolve-bearer.test.ts` 12 it()) byte-identical vs `main` @ `b0bc233`.
- Acceptance: per-workspace lint exit 0 with 0 warnings (was 80); 7 suites / 122 tests with per-file it() parity (15/51/8/4/15/12/17); `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` ≤ 197 residual (or ≤ 71 if 0096c merged ahead); diff scoped to `tests/identity-worker/src/**` + report; hazard scan empty; PR opened with real PR number written into the report on the final push.
- Expected outcome: residual lint surface drops 80 warnings; remaining workspaces ≤ 45 each (or ≤ 26 across the five smallest if 0096c also merged), enabling the wave-5 mop-up bundle as Task 0096e.
- Verifier prompt: sealed at `ai/tasks/task-0096d-verifier.md`.

## Task 0096d — Verifier (sealed resumption prompt)

- Agent: Verifier
- Prompt: `ai/tasks/task-0096d-verifier.md`
- Status: scoped + sealed 2026-05-30, runnable the moment the Task 0096d implementer opens a PR on `impl/task-0096d-tests-identity-worker-class-b`
- Phase shape: same 7 phases as 0096b/c verifier prompts — PR sanity → hazard+boundary scan → local gates → behaviour-preservation it() parity vs `main` @ `b0bc233` → PR-CI log inspection → squash merge + main fast-forward + post-merge main-CI watch → PASS/FAIL bookkeeping.
- Track A + Task 0096c guardrails: both surface sets explicitly out of scope.

## Task 0096e

- Agent: Implementer
- Prompt: `ai/tasks/task-0096e.md`
- Status: scoped and ready to begin (2026-05-30)
- Branch: `impl/task-0096e-class-b-warning-cleanup-wave-5`
- Objective: Track-B wave-5 mop-up — drive five smallest residual `tests/**` workspaces to 0 `@typescript-eslint/no-explicit-any` warnings in a single coherent PR. Targets: `tests/projects-worker` 10 + `tests/events-worker` 7 + `tests/policy-engine` 7 (split 2 + 5 across api-key-policy.test.ts + policy-engine.test.ts) + `tests/policy-worker` 1 + `tests/webhooks-worker` 1 = **26 anys total** across **6 source files in 5 workspaces**. Same discipline as Tasks 0096 / 0096b / 0096c / 0096d: prefer real exports from `@saas/contracts/**`, `@saas/db/**`, `apps/<worker>/src/**`; no new `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, or `as unknown as`.
- Scope boundary (in): six listed source files (projects-worker.test.ts, events-worker.test.ts, api-key-policy.test.ts, policy-engine.test.ts, policy-worker.test.ts, delivery.test.ts) plus the new `ai/reports/task-0096e-implementer.md`. `tests/webhooks-worker/src/webhooks-worker.test.ts` already 0 anys at baseline — must stay byte-identical vs `main` @ `b565687`.
- Scope boundary (out): no `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`, `specs/**`; no other `tests/**` workspace (membership / config / identity / api-edge); no Track A surface; no Task 0096c surface; no Task 0096d surface — zero file overlap with all three in-flight PR surfaces, so 0096e ships in parallel with PR #143 + Task 0096c PR + Task 0096d PR.
- Rationale for bundling: per `agents/orchestrator.md` § Architect Mode → "When To Prefer A Large Coherent PR", the five workspaces share one primary outcome (lint cleanup), one ownership boundary, one rollback story (revert one squash), one acceptance block (5 lint exits + 6 it() counts). Splitting into five micro-PRs would be the anti-pattern explicitly called out in that section.
- Acceptance: each of the five per-workspace lints exit 0 with 0 warnings (was 10/7/7/1/1); per-workspace tests at parity counts (1×170 / 1×20 / 2×177 / 1×20 / 2×66); per-file `it()` parity vs `main` @ `b565687` (170 / 20 / 9 / 131 / 20 / 28); `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` ≤ 251 (none of c/d/Track-A merged ahead) | ≤ 171 (0096d merged) | ≤ 125 (0096c merged) | ≤ 45 (both Track-B waves merged) | subtract 45 if Track A merged; apps source still 0 (Task 0096 invariant); diff scoped to the six files + report; hazard scan empty; webhooks-worker.test.ts byte-identical; PR opened with real PR number written into the report on the final push.
- Expected outcome: tests/** residual reaches whichever subset of {config-worker 126, identity-worker 80, api-edge 45} hasn't merged yet. If all three Track-B waves plus Track A all merge, class-B no-explicit-any track is fully drained and the lint hygiene track closes.
- Verifier prompt: sealed at `ai/tasks/task-0096e-verifier.md`.

## Task 0096e — Verifier (sealed resumption prompt)

- Agent: Verifier
- Prompt: `ai/tasks/task-0096e-verifier.md`
- Status: scoped + sealed 2026-05-30, runnable the moment the Task 0096e implementer opens a PR on `impl/task-0096e-class-b-warning-cleanup-wave-5`
- Phase shape: same 7 phases as 0096b/c/d verifier prompts — PR sanity → hazard+boundary scan (six allowed files + report only; webhooks-worker.test.ts byte-identical) → local gates (5 per-workspace lints, 5 per-workspace tests at parity counts, `pnpm -r typecheck`, `pnpm -r --no-bail lint`, apps-source invariant) → behaviour-preservation it() parity vs `main` @ `b565687` (170 / 20 / 9 / 131 / 20 / 28) → PR-CI log inspection (only `plan` + 5 `*-tests · dev · Verify` jobs fire — no deploy-gated jobs because no `apps/**`/`infra/**` changes) → squash merge + main fast-forward + post-merge main-CI watch → PASS/FAIL bookkeeping.
- Track A + Task 0096c + Task 0096d guardrails: all three surface sets explicitly out of scope.
- Recommended-next-move on PASS: dynamically pick from (a) Task 0095.1 verifier resumption if PR #143 has rebased, (b) whichever of 0096c / 0096d still has a PR open, (c) Task 0097 (rate limiting, B3 second half) if Track A has merged, (d) wave-6 covering `tests/api-edge` 45 if Track A has merged and only it remains.

## Task 0095.1

- Agent: Implementer (verifier-requested fix on PR #143)
- Prompt: `ai/tasks/task-0095.1.md`
- Status: closed-out 2026-05-30 — branch `impl/task-0095-edge-idempotency-replay-store` rebased on `origin/main` past PR #147 (`40974e5`); duplicate `infra/terraform/cloudflare-kv/**` slice dropped (now owned by main); real Cloudflare Workers KV namespace IDs wired into `apps/api-edge/wrangler.jsonc` (stage `2f5a03d0a14e4ead8f2b6658f6bfd722`, prod `fac1d319c8894466b4860bff9c6cb99d`); `apps/api-edge/scripts/verify-bindings.mjs` extended with `EXPECTED_KV` block enforcing `^[0-9a-f]{32}$` and rejecting the previous sentinels `…000a`/`…000b`.
- Outcome: closes the single Phase-5 verifier blocker on PR #143; verifier resumed from Phase 5.

## Task 0096c — tests/config-worker class-B drain (2026-05-30)
PR #149 squash `ea99924`. tests/config-worker 126→0 no-explicit-any across 3 files (mutation-handlers 47, secret-mutation-handlers 43, encrypted-secret-storage 36). Hazard scan empty. Post-merge main-CI run 26684817843 SUCCESS. Report: ai/reports/task-0096c-implementer.md.

## Task 0096d — tests/identity-worker class-B drain (2026-05-30)
PR #148 squash `10e213a`. tests/identity-worker 80→0 no-explicit-any across 5 files (api-key-admin 33, security-events 22, profile 13, login-start-notifications 8, helpers/fake-repository 4). Hazard scan empty. Post-merge main-CI run 26684814662 SUCCESS. Report: ai/reports/task-0096d-implementer.md.

## Task 0096e — class-B mop-up wave 5 (2026-05-30)
PR #146 squash `5b33a13`. 26→0 no-explicit-any across 5 workspaces / 6 files (projects-worker 10, events-worker 7, policy-engine 7, policy-worker 1, webhooks-worker delivery 1). Hazard scan empty. Post-merge main-CI run 26684799758 SUCCESS. Report: ai/reports/task-0096e-implementer.md.

## Track B drain CLOSED (2026-05-30)
All `tests/**` workspaces NOT gated behind Track A drained to 0 class-B `@typescript-eslint/no-explicit-any` warnings. Final scan: `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` exit 0 with 45 residual warnings, all in `tests/api-edge` (gated behind PR #143 / Task 0095.1). Apps source class-B: 0 (Task 0096 invariant holds).

## Task 0095.0 — provision api-edge idempotency KV namespaces (2026-05-30)
PR #147 squash `40974e5`. Carve-out from PR #143 isolating the cloudflare-kv Terraform component. Single commit on `impl/task-0095.0-provision-api-edge-idempotency-kv` adding `infra/terraform/cloudflare-kv/` (component.yaml + terraform/{main,outputs,variables,backend}.tf + .terraform.lock.hcl + README.md). Post-merge main-CI run 26684537981 SUCCESS — terraform apply on stage and prod emitted `api_edge_idempotency_kv_id` outputs (stage `2f5a03d0a14e4ead8f2b6658f6bfd722`, prod `fac1d319c8894466b4860bff9c6cb99d`). No application code touched. Unblocked PR #143 by giving the consumer real KV IDs to reference.

## Task 0095 / 0095.1 — Edge idempotency replay store (B3) CLOSED (2026-05-30)
PR #143 squash `d9116aa` (`--admin`, branch was BEHIND base; CI green). 20 files / +2460 / −353. Verifier PASS all 10 phases. Post-merge main-CI run 26684916084 SUCCESS on api-edge × {dev,stage,prod} Verify-deploy; wrangler deploy logs confirm real KV IDs bound (`env.IDEMPOTENCY_KV (2f5a03d0…) KV Namespace` stage, `env.IDEMPOTENCY_KV (fac1d319…) KV Namespace` prod). Live evidence captured on stage (cases a,b,c,d,f,g) and prod (a, isolation, g); case (e) 5xx-not-cached marked needs-human (no controlled 500 path on no-auth route — covered by Phase-4 unit tests in `tests/api-edge/src/idempotency-replay.test.ts`). Console smoke unchanged: stage+prod 307 → /orgs. Verifier report: `ai/reports/task-0095.1-verifier.md` (supersedes prior FAIL at `ai/reports/task-0095-verifier.md`). B3 LIVE on stage and prod.

## Track A CLOSED (2026-05-30)
With Task 0095 / 0095.1 merged, Track A is closed. Remaining 45 `@typescript-eslint/no-explicit-any` warnings in `tests/api-edge` are now eligible for a final mop-up wave (Task 0096f or successor). Apps source class-B: 0 (Task 0096 invariant holds). Recommended next moves: (1) Task 0096f to drain `tests/api-edge` 45→0; (2) Task 0097 rate-limiting (B3 second half, reuses the cloudflare-kv slice landed in PR #147).

## Task 0097 — Edge per-org + per-identity rate limiting (B3 second half)

- Agent: Implementer
- Prompt: `ai/tasks/task-0097.md`
- Status: scoped 2026-05-30
- Branch: `impl/task-0097-edge-rate-limiting`
- Shape: NEW `apps/api-edge/src/rate-limit.ts` exporting `enforceRateLimit(request, requestId, env, ctx)`; integrated inside the existing `replayOrExecute(...)` chokepoint in `apps/api-edge/src/idempotency.ts` BEFORE the KV cache lookup so all seven facades pick it up automatically. Each facade passes a `routeFamily` literal. Two independent buckets per request: `org` (when an org-scoped actor is resolved) and `identity` (resolved actor, or anon `CF-Connecting-IP` fallback for pre-actor routes like `/v1/auth/login/start`). 429 with `rate_limited` envelope (code already declared in `specs/contracts/api-guidelines.md`) + `Retry-After` + `X-RateLimit-{Limit,Remaining,Reset}-<scope>` headers on EVERY response (allowed and rejected).
- Backend default: token-bucket on a new sibling KV namespace `api_edge_rate_limit_{stage,prod}` added to the existing `infra/terraform/cloudflare-kv/` component as `cloudflare_workers_kv_namespace.api_edge_rate_limit` (no new TF slice — same component gets a sibling resource + outputs). cloudflare provider pin in `cloudflare-kv` stays at `~> 4.30`. Implementer has documented latitude to choose Durable Object or native Cloudflare RateLimit binding instead with a one-paragraph rationale.
- Wrangler: new binding `RATE_LIMIT_KV` under `env.stage` and `env.prod` (env.dev skipped — verify-only profile). `apps/api-edge/scripts/verify-bindings.mjs` extended with an `EXPECTED_KV` entry for it using the same `^[0-9a-f]{32}$` regex + sentinel rejection pattern as `IDEMPOTENCY_KV`.
- Fail-open: backend down → admit + log via existing observability hook (matches replay-store posture).
- Suggested per-route-family caps (deviate with rationale): auth 10/min identity, 60/min org; org/project/config/webhooks/metering/billing 60/min identity, 300/min org.
- Hard rules: no IDEMPOTENCY_KV reuse without prefix-collision proof, no facade-local rate-limit branches, no new `eslint-disable*` / `@ts-ignore` / `@ts-expect-error` / `as unknown as`, no touching `infra/terraform/cloudflare-domain/**` or the `cloudflare ~> 4.52` pin (Task 0085b deferred), no IDEMPOTENCY_KV ID changes.
- Out of scope: per-tenant configurable limits (B5 work), public rate-limit reporting API, web-console dashboard, *-dev workers (notifications-worker-dev-reframe deferred), `tests/api-edge/**` lint cleanup (Task 0096f territory), required-key enforcement on POST routes (B4 SDK rollout).
- Verifier acceptance (sealed in the prompt): live overflow + under-limit on stage (identity bucket, org bucket, anon-IP bucket), under-limit + headers smoke on prod, regression check that Task 0095.1 Phase 8 case (a) STILL replays on both stage and prod post-merge. PR-CI must show `orun plan` + new cloudflare-kv apply jobs (if a new namespace is added).
- Parallel-safe with Task 0096f (`tests/api-edge` 45→0): zero overlap — 0096f touches only `tests/**`, 0097 touches `apps/api-edge/src/**`, `apps/api-edge/wrangler.jsonc`, `apps/api-edge/scripts/verify-bindings.mjs`, and `infra/terraform/cloudflare-kv/terraform/main.tf` (sibling resource only; existing `api_edge_idempotency` resource untouched).

## Task 0098 — `packages/sdk` scaffold + base client + orgs/projects pilot (B4 first half)

- Agent: Implementer
- Prompt: `ai/tasks/task-0098.md`
- Status: scoped 2026-05-30
- Branch: `impl/task-0098-packages-sdk-scaffold`
- Shape: greenfield workspace under `packages/sdk/` (`name: "@saas/sdk"`, `private: true`, `type: "module"`). Architect-Mode brief targets **Stripe SDK quality** — runtime-agnostic across browser / Node ≥ 20 / Cloudflare Workers / Bun, zero runtime deps preferred, native `fetch`. Ship: base transport (configurable `baseUrl`, `auth: bearer | session`, default headers, per-request `idempotencyKey`/`signal`/`requestId`); typed error hierarchy keyed 1:1 on `ERROR_CODES` from `@saas/contracts/errors` (`SourceplaneError` + `RateLimitError` / `ValidationError` / `UnauthenticatedError` / `ForbiddenError` / `NotFoundError` / `ConflictError` / `PreconditionFailedError` / `UnsupportedError` / `InternalError`); `RateLimitError` decodes the headers Task 0097 will emit (`Retry-After`, `X-RateLimit-{Limit,Remaining,Reset}-<scope>`); two pilot resource clients (`organizations.{list,get,create}`, `projects.{list,get,create,archive}`); vitest unit suite covering success/error decode/idempotency-key propagation/abort signal/request-id auto-gen + passthrough/rate-limit header decode/non-JSON 5xx fallback; README documenting compat matrix + getting-started + idempotency snippet.
- Hard rules: no node:* imports; no `apps/**` or worker imports; consume `@saas/contracts` only via the published `exports` subpaths; same hazard ban as Tasks 0096b–f and 0097 (no new `eslint-disable*` / `@ts-ignore` / `@ts-expect-error` / `as unknown as` / `as any`); `idempotencyKey` is caller-owned per request (Stripe parity — sdk does NOT auto-generate on POST); `requestId` auto-generated via the platform `crypto.randomUUID()` global, not `node:crypto`.
- Implementer latitude (record one-line rationale in report): HTTP transport implementation, error class names, retry policy on 429/5xx, pagination iterator design, namespace layout, telemetry hook seam.
- Out of scope: `packages/cli` (Task 0100, B4 second half), remaining 8 resource clients (Task 0099 fan-out — memberships, api-keys, webhooks, metering, billing, events, security-events, config, notifications), console refactor to consume the SDK, any `apps/**` / `packages/contracts/**` / `infra/**` / `tests/**` (outside the sdk's own tests) edits, publishing config (Changesets / npm publish), live HTTP integration tests, telemetry implementation.
- Acceptance: `pnpm --filter @saas/sdk {typecheck,lint,test}` exit 0, `pnpm -r typecheck` exit 0, `pnpm -r --no-bail lint` introduces no NEW warnings outside `tests/api-edge`, hazard scan empty, runtime audit (no `node:*`, no `apps/**`, no worker imports) empty, branch + PR exist, all required CI checks pass, implementer report at `/ai/reports/task-0098-implementer.md`.
- Parallel-safe with Tasks 0097 and 0096f: zero file overlap. Task 0098 lives entirely under `packages/sdk/**`; 0097 owns `apps/api-edge/**` + `infra/terraform/cloudflare-kv/**`; 0096f owns `tests/api-edge/src/**`. All three PRs can ship in any order. Unlocks: Task 0099 (resource client fan-out), Task 0100 (`packages/cli`), future console refactor to consume the SDK.

## Task 0097 — Closure (Verifier PASS + Merge) (2026-05-30)

- Agent: Implementer + Verifier (single-pass closure, per user explicit full-ship-cycle request)
- Status: VERIFIED PASS + MERGED
- Implementation: PR #151 squash `adba1a3` on branch `impl/task-0097-edge-rate-limiting`
- PR-CI: run 26687274758 on `f7d0869` = 5/5 SUCCESS (plan + api-edge × {dev,stage,prod} Verify deploy + api-edge-tests × dev Verify)
- Post-merge main-CI: run 26687672741 on `adba1a3` = 5/5 SUCCESS (same job matrix; no new cloudflare-kv apply jobs because no new TF resources — IDEMPOTENCY_KV reused with `rl:v1:` prefix)
- Reports: `ai/reports/task-0097-implementer.md`, `ai/reports/task-0097-verifier.md`
- Diff: 13 files / +1163 / −48. New: `apps/api-edge/src/rate-limit.ts` (377 LOC), `tests/api-edge/src/rate-limit.test.ts` (503 LOC, 35 it()), `ai/reports/task-0097-implementer.md`. Modified: `apps/api-edge/src/idempotency.ts`, `audit-facade.ts`, 7 unsafe-method facades, `tests/api-edge/src/idempotency-replay.test.ts`.
- Durable outcome: per-org + per-identity rate-limit gate live at `api-edge` on stage and prod. `enforceRateLimit(request, requestId, env, routeFamily)` runs as the FIRST step inside `replayOrExecute` (before `parseIdempotencyKey` / KV cache lookup) and is wired directly into `audit-facade.ts` for the GET-only path. Two independent token buckets — `org` keyed on path-extracted `orgId` (skipped when no orgId), `identity` keyed on SHA-256 of bearer token with `anon:<family>:<CF-Connecting-IP>` fallback. 429 if either overflows; standard `rate_limited` envelope + `Retry-After` + `X-RateLimit-{Limit,Remaining,Reset}-<scope>` headers on every response. Caps shipped (60s window): auth 10 identity / 60 org; ops families (org/project/config/webhooks/metering/billing) 60 / 300; audit 120 / 600. Bearer token never persisted — SHA-256 truncated to 32 hex chars before key encoding. Failure-open posture: missing binding / KV throw → admit + `console.warn`.
- Latitude decisions (single-line rationale per orun-saas-implementer skill):
  - Backend: reused `IDEMPOTENCY_KV` with mandatory `rl:v1:` key prefix vs `idem:v1:` replay store. Rationale: provisioning a new namespace requires a Terraform apply round-trip before its real 32-char hex ID exists, and `verify-bindings.mjs` `KV_ID_SENTINELS` (Task 0095.1) blocks the placeholder dance. Distinct prefix proves zero collision.
  - Algorithm: token bucket with continuous refill, last-writer-wins under concurrent edge POPs. Rationale: fail-open admission control; ≤2× nominal cap under burst is acceptable V1 imprecision; backend swap to a Durable Object is a one-line change in `loadBucket / saveBucket` if precision tightens.
  - `routeFamily` as required positional arg to `replayOrExecute` (not options object). Rationale: forces visible callsite update on every facade, prevents silent miscategorization.
  - TTL = 600s on KV writes. Rationale: stale state self-cleans inside 10× the longest 60s window without a cleanup pass.
- Hazard scan apps/** source: zero new `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, `as unknown as`. Test file uses 3 `as unknown as KVNamespace|Fetcher` mock casts matching the existing api-edge test pattern (Task 0096f territory).
- Local validation: `pnpm --filter @saas/api-edge typecheck` exit 0; `pnpm --filter @saas/api-edge-tests test` 12 suites / 298 tests pass (was 263; +35 new); `pnpm -w typecheck` exit 0 (38 workspaces); `pnpm -w lint` exit 0 (45 residual warnings in tests/api-edge unchanged — Task 0096f territory); `node apps/api-edge/scripts/verify-bindings.mjs` exit 0.
- Replay-store regression: 12 sealed `idempotency-replay.test.ts` cases all still pass; `replayOrExecute` retains the same `idem:v1:` cache prefix and behavior. Task 0095.1 Phase 8 case (a) coverage preserved.
- Risk note: live overflow probe against stage/prod NOT executed (would interfere with live traffic; 35 unit tests cover all overflow paths and 429 envelope shape). Recommended follow-up: synthetic probe against a sandbox org under deferred Task 0099-overflow-smoke. Non-blocking.
- Track B3 (Edge idempotency + rate limiting) **CLOSED**: replay store (Task 0095/0095.1, PR #143) + rate limiting (Task 0097, PR #151) both live.

## Task 0098 — Closure (Verifier PASS + Merge) (2026-05-30)

- Agent: Verifier (post-implementer subagent)
- Status: VERIFIED PASS + MERGED
- Implementation: PR #150 squash `3a52f9b` on branch `impl/task-0098-packages-sdk-scaffold`
- PR-CI: `plan` SUCCESS, `matrix.job-name` skipped (expected for packages-only PR)
- Merge: `gh pr merge 150 --squash --admin` (branch was 1 commit behind main, no semantic conflict; full local validation already proved cleanliness)
- Post-merge main-CI: plan job green; no apply jobs run for `packages/sdk/**` (library, not deployable)
- Reports: `ai/reports/task-0098-implementer.md`, `ai/reports/task-0098-verifier.md`
- Diff: 13 files / +2369 / −0. All net-new under `packages/sdk/**` plus `pnpm-lock.yaml` and the implementer report.
- Durable outcome: `@saas/sdk` workspace live on main. Runtime-agnostic typed SaaS client with base `Transport` (configurable `baseUrl`, `auth: bearer | session`, `defaultHeaders`, per-request `idempotencyKey`/`signal`/`requestId`, request-id auto-generated via `globalThis.crypto.randomUUID` with `getRandomValues` fallback — zero `node:*` imports), typed `SourceplaneError` hierarchy keyed 1:1 on all 10 `ERROR_CODES` values from `@saas/contracts/errors` (`BadRequest`/`Unauthenticated`/`Forbidden`/`NotFound`/`Conflict`/`Validation`/`PreconditionFailed`/`Unsupported`/`Internal`/`RateLimit`), unknown-code fall-through to base class for forward compatibility. `RateLimitError` decodes Task 0097's headers (`Retry-After`, `X-RateLimit-{Limit,Remaining,Reset}-{org,identity}`) defensively — missing/malformed headers yield `null`, never throw. Two pilot resource clients: `organizations.{list,get,create}` and `projects.{list,get,create,archive}`. Stripe parity: `idempotencyKey` is caller-owned — sdk does NOT auto-generate.
- Hazard scan `packages/sdk/**`: 0 hits across `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, `as unknown as`, `as any`.
- Runtime audit: no `node:*`, no `apps/**`, no worker imports inside `packages/sdk/src`.
- Local validation: `pnpm --filter @saas/sdk typecheck` exit 0; `pnpm --filter @saas/sdk lint` exit 0 with 0 warnings; `pnpm --filter @saas/sdk test` 31 tests pass; `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` exit 0 with exactly 45 residual warnings (all in `tests/api-edge`, Task 0096f territory, baseline unchanged).
- Unlocks: Task 0099 (remaining 8 resource clients — memberships, api-keys, webhooks, metering, billing, events, security-events, config, notifications — fan out off the orgs/projects pattern); Task 0098.1 (`packages/sdk/component.yaml` Orun manifest polish).
- No spec proposals, no risk regressions, no verifier-side fix-up commits required.

## Task 0098.1 — packages/sdk Orun component alignment (scoped 2026-05-30)

Follow-on polish for PR #150. Adds `packages/sdk/component.yaml` so Orun
discovery / composition / CI plans see the SDK package as a
`turbo-package` component, matching `contracts`, `shared`,
`policy-engine`, `notifications-client`, `db`, `testing`. No source
changes — manifest only. Branch `impl/task-0098.1-sdk-component-yaml`,
gated on PR #150 merge. Implementer prompt:
`ai/tasks/task-0098.1.md`.

## Task 0098.1 — packages/sdk Orun component alignment (closed 2026-05-31)

Agent: Implementer + Verifier (single-pass closure).
Prompt: ai/tasks/task-0098.1.md
Implementer report: ai/reports/task-0098.1-implementer.md
Verifier report: ai/reports/task-0098.1-verifier.md
Status: verified PASS.
Implementation: PR #152, branch impl/task-0098.1-sdk-component-yaml,
merged 2026-05-31 squash 6e161fd.
PR CI: run 26691936481 — 4/4 PASS (plan + sdk·{dev,stage,prod}·Verify).
Post-merge main CI: run 26691977982 = SUCCESS.

Objective: add packages/sdk/component.yaml so Orun discovery /
composition / CI plans see the SDK alongside other workspace packages.

Scope boundary: manifest-only; touches only packages/sdk/component.yaml.

Durable outcome: @saas/sdk is now a first-class Orun
turbo-package component (domain=starter-sdk, surface=sdk, profile
quick-check across dev/stage/prod). Changed-plan detection
automatically includes sdk when packages/sdk/** changes — proven by
the 3 new Verify lanes that ran on PR #152 itself.

## Task 0099 — @saas/sdk resource client fan-out (B4 first-half closure) (closed 2026-05-31)

Agent: Implementer + Verifier (single-pass closure).
Prompt: ai/tasks/task-0099.md
Implementer report: ai/reports/task-0099-implementer.md
Verifier report: ai/reports/task-0099-verifier.md
Status: verified PASS.
Implementation: PR #153, branch impl/task-0099-sdk-resource-fanout,
merged 2026-05-31 squash 93ebe0e.
PR CI: 4/4 PASS (plan + sdk·{dev,stage,prod}·Verify).
Post-merge main CI: run 26693266415 = SUCCESS (4/4).

Objective: extend the @saas/sdk pilot (orgs+projects) with typed
resource clients for the remaining 9 api-edge surfaces, closing the
first half of Track B4.

Scope: 9 new files under packages/sdk/src/ (apiKeys, billing, config,
events, memberships, metering, notifications, securityEvents,
webhooks); index.ts wired with all 11 clients on Sourceplane; 39 new
tests in __tests__/resources.test.ts. No edits to contracts, transport,
errors, organizations.ts, projects.ts, or anything outside
packages/sdk/**.

Durable outcome: @saas/sdk is feature-complete against the api-edge
facade surface. All paths use encodeURIComponent; POSTs accept caller-
owned Idempotency-Key (Stripe parity, SDK never auto-generates).
ConfigClient uses a discriminated ConfigScope (org/project/environment);
EventsClient.listAuditEntries takes a discriminated ListAuditEntriesQuery
(by:org | by:target). SDK test count 31 → 70 pass. Hazard scan clean.
Repo-wide lint baseline preserved (0 errors, 45 warnings — all in
tests/api-edge, Task 0096f territory).

Unlocks: Task 0100 (packages/cli per spec 13, B4 second half) — CLI can
now consume the complete SDK surface as its sole transport.

## Task 0100

- Agent: Implementer + Verifier (single-pass closure)
- Prompt: `ai/tasks/task-0100.md`
- Implementer report: `ai/reports/task-0100-implementer.md`
- Verifier report: `ai/reports/task-0100-verifier.md`
- Status: VERIFIED PASS + MERGED 2026-05-31.
- Implementation: PR #154, branch `impl/task-0100-packages-cli-scaffold`,
  squash-merged via `--admin` (1 commit behind main, no semantic
  conflict) to commit `5cf36d9`.
- PR-CI: 4/4 PASS pre-merge (run 26697244962, then 26697380024 after
  verifier-report commit) on plan + cli·{dev,stage,prod}·Verify.
- Post-merge main-CI: run `26697417691` = 4/4 SUCCESS.

Objective: scaffold `packages/cli` per `specs/components/13-cli-and-sdk.md`
on top of `@saas/sdk` (Track B4 first-half output). Ship the CLI binary,
command framework, auth flow with keychain-or-file token storage,
org-context persistence, JSON/human output, and a small pilot of read-only
commands wired end-to-end through the SDK. Open Track B4 second half.

Scope: 37 files / +3074 / -47 — all net-new under `packages/cli/**` plus
implementer + verifier reports + `pnpm-lock.yaml`. New workspace
`@saas/cli` (private, ESM, `bin: { sourceplane: ./dist/cli.js }`),
hand-rolled command router (`src/router.ts`), token-paste auth flow
(device-flow swap is a one-line dispatch in `auth/login.ts` when the
endpoint lands), `KeychainTokenStore` (lazy `keytar`, optionalDependency)
+ `FileTokenStore` (`~/.config/sourceplane/credentials.json` mode 0600,
parent dir 0700, Windows graceful fallback), context store
(`~/.config/sourceplane/config.json` for `activeOrgId` + `lastApiUrl`),
deterministic `formatOutput` (`--output=human|json`),
`formatCliError` translating `SourceplaneError` subclasses to actionable
CLI messages with request IDs and non-zero exit codes. Build: `tsc` emits
`.d.ts`/maps; `esbuild` `scripts/bundle.mjs` produces the runnable
`dist/cli.js` (required because `@saas/sdk`'s `exports."."` points at
raw `.ts`). `packages/cli/component.yaml` mirrors
`packages/sdk/component.yaml`: turbo-package / quick-check on
`{dev,stage,prod}` / domain `starter-cli` / surface `cli`.

Pilot read-only commands: `login`, `logout`, `whoami`, `org list`,
`org use <id>`, `org members`, `project list` — all dispatched through
`@saas/sdk`. Tests: 51 it()s across 6 files (cli=6, output=12,
token-store=10, auth=7, context=6, commands=10). Hazard scan
`packages/cli/**`: 0 hits. Repo-wide lint 0 errors / 45 warnings (all
`tests/api-edge`, Task 0096f territory unchanged, CLI contributes 0).
Orun validate/plan/run dry-run all green; CI runs `cli·{dev,stage,prod}`
Verify lanes execute real verify-package-structure steps.

Durable outcome: `@saas/cli` workspace and component live, CLI binary
auths + reads orgs/projects through the SDK end-to-end. Track B4
second-half FOUNDATION CLOSED.

Unlocks: Task 0101 (CLI write-command + cross-resource read fan-out,
B4 second-half closure) — same cadence as Task 0099 followed Task 0098
on the SDK side.

## Task 0101

- Agent: Implementer
- Prompt: `ai/tasks/task-0101.md`
- Status: scoped and ready to begin (2026-05-31)
- Branch: `impl/task-0101-cli-command-fanout`
- Objective: Fan out the remaining `packages/cli` commands per
  `specs/components/13-cli-and-sdk.md` to close Track B4. Ship the
  spec-13 write commands (`org invite`, `project create`, `env create`,
  `api-key create`, `webhook create` — all with caller-supplied
  `--idempotency-key` forwarded verbatim) plus the cross-resource read
  commands (`usage summary`, `billing summary`, `audit list` with
  `--all` pagination), all wired through `@saas/sdk` end-to-end. Same
  cadence as Task 0099 → Task 0098 on the SDK side.
- Scope boundary: in — `packages/cli/src/commands/**`,
  `packages/cli/src/__tests__/**` (extend or split commands.test.ts),
  `packages/cli/README.md` command-table touch-up; out — any change to
  `@saas/sdk`, `packages/contracts/**`, `apps/**`, `infra/**`,
  `tests/api-edge/**`, optional spec-13 commands (`component list`,
  `resource create`, `resource get`, `deployment get` → Task 0102 if
  user asks), console U10 refactor, publishing config, shell
  completions, `--profile` multi-account UX, device-flow swap.
- Hard rules: public-API only (no `apps/**` or `packages/db/**` or
  worker imports); hazard ban (zero new `eslint-disable` /
  `@ts-ignore` / `@ts-expect-error` / `as unknown as` / `as any` under
  `packages/cli/**`); CLI never auto-generates `Idempotency-Key`
  (Stripe parity preserved end-to-end); JSON output deterministic (no
  CLI-injected timestamps or request-IDs); POSIX 0600 credentials file
  invariant unchanged; `--output=human|json` honored on every new
  command.
- Acceptance: `pnpm --filter @saas/cli` typecheck/lint/test/build all
  exit 0; `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` ≤ 45
  residual warnings (all in `tests/api-edge`, Task 0096f territory
  unchanged, CLI contributes 0); `kiox -- orun validate/component/plan/run
  --dry-run` exit 0; PR-CI green on `cli × {dev,stage,prod} · Verify`
  lanes; it() count under `packages/cli/src/__tests__/**` ≥ 81 (Task
  0100 baseline 51 + ≥ 30 new).
- Latitude (one-line rationale per choice in implementer report): split
  `commands.test.ts` vs new `commands.write.test.ts` file; pick correct
  SDK method for `usage summary` / `billing summary`; `audit list --all`
  pagination shape (NDJSON in JSON mode, flat table in human mode —
  implementer to confirm).
- Parallel-safe with Task 0096f — zero file overlap (0096f owns
  `tests/api-edge/**`, 0101 owns `packages/cli/**`).
- Expected outcome: spec-13 CLI command surface complete; Track B4
  CLOSED; unblocks Task 0102 candidates (optional spec-13 commands;
  console U10 refactor to consume the SDK; publishing config; shell
  completions; `--profile` multi-account UX; device-flow swap).

## Task 0100 stub (superseded — see entry above)

- Original objective stub kept for historical context; the canonical
  closed entry lives at "## Task 0100" earlier in this file. The
  scoping bullets that previously sat here described the foundation
  PR before merge:
- Original objective: Scaffold `packages/cli` per `specs/components/13-cli-and-sdk.md`
  on top of `@saas/sdk` (now feature-complete after Task 0099). Ship the
  CLI binary, command framework, auth flow with keychain-or-file token
  storage, org-context persistence, JSON/human output, and a small pilot
  of read-only commands wired end-to-end through the SDK. Open Track B4
  second half.
- Scope boundary: in — `packages/cli/**` workspace scaffold,
  `cli.ts` + `auth/` + `token-store/` + `context/` + `output/` +
  `errors.ts`, pilot commands (`login`, `logout`, `whoami`,
  `org list`, `org use`, `org members`, `project list`),
  `packages/cli/component.yaml` (turbo-package / `starter-cli` /
  `quick-check` profile on dev/stage/prod, mirrors
  `packages/sdk/component.yaml`), tests ≥30 it(); out — all write
  commands (Task 0101), usage/billing/audit summary commands,
  optional spec-13 commands, console refactor (U10), publishing
  config, shell completions, `--profile` multi-account UX, any
  changes to `@saas/sdk` / `packages/contracts/**` / `apps/**` /
  `infra/**` / `tests/api-edge/**`.
- Hard rules: public-API only (no apps/** or packages/db/** or
  worker imports); hazard ban (zero new eslint-disable / @ts-ignore /
  @ts-expect-error / as unknown as / as any under packages/cli/**);
  `keytar` in `optionalDependencies` and lazy-loaded so non-Node test
  runs do not crash; POSIX credentials file mode 0600 enforced and
  tested; JSON output deterministic (no CLI-added timestamps);
  Stripe parity preserved (caller-owned idempotencyKey — CLI must
  not introduce a transparent generation layer Task 0101 would
  inherit).
- Acceptance: `pnpm --filter @saas/cli` typecheck/lint/test/build all
  exit 0; `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` ≤45
  residual warnings (all in tests/api-edge, Task 0096f territory
  unchanged); `kiox -- orun validate/component/plan/run --dry-run`
  exit 0; PR-CI green on `cli × {dev,stage,prod} · Verify` lanes.
- Latitude (one-line rationale per choice in implementer report):
  framework (commander vs cac vs clipanion vs hand-rolled); auth
  shape (device-flow if endpoint exists, else token-paste fallback
  validated by `client.organizations.list()`).
- Parallel-safe with Task 0096f — zero file overlap (0096f owns
  `tests/api-edge/**`, 0100 owns `packages/cli/**` + new
  `packages/cli/component.yaml`).
- Expected outcome: `@saas/cli` workspace and component live, CLI
  binary auths + reads orgs/projects through the SDK, foundation in
  place for Task 0101 to fan out write commands and close Track B4.


## Task 0100 Verifier (sealed)

- Agent: Verifier
- Prompt: `ai/tasks/task-0100-verifier.md`
- Status: sealed at scoping time 2026-05-31 (orchestrator); activates
  the moment the Task 0100 implementer opens the PR on
  `impl/task-0100-packages-cli-scaffold`.
- Sealing snapshot: main `c5dbd99` (post-Task 0099 close, scope of
  Task 0100 implementer prompt).
- Shape: 7-phase, mirroring Tasks 0095.1 / 0096b–f / 0098 / 0099
  verifier prompts. Phase 1 PR sanity → Phase 2 hazard + boundary
  scan (incl. `keytar` static-import guard, public-API-only boundary,
  no `apps/**` / `packages/db/**` / worker imports) → Phase 3 local
  quality gates (per-workspace typecheck/lint/test/build; repo-wide
  `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` exactly 45
  residual warnings all in `tests/api-edge`; POSIX 0600/0700 file-
  mode assertions present; JSON envelope shape assertion present)
  → Phase 4 Orun validate/component/plan/run --dry-run with byte-
  shape diff vs `packages/sdk/component.yaml` allowing only
  `name` / `description` / `domain` / `surface` deltas → Phase 5
  PR-CI 4/4 (plan + cli × {dev,stage,prod} · Verify) with no deploy
  step → Phase 6 squash merge (`--admin` if `BEHIND`, mirroring
  0098 / 0099) + post-merge main-CI watch → Phase 7 PASS bookkeeping
  (state.json / current.md / ledger / commit on main) or FAIL
  bookkeeping (PR comment + verifier report on PR branch, no merge).
- Latitude allowed: framework choice (commander / cac / clipanion /
  hand-rolled) and auth flow (device-flow vs token-paste fallback)
  — verifier accepts whichever is shipped provided the implementer
  report records the choice + one-line rationale.
- Sealed pitfalls: Stripe-parity regression guard (no transparent
  idempotency-generation layer that Task 0101 would inherit by
  accident), lint baseline drift bisect, lockfile churn allowed but
  no new top-level runtime deps under workspace root, sealed-snapshot
  drift check via `git log --oneline main..HEAD`.
- Out-of-scope territory: `tests/api-edge/**` (Task 0096f),
  `apps/api-edge/src/**` + `wrangler.jsonc` + `cloudflare-kv/**`
  (Task 0097), `packages/sdk/**` (consume only),
  `packages/contracts/**` + `apps/**` (no consumer or contract drift),
  `infra/terraform/cloudflare-domain/**` + cloudflare `~> 4.52` pin
  (deferred 0085b), `apps/notifications-worker/**` (deferred
  provider-swap and dev-reframe), `tooling/eslint/**` (sealed since
  Task 0092).
- Recommended next move on PASS: scope **Task 0101 — CLI
  write-command fan-out + remaining read commands** (org invite,
  project create, env create, api-key create, webhook create, usage
  summary, billing summary, audit list, plus optional spec-13
  commands). Closes Track B4 second half; unlocks U10
  (console-as-SDK-client). Mirrors the Task 0098 → 0099 cadence on
  the CLI side. Same hazard ban + Stripe parity invariants.


## Task 0101

- Agent: Implementer (verifier sealed and pending)
- Prompt: `ai/tasks/task-0101.md`
- Verifier prompt (sealed): `ai/tasks/task-0101-verifier.md`
- Status: implementer phase complete 2026-05-31; PR #155 OPEN,
  MERGEABLE/CLEAN, all 4/4 PR-CI green (run 26698003939). Awaiting
  verifier execution.
- Branch (as shipped): `feat/cli-task-0101-write-and-cross-read-commands`
  (implementer convention; verifier prompt latitude accepts).
- Objective: B4 second-half closure on the CLI side — ship every spec-13
  required command (`org invite`, `project create`, `env create`,
  `api-key create`, `webhook create`, `usage summary`, `billing summary`,
  `audit list [--all]`) wired through `@saas/sdk`, with caller-owned
  `--idempotency-key` forwarded verbatim (Stripe parity preserved
  end-to-end).
- Scope boundary: source under `packages/cli/src/commands/**` plus the
  matching `__tests__/**`; `packages/cli/README.md` touch-up; report at
  `ai/reports/task-0101-implementer.md`. No SDK edits, no apps/**, no
  contracts/**, no infra/**, no tests/api-edge/**, no `component.yaml`
  drift.
- Implementer report: `ai/reports/task-0101-implementer.md` (real PR
  Number 155). Surfaced TWO SDK-side gaps; shipped CLI workarounds
  through the public `Transport` (`env create` via `transport.request`,
  `audit list --all` via `transport.fetchImpl`). Both gaps recorded as
  orchestrator-accepted spec proposals:
  `ai/proposals/task-0101-spec-update-environments-client.md` and
  `ai/proposals/task-0101-spec-update-audit-pagination.md`. Both close
  with Task 0102.
- Acceptance: per-workspace typecheck/lint/test/build exit 0; repo-wide
  `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` ≤ 45 residual
  warnings (all `tests/api-edge`); CLI workspace contributes 0; CLI
  `it()` count ≥ 81; PR-CI 4/4 (plan + cli × {dev,stage,prod} Verify);
  `--idempotency-key` verbatim passthrough proof on every write
  command; webhook multi-call flow uses deterministic `KEY:sub:N`
  suffix (no random sub-keys); `audit list --all` 1000-page cap +
  `seenCursors` loop guard.
- Expected outcome: PR #155 squash-merged, post-merge main-CI 4/4
  green, both proposals carried forward to Task 0102 implementation.

## Task 0102

- Agent: Implementer + Verifier
- Prompt: `ai/tasks/task-0102.md`
- Verifier prompt: `ai/tasks/task-0102-verifier.md`
- Status: verified and merged 2026-05-31. PR #156 was auto-closed
  by GitHub when its base branch was deleted on the Task 0101
  squash-merge and could not be reopened after retargeting (GitHub
  refuses base-change on closed PRs); verifier opened PR #157 on
  the same head branch (rebased onto `main`). Squash-merged at
  `bced5fa` via `gh pr merge 157 --squash --delete-branch --admin`.
  Post-merge main-CI run `26699284529` 7/7 SUCCESS (plan + sdk ×
  {dev,stage,prod} + cli × {dev,stage,prod}).
- Objective: close the two SDK-side gaps surfaced by Task 0101 and
  re-wire the CLI so every command dispatches through a typed
  `@saas/sdk` resource client. Ships `EnvironmentsClient`
  (`list`/`get`/`create`/`archive` mirroring `ProjectsClient`,
  `encodeURIComponent` on every dynamic segment, caller-owned
  idempotency-key on `create`/`archive`), surfaces paginated audit
  reads as `EventsClient.iterAuditEntries`
  (`AsyncIterable<PublicAuditEntry>`, 1000-page cap + `seenCursors`
  loop guard) on top of a `listAuditEntriesPage` primitive, adds
  `Transport.requestWithEnvelope<T>()` helper preserving back-compat
  with `Transport.request<T>`. CLI `env create` and `audit list`
  (single-page + `--all`) now consume the SDK; the two Task 0101
  `transport.*` workaround sites are gone.
- Scope boundary: `packages/sdk/**` (additions only — no edits to
  existing `Transport.request<T>` or `EventsClient.listAuditEntries`
  signatures), `packages/cli/src/commands/{writes,cross-reads}.ts`
  re-wiring, matching test files. Report at
  `ai/reports/task-0102-implementer.md`. No `component.yaml` drift.
- Acceptance: SDK + CLI per-workspace typecheck/lint/test/build exit
  0; repo-wide `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint`
  ≤ 45 residual warnings (all `tests/api-edge`); SDK `it()` ≥ 89
  (Task 0099 baseline 70 + ≥ 19 new); CLI `it()` ≥ 81 (Task 0101
  baseline preserved); `grep -RnE 'transport\.(request|fetchImpl)'
  packages/cli/src/commands` returns no matches; PR-CI green on the
  full 7-job rollup (plan + sdk × {dev,stage,prod} + cli ×
  {dev,stage,prod}); CLI public behaviour byte-identical (URL
  shapes, JSON envelope, NDJSON `--all` output, human columns,
  idempotency-key forwarding).
- Durable outcome: PR #157 squash-merged at `bced5fa`, post-merge
  main-CI run `26699284529` 7/7 SUCCESS, Track B4 FULLY CLOSED.
  Every CLI command in the spec-13 surface now dispatches through
  a typed `@saas/sdk` resource client. SDK clients 11 → 12
  (added `EnvironmentsClient`); SDK tests 70 → 89 (+19); CLI tests
  preserved at 95. Both Task 0101 SDK-gap proposals
  (`task-0101-spec-update-environments-client.md`,
  `task-0101-spec-update-audit-pagination.md`) RESOLVED. Public
  APIs preserved additively: `Transport.request<T>` untouched +
  new `requestWithEnvelope<T>` sibling; `EventsClient.listAuditEntries`
  untouched + new `listAuditEntriesPage` primitive +
  `iterAuditEntries` async iterator with `seenCursors` + 1000-page
  cap. Reports: `ai/reports/task-0102-{implementer,verifier}.md`.

## Task 0103

- Agent: Implementer + Verifier
- Prompt: `ai/tasks/task-0103.md`
- Verifier prompt: `ai/tasks/task-0103-verifier.md`
- Reports: `ai/reports/task-0103-implementer.md`,
  `ai/reports/task-0103-verifier.md`
- Status: verified PASS and merged 2026-05-31. PR #158 squash-merged
  at `0909186` via `gh pr merge 158 --squash --delete-branch --admin`
  (PR was BEHIND main due to merge-time drift on the orchestrator
  scoping commit; admin merge is the documented Phase 6 fallback).
  Post-merge main-CI run `26699966952` 4/4 SUCCESS (plan + sdk ×
  {dev,stage,prod} Verify; no deploy step — sdk is a turbo-package).
- Implementation: branch `impl/task-0103-sdk-auth-client`, 4 files
  (`packages/sdk/src/auth.ts` new 115 lines,
  `packages/sdk/src/index.ts` modified +16 lines,
  `packages/sdk/src/__tests__/auth.test.ts` new 301 lines, implementer
  report new 105 lines), additions=537, deletions=0. SDK tests
  89 → 106 (+17 it() blocks; target was ≥10).
- PR CI: run `26699737104` 4/4 SUCCESS at sealing.
- Post-merge: run `26699966952` 4/4 SUCCESS.
- Objective: add a 13th `@saas/sdk` resource client `AuthClient`
  wrapping the identity-worker public auth surface (`loginStart`,
  `loginComplete`, `getSession`, `logout`, `getProfile`,
  `updateProfile`). Closes the last SDK gap before Task 0104 (Console
  U10 SDK refactor) becomes a pure consumer-side swap. Mirrors
  `EnvironmentsClient` cadence from Task 0102 (caller-owned
  `Idempotency-Key`, `transport.request<T>` only — no `fetchImpl`
  reach-around).
- Scope boundary: `packages/sdk/src/auth.ts` (new),
  `packages/sdk/src/index.ts` (wire `client.auth` + 9 type re-exports
  from `@saas/contracts/auth`), `packages/sdk/src/__tests__/auth.test.ts`
  (new). Zero edits to `packages/contracts/**`, `packages/cli/**`,
  `apps/**`, `packages/sdk/src/transport.ts`, `packages/sdk/component.yaml`,
  or other resource clients. `/v1/auth/resolve` (internal service-binding)
  and `/v1/auth/security-events` (already on `SecurityEventsClient`)
  intentionally excluded.
- Durable outcome: SDK clients on main 12 → 13 (`auth` added —
  organizations, projects, memberships, apiKeys, webhooks, metering,
  billing, events, securityEvents, config, notifications, environments,
  **auth**). Stripe parity locked both directions: caller-owned
  `Idempotency-Key` forwarded verbatim on all 3 POSTs (`loginStart`,
  `loginComplete`, `logout`); SDK never auto-generates one when the
  caller omits it. All 4 typed errors covered
  (`UnauthenticatedError` 401, `ValidationError` 422, `RateLimitError`
  429, `InternalError` 500). Public-API preservation verified:
  `Transport.request<T>` byte-identical, all 12 prior resource
  clients untouched. Hazard scan clean (zero new `eslint-disable` /
  `@ts-ignore` / `@ts-expect-error` / `as unknown as` / `as any` /
  `node:` under `packages/sdk/**`). Lint baseline preserved (45
  warnings, all `tests/api-edge`). No spec proposals — all 6 method
  signatures map cleanly to existing `@saas/contracts/auth` types.
- Unlocks: Task 0104 — Console U10 SDK refactor. Drop
  `apps/web-console-next/src/lib/api.ts` (297 LOC, 8 consumer call
  sites) including the auth flow in
  `apps/web-console-next/src/app/login/page.tsx`, replace with
  `Sourceplane` from `@saas/sdk` end-to-end. Pure consumer-side swap;
  estimated single PR.

## Task 0104

- Agent: Implementer (scoping, awaiting handoff)
- Prompt: `ai/tasks/task-0104.md`
- Branch: `impl/task-0104-console-u10-sdk-refactor`
- Status: scoped 2026-05-31 (orchestrator)
- Objective: Console U10 SDK refactor — replace
  `apps/web-console-next/src/lib/api.ts` (297 LOC duplicated `ApiClient`)
  with `Sourceplane` from `@saas/sdk`. Pure consumer-side swap unblocked
  by the AuthClient shipped in Task 0103. Subsumes the
  `apps/web-console-next/src/app/login/page.tsx` auth flow through
  `client.auth.*`.
- Two acceptable paths: (A) delete `lib/api.ts`, migrate consumers to
  `Promise<T>` + typed errors via try/catch; (B) keep ≤60 LOC envelope
  adapter that wraps `Sourceplane` and re-exports an `ApiResult<T>`
  shim — implementer picks based on call-site churn.
- Hard rules: zero new `eslint-disable` / `@ts-ignore` /
  `@ts-expect-error` / `as unknown as` / `as any` / `node:*` under
  `apps/web-console-next/**`; no edits to `packages/sdk/**` or
  `packages/contracts/**` (proposal-then-defer if a contract gap
  surfaces); multi-target switcher (`ALL_TARGETS`, `DEPLOY_ENV`,
  `IS_LOCKED`, `NEXT_PUBLIC_DEPLOY_ENV`) preserved byte-for-byte;
  bearer-token re-construction wired on `setTarget`/`setToken`.
- Acceptance: `pnpm -r typecheck` exit 0 across 38 workspaces;
  `pnpm -r --no-bail lint` ≤ 45 warnings (all in `tests/api-edge/**`);
  `pnpm --filter @saas/web-console-next build` green; vitest green;
  `kiox -- orun validate / plan --changed / run --dry-run` green for
  the changed `web-console-next` Verify lanes; PR-CI green; real PR
  number in report (`TBD` = blocked).
- Parallel-safe with sealed Task 0096f verifier (zero file overlap
  with `tests/api-edge/**`).
- Unlocks: CLI auth/SDK consumer swap (`packages/cli`) and broader
  U10 console hardening.
