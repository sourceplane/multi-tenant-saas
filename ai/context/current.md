# Current Context

Last updated: 2026-05-24

## Repo Reality

- Task 0018 squash-merged at `43f68c4` via PR #59.
- Tasks 0001–0018 are verified.
- Task 0018 wired membership-worker to policy-worker:
  - `apps/membership-worker/src/policy-client.ts` — reusable authorization helper.
  - `POLICY_WORKER` service binding: stage→`policy-worker-stage`,
    prod→`policy-worker-prod`.
  - `GET /v1/organizations/{orgId}` now authorizes through policy-worker using
    action `organization.read` instead of local "any active role" check.
  - `component.yaml` has `dependsOn: [{component: policy-worker}]`.
  - Policy-client correctly parses the `{ data, meta }` response envelope.
  - 33 membership-worker tests, 20 policy-worker tests.
- Verifier fix in PR #59: policy-client was checking `allow` at top-level
  instead of `data.allow` in the policy-worker envelope. Fixed to unwrap
  correctly.
- membership-worker deployments:
  - stage: `membership-worker-stage`, workers_dev disabled, SOURCEPLANE_DB
    Hyperdrive, POLICY_WORKER→policy-worker-stage
  - prod: `membership-worker-prod`, workers_dev disabled, SOURCEPLANE_DB
    Hyperdrive, POLICY_WORKER→policy-worker-prod
- policy-worker deployments:
  - stage: `policy-worker-stage`, version `124ed276-4352-45c5-a3d6-372e5f3f0a84`,
    workers_dev disabled and no public deploy target
  - prod: `policy-worker-prod`, version `cda9f484-bdb3-4d72-a67b-e77260e1ee39`,
    workers_dev disabled and no public deploy target
- api-edge stage/prod Workers deployed with identity + membership bindings.
- identity-worker deployments unchanged:
  - stage: `identity-worker-stage`, version `678702b2`, `DEBUG_DELIVERY=true`
  - prod: `identity-worker-prod`, version `57b47417`, `DEBUG_DELIVERY=false`
- Hyperdrive resources stable:
  - stage: `08f7c6055f544a3890a585d88fd92348` (`stg-multi-tenant-saas-stage`)
  - prod: `ab2c21c2db6245a59c91588fcac7107a` (`prod-multi-tenant-saas-prod`)
- Supabase stage ref: `thielrrsejwhjkdluwqm`, prod ref: `npbvrxkrlyrpnhrqucxa`.
  dev remains unprovisioned.
- Local Orun validation passes.
- Main CI run `26361054065` passed after Task 0018 merge (8/8 jobs).

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- Week 0 operations foundation, Worker binding seam, identity persistence,
  identity Worker auth runtime, api-edge auth facade, membership persistence
  foundation, membership Worker organization runtime, policy authorization
  seam, and membership-to-policy binding are complete.
- The full auth flow is accessible through the public `api-edge` gateway.
- Organization create/list/read routes are accessible through the public
  `api-edge` gateway with bearer token authentication.
- Organization read is policy-gated through the internal policy-worker.
- policy-worker has no public route by design. Direct workers.dev access to
  stage/prod returns 404 with Cloudflare error code 1042.
- membership-worker has no public route by design. Stage/prod remain
  `workers_dev: false`.
- Next focus: invitation management and member administration endpoints,
  leveraging the verified `PolicyAuthorizer` seam.

## Current Task

- Task 0018 verified PASS and merged at `43f68c4`.
- PR CI run `26360963260` and post-merge main CI run `26361054065` were green.
- Verifier report: `ai/reports/task-0018-verifier.md`.
- Ready for next task generation.
