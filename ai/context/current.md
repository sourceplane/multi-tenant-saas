# Current Context

Last updated: 2026-05-25

## Repo Reality

- Task 0021 squash-merged at `324ca36` via PR #62.
- Task 0022 squash-merged at `28dd671` via PR #63.
- Tasks 0001–0022 are verified.
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

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- Week 0 operations foundation, Worker binding seam, identity persistence,
  identity Worker auth runtime, api-edge auth facade, membership persistence
  foundation, membership Worker organization runtime, policy authorization seam,
  membership-to-policy binding, member-list read surface, cursor pagination, and
  invitation administration are complete.
- The full auth flow is accessible through the public `api-edge` gateway.
- Organization create/list/read, member-list, and invitation create/list/revoke
  routes are accessible through the public `api-edge` gateway with bearer token
  authentication and pagination.
- Organization read, member list, and invitation create/list/revoke are
  policy-gated through the internal policy-worker.
- Next focus: invitation acceptance, member-admin mutations, or audit/events
  (depends on next task prompt).

## Current Task

- None. Awaiting next task prompt.
- Task 0022 verified PASS and merged via PR #63 at `28dd671`.
- Post-merge main CI run `26371024844` passed (19/19 jobs).
- Verifier fix: removed `ON CONFLICT (id) DO NOTHING` from acceptance CTE
  member/role INSERTs to guarantee full atomicity on error.
