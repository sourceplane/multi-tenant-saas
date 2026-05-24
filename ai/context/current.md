# Current Context

Last updated: 2026-05-24

## Repo Reality

- Task 0017 squash-merged at `674dded` via PR #58.
- Tasks 0001–0017 are verified.
- Task 0017 added the policy authorization seam:
  - `@saas/contracts/policy` with policy request/response types.
  - `@saas/policy-engine` pure policy-as-code engine.
  - `apps/policy-worker` with `/health`, `/v1/policy/authorize`,
    `/v1/policy/effective-permissions`, and
    `/v1/policy/validate-role-assignment`.
  - policy-worker stage/prod Wrangler environments with `workers_dev: false`.
  - 108 tests across contracts, policy-engine, and policy-worker suites.
- Verifier fixes in PR #58 hardened scope validation:
  - project/environment-scoped actions require explicit `resource.projectId`;
  - unknown future membership facts are ignored safely;
  - worker request validation rejects malformed subject/resource/context fields.
- membership-worker deployments:
  - stage: `membership-worker-stage`, workers_dev disabled, SOURCEPLANE_DB Hyperdrive
  - prod: `membership-worker-prod`, workers_dev disabled, SOURCEPLANE_DB Hyperdrive
- policy-worker deployments:
  - stage: `policy-worker-stage`, version `124ed276-4352-45c5-a3d6-372e5f3f0a84`,
    workers_dev disabled and no public deploy target
  - prod: `policy-worker-prod`, version `cda9f484-bdb3-4d72-a67b-e77260e1ee39`,
    workers_dev disabled and no public deploy target
- api-edge stage/prod Workers redeployed with identity + membership bindings.
- identity-worker deployments unchanged:
  - stage: `identity-worker-stage`, version `678702b2`, `DEBUG_DELIVERY=true`
  - prod: `identity-worker-prod`, version `57b47417`, `DEBUG_DELIVERY=false`
- Hyperdrive resources stable:
  - stage: `08f7c6055f544a3890a585d88fd92348` (`stg-multi-tenant-saas-stage`)
  - prod: `ab2c21c2db6245a59c91588fcac7107a` (`prod-multi-tenant-saas-prod`)
- Supabase stage ref: `thielrrsejwhjkdluwqm`, prod ref: `npbvrxkrlyrpnhrqucxa`.
  dev remains unprovisioned.
- Local Orun validation passes.
- Main CI run `26359832583` passed after Task 0017 merge (11/11 jobs);
  stage/prod policy-worker deploy jobs uploaded live Worker versions.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- Week 0 operations foundation, Worker binding seam, identity persistence,
  identity Worker auth runtime, api-edge auth facade, membership persistence
  foundation, membership Worker organization runtime, and policy authorization
  seam are complete.
- The full auth flow is accessible through the public `api-edge` gateway.
- Organization create/list/read routes are accessible through the public `api-edge`
  gateway with bearer token authentication.
- policy-worker has no public route by design. Direct workers.dev access to
  stage/prod returns 404 with Cloudflare error code 1042.
- Next focus: wire policy authorization into membership mutations before
  invitation management, member administration, and audit/events.

## Current Task

- Task 0017 verified PASS and merged at `674dded`.
- PR CI runs `26359077449` and `26359772347` were green; post-merge main CI
  run `26359832583` was green.
- Verifier report: `ai/reports/task-0017-verifier.md`.
- Ready for next task generation.
