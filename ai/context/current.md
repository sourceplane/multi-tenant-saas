# Current Context

Last updated: 2026-05-31 — **Task 0122 CLOSED** (verifier PASS, PR #177 squash
`5b791a1`; reconciliation cycle — see note). Milestone **B7 fully closed** (0121
audit-log UX + 0122 security-events surfaces). **Task 0123 SCOPED** — B8 admin/support
worker. Implementer prompt at `ai/tasks/task-0123.md`. Repo health green; 0 open PRs;
sealed snapshot main HEAD `5b791a1`.

## Reconciliation note (Task 0122)

PR #177 (Task 0122 — the three security-events consumer surfaces) was opened, CI-green,
and **merged out-of-band** before a verifier task was scoped and without an implementer
report being filed. The warm-boot brief was stale (expected `2b52d2b` / 0122-not-started;
reality was already-merged at `5b791a1`). This cycle the orchestrator ran the verifier
pass retroactively: 10-file delivery exactly on boundary, PR-CI 11/11 + post-merge
main-CI green, deploy-gate satisfied (live `GET /account/security` → HTTP 200, real HTML,
NOT white-page). Verified PASS. Report: `ai/reports/task-0122-verifier.md`. Ongoing watch:
ensure each implementer/verifier cycle commits AND pushes its report + state files (the
missing-report gap recurred here).

## Active task: Task 0123 — B8 admin/support worker (Implementer)

**Milestone:** `B8-admin-support-worker`. Branch `impl/task-0123-admin-worker`.

**Selection.** B7 is fully closed. B8 (roadmap) is the next unlocked, human-independent
milestone: **spec 16** (`specs/components/16-admin-support.md`) is "Ready for
implementation" but has **no app** — `apps/admin-worker` does not exist. All
dependencies are shipped (identity, membership, events-audit workers + policy seam). V1
needs no human decision (system-override + a recognized support-role claim; no real
support staff need naming).

**Scope — greenfield `apps/admin-worker`, internal-only, V1 read-only diagnostics:**

1. New `cloudflare-worker-turbo` app mirroring the established worker shape (router.ts,
   handlers/, env.ts, http.ts, **component.yaml**). **NOT** routed through api-edge; no
   public surface. V1 capability subset:
   - `authorizeSupportAction` — **deny-by-default**; denial emits `support.access_denied`.
   - `recordSupportAction` + `listSupportActions` — persist/read support-action rows
     (support actor, target org, reason, requestId, timestamp); record emits
     `support.action_recorded` via `appendEventWithAudit` **inside a transaction**
     (mirror `membership-worker/handlers/revoke-invitation.ts` atomicity).
   - `lookupOrganizationForSupport` + `lookupUserForSupport` — narrow read-only
     diagnostic projections (no secrets, no raw domain-table dump).
2. New DB migration `packages/db/src/migrations/140_*` for support-action records
   (next ordinal after `130_webhook_secret_rotation_grace`).
3. Tests: deny-path (+event), record/list round-trip (+event), read-only lookups.

**Hard exclusions:** NO impersonation (`startImpersonation`/`endImpersonation` /
`support.impersonation_*` — V1 out, clean seam only); NO api-edge route / public
exposure; NO web-console-next support UI; NO change to existing workers / contracts /
the events-audit model; NO privileged DB shortcut bypassing policy/audit; NO
`ai/deferred.md` or `infra/terraform/cloudflare-domain/**` / cloudflare provider touch.

**Component shape:** new `apps/admin-worker` (cloudflare-worker-turbo, **deploy-gated**)
+ a `packages/db` migration. `component.yaml` is **mandatory** (mirror
`apps/policy-worker` or `apps/membership-worker`; verify on dev, deploy on
`github-push-main` for stage/prod) or the app is invisible to Orun discovery + CI.
Deploy-gated verifier PASS gate = **post-merge main-CI deploy job** for stage/prod.
**BEHIND-main rebase is the verifier's responsibility** (recurring 0103–0122). May land
as one PR or a short sequence — implementer's call.

## Next focus after 0123

1. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
2. **B9 — Entitlement-decision observability** (billing-worker counts → admin-worker
   dashboard); naturally follows B8.
3. **B6 Stripe / B1 real auth** — larger baseline legs; B6 waits on U7.

Carry-forward nit (non-blocking): `packages/cli/src/commands/cross-reads.ts`
`parseAuditFilterFlags` doc-comment says malformed input "surfaces as a 400" — worker
returns 422. Comment-only; fold into any future cross-reads touch.

Deferred (Deferred Decision Protocol, human input required, NOT picked):
`0085b` (cloudflare-domain v4→v5), `notifications-provider-swap`,
`notifications-worker-dev-reframe`, `optional-spec-13-commands`.

Repo health: green. 0 open PRs. Task 0122 closed; Task 0123 scoped + ready for
implementer.
