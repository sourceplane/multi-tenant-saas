# Orchestrator Brief

## Snapshot
- snapshot_at: 2026-05-31T23:30:00Z
- head_sha: 5b791a1 (origin/main, Task 0122 / PR #177 squash) | 0 open PRs
- state_json_mtime_marker: post-task-0123-scope
- last_task_id: task-0123 (SCOPED — implementer not yet started)
- last_report_id: task-0122-verifier (DONE — PASS, reconciliation cycle)
- cycle_mode: warm
- repo_health: green

## Working Hypothesis
Task **0122 is CLOSED** (verifier PASS, PR #177 squash `5b791a1`). NOTE: 0122 was
merged **out-of-band** before its verifier was scoped and without an implementer
report; the orchestrator ran the verifier pass **retroactively** this cycle and
reconciled state (report `ai/reports/task-0122-verifier.md`, no implementer report
exists). Milestone **B7 is fully closed** (0121 audit-log UX + 0122 security-events
surfaces). Task **0123 is SCOPED** (`ai/tasks/task-0123.md`), not yet implemented.
Milestone **B8-admin-support-worker**: stand up greenfield `apps/admin-worker`
(cloudflare-worker-turbo, internal-only NOT via api-edge) per spec 16 — V1 read-only
support diagnostics: `authorizeSupportAction` (deny-by-default → `support.access_denied`),
`recordSupportAction`/`listSupportActions` (→ `support.action_recorded` via
`appendEventWithAudit` in a tx), `lookupOrganizationForSupport`/`lookupUserForSupport`
(narrow read-only projections) + a new `packages/db/src/migrations/140_*` migration. The
implementer's next move is to branch `impl/task-0123-admin-worker`, build the worker +
migration + tests, ship `component.yaml`, open ≥1 PR, write the report. Then the
orchestrator scopes the matching **verifier** task (deploy-gated — post-merge main-CI
deploy job for stage/prod is the PASS gate).

## Hot Files
- hot_context_sections: `current.md#active-task-0123`, `task-ledger.md#task-0123`
- hot_code (Task 0123 implementer targets — all NEW unless noted):
  - `apps/admin-worker/**` (NEW app: router.ts, handlers/, env.ts, http.ts,
    package.json, tsconfig, eslint.config.js, wrangler.jsonc, **component.yaml**)
  - `packages/db/src/migrations/140_*` (NEW support-actions migration) + repository wiring
  - prior-art (UNCHANGED refs): `apps/membership-worker/**` (worker shape +
    `handlers/revoke-invitation.ts` `appendEventWithAudit` tx-atomicity pattern),
    `apps/policy-worker/**` (internal-only analog), `apps/membership-worker/component.yaml`
    (manifest shape), `packages/db/src/migrations/130_webhook_secret_rotation_grace`
  - read-only spec refs: `specs/components/16-admin-support.md`,
    `specs/contracts/tenancy-and-rbac.md`, `specs/components/09-events-audit-observability.md`

## Deferred Watch
- `0085b` (cloudflare-domain v4→v5): user lifts the defer.
- `notifications-provider-swap`: user names provider + sender domain / API key.
- `notifications-worker-dev-reframe`: depends on dev-deploy-lane design pass.
- `optional-spec-13-commands`: backend lands `/v1/components`, `/v1/resources`,
  `/v1/deployments` GET (+ `resource create` POST) on api-edge + contracts.

## Invalidate When
- Implementer opens the Task 0123 PR → orchestrator scopes the verifier task →
  this brief is superseded.
- `current.md` rewritten outside the orchestrator's hand.
- `state.json.goal` changes, or a new spec proposal under `/ai/proposals/` is filed.

## Next Move
**Implementer (next): execute Task 0123** (`ai/tasks/task-0123.md`) — greenfield
`apps/admin-worker` + `140_*` migration + tests, ship `component.yaml`, open ≥1 PR,
write `ai/reports/task-0123-implementer.md` with the real PR#. **Then orchestrator:
scope the Task 0123 verifier** (deploy-gated: post-merge main-CI deploy job for
stage/prod is the PASS gate; inspect deny-by-default + tx-atomic audit code paths;
confirm internal-only / no api-edge / no impersonation; BEHIND-main rebase is
verifier's job).

## Ranked Candidate Queue (after 0123)
1. **B9 — Entitlement-decision observability** (billing-worker counts → admin-worker
   dashboard) — naturally follows B8 (admin-worker is its consumer).
2. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
3. **B6 Stripe / B1 real auth** — larger baseline legs; B6 waits on U7.

## Open Questions To Self
- Task 0123 support-role source of truth: spec 16 says "recognized support role or
  system override" but does not name where the support-role claim lives. Implementer
  must pick the narrowest spec-16-compliant assumption (system override + a support-role
  claim) and record it; watch the verifier for a deny-by-default proof, not just a happy
  path. File a proposal only if it would alter a contract.
- Recurring ops gap (CONFIRMED AGAIN this cycle): Task 0122 was merged with NO
  implementer report and NO verifier — caught only because the warm-boot fingerprint
  mismatched. Each cycle must end with report + state files committed AND pushed; and a
  merged PR must not advance without a verifier pass on record. Validate the warm-boot
  fingerprint (HEAD SHA) against `git rev-parse origin/main` at every cycle start.
- Carry the 0121 cross-reads "400→422" comment nit into the first future cross-reads
  touch (non-blocking, no standalone task).
