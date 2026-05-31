# Orchestrator Brief

## Snapshot
- snapshot_at: 2026-06-01T00:15:00Z
- head_sha: 4991f37 (origin/main, Task 0123 / PR #178 squash) | 0 open PRs
- state_json_mtime_marker: post-task-0124-scope
- last_task_id: task-0124 (SCOPED — implementer not yet started)
- last_report_id: task-0123-verifier (DONE — PASS, B8 admin-worker, deploy-gated)
- cycle_mode: warm
- repo_health: green

## Working Hypothesis
Task **0123 is CLOSED** (B8 admin/support worker, verifier PASS, PR #178 squash `4991f37`;
post-merge main-CI deploy gate satisfied — `Uploaded admin-worker-prod`, migration 140 applied
stage/prod). Milestone **B8 is fully closed**: `apps/admin-worker` exists as the internal-only
support worker (deny-by-default `authorizeSupportAction`, audited support-action ledger via
`appendEventWithAudit` in a tx, narrow secret-free org/user projections, routes
`/v1/internal/support/*`), owning the `support` context + migration `140`. NOTE: 0123 had been
**built but never committed** by a prior implementer session — the orchestrator ran the full
implementer→verifier cycle **inline** this cycle (finished router/index/list/lookup handlers +
`tests/admin-worker`, fixed 3 `exactOptionalPropertyTypes` errors, committed/pushed/PR/merged).
Task **0124 is SCOPED** (`ai/tasks/task-0124.md`), not yet implemented. Milestone
**B9-entitlement-decision-observability**: emit **counts-only** entitlement-decision
observations from `billing-worker` (best-effort, non-blocking, behind `CheckEntitlementDeps`),
persist via a new `150_*` migration, and surface a narrow **deny-by-default** aggregation read
through `admin-worker`. The implementer's next move is to branch
`impl/task-0124-entitlement-observability`, wire the emission + migration + admin read + tests,
open ≥1 PR, write the report. Then the orchestrator scopes the matching **verifier** task
(deploy-gated — both workers' post-merge main-CI deploy jobs for stage/prod are the PASS gate).

## Hot Files
- hot_context_sections: `current.md#active-task-0124`, `task-ledger.md#task-0124`
- hot_code (Task 0124 implementer targets):
  - `apps/billing-worker/src/handlers/check-entitlement.ts` (EMISSION POINT — `decideEntitlement`
    + internal `POST /v1/internal/billing/entitlements/check`; add observing side-effect behind
    `CheckEntitlementDeps`, response bytes FROZEN)
  - `packages/db/src/migrations/150_*` (NEW decision-observation storage) + new/extended db
    context module + `manifest.ts`/`types.ts` registration
  - `apps/admin-worker/src/{router.ts,handlers/}` (NEW internal aggregation read handler/route)
  - prior-art (UNCHANGED refs): `apps/admin-worker/src/{support-auth.ts,handlers/lookup-support.ts,
    handlers/list-support-actions.ts}` (deny-by-default + narrow projection + audited-denial),
    `apps/admin-worker/src/handlers/record-support-action.ts` `emitAccessDenied` (best-effort
    non-blocking emission model), `packages/db/src/support/{repository.ts,types.ts}`
    (narrow-projection repo template), `packages/db/src/migrations/140_support_action_records/up.sql`
    (migration shape), `apps/membership-worker/src/handlers/revoke-invitation.ts` (tx-atomicity, only
    if observation is paired with an audit event)
  - read-only spec refs: `specs/roadmap.md` §B9, `specs/components/11-billing.md`,
    `specs/components/16-admin-support.md`, `specs/components/09-events-audit-observability.md`,
    `specs/constitution.md`

## Deferred Watch
- `0085b` (cloudflare-domain v4→v5): user lifts the defer.
- `notifications-provider-swap`: user names provider + sender domain / API key.
- `notifications-worker-dev-reframe`: depends on dev-deploy-lane design pass.
- `optional-spec-13-commands`: backend lands `/v1/components`, `/v1/resources`,
  `/v1/deployments` GET (+ `resource create` POST) on api-edge + contracts.

## Invalidate When
- Implementer opens the Task 0124 PR → orchestrator scopes the verifier task →
  this brief is superseded.
- `current.md` rewritten outside the orchestrator's hand.
- `state.json.goal` changes, or a new spec proposal under `/ai/proposals/` is filed.

## Next Move
**Implementer (next): execute Task 0124** (`ai/tasks/task-0124.md`) — wire counts-only
entitlement-decision emission into `billing-worker` check-entitlement (best-effort,
non-blocking, response bytes frozen) + `150_*` migration + `admin-worker` deny-by-default
aggregation read + tests, open ≥1 PR, write `ai/reports/task-0124-implementer.md` with the
real PR#. **Then orchestrator: scope the Task 0124 verifier** (deploy-gated: post-merge
main-CI deploy jobs for billing-worker + admin-worker stage/prod are the PASS gate; inspect
best-effort non-blocking emission, frozen decision response, deny-by-default admin read +
`support.access_denied`, counts-only/no-secret storage + projection; confirm internal-only /
no api-edge / no new binding; BEHIND-main rebase is verifier's job).

## Ranked Candidate Queue (after 0124)
1. **B9 Console surface** — surface the entitlement-decision counts in web-console-next
   (admin/support dashboard) once the read API lands. Deploy-gated cloudflare-pages.
2. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
3. **B10 SSO/SAML + SCIM** (waits on B1+B8 stability), **B6 Stripe** (waits on U7),
   **B1 real auth** — larger baseline legs.

## Open Questions To Self
- Task 0124 storage shape: append-only observation table aggregated at read time vs a rollup
  counter — implementer's call, but watch the verifier for a BOUNDED-read proof (no unbounded
  scan exposed) and a counts-only/no-secret proof (no `limitValue`/`subscriptionId`/payload in
  the row or projection), not just a happy-path count.
- Observation window default + granularity is unspecified by spec — implementer picks the
  narrowest counts-only assumption and records it; file a proposal only if it would alter a
  contract.
- Recurring ops gap (CONFIRMED AGAIN this cycle): Task 0123 was BUILT but never committed /
  pushed / PR'd / reported by the prior implementer session — caught only because the warm-boot
  fingerprint mismatched the working-tree reality. Every cycle must (a) validate the warm-boot
  fingerprint (HEAD SHA) against `git rev-parse origin/main` AND check `git status` /
  `git branch` for uncommitted in-flight work at cycle start, and (b) end with report + state
  files committed AND pushed; a merged PR must not advance without a verifier pass on record.
- Carry the 0121 cross-reads "400→422" comment nit into the first future cross-reads touch
  (non-blocking, no standalone task).
