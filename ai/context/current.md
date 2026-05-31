# Current Context

Last updated: 2026-05-31 — **Task 0123 CLOSED** (B8 admin/support worker; verifier PASS,
PR #178 squash `4991f37`, post-merge deploy gate satisfied). Milestone **B8 closed**.
**Task 0124 SCOPED** — B9 entitlement-decision observability. Implementer prompt at
`ai/tasks/task-0124.md`. Repo health green; 0 open PRs; sealed snapshot main HEAD `4991f37`.

## Cycle note (Task 0123 — inline full-cycle)

An earlier implementer session had built Task 0123 on the working tree but never committed,
pushed, opened a PR, or filed a report — the warm-boot brief claimed "scoped, not
implemented" while reality was a near-complete uncommitted build on branch
`impl/task-0123-admin-worker` (0 commits vs main `d81f3cc`). Caught by trust-but-verify warm
boot (local HEAD/branch state vs the brief). The orchestrator ran the **full implementer →
verifier cycle inline**: finished the missing pieces (`router.ts`, `index.ts`,
`list-support-actions` + `lookup-support` handlers, `pagination.ts`, the whole
`tests/admin-worker` Jest package), fixed 3 pre-existing `exactOptionalPropertyTypes` errors
in `record-support-action.ts`, then committed → pushed → PR #178 → verified → merged. The
recurring missing-report / uncommitted-work gap recurred again; each cycle must end with
report + state files committed AND pushed.

## Last delivered: Task 0123 — B8 admin/support worker (PASS)

Greenfield internal `apps/admin-worker` (cloudflare-worker-turbo, internal-only, routes
`/v1/internal/support/*` + `/health`): deny-by-default `authorizeSupportAction`, audited
support-action ledger (`support.action_recorded` via `appendEventWithAudit` inside a
transaction; denial → `support.access_denied`), narrow secret-free org/user diagnostic
projections. Owns the `support` context (`packages/db/src/support`) + migration
`140_support_action_records`. Tests: 3 suites / 19. Post-merge main-CI deployed prod
(`Uploaded admin-worker-prod`) + applied the migration on stage/prod. Reports:
`ai/reports/task-0123-{implementer,verifier}.md`.

## Active task: Task 0124 — B9 entitlement-decision observability (Implementer)

**Milestone:** `B9-entitlement-decision-observability`. Branch
`impl/task-0124-entitlement-observability`. Sealed snapshot main HEAD `4991f37`.

**Selection.** B8 is closed (admin-worker shipped). B9 is the roadmap's natural next leg
(`specs/roadmap.md` §B9 — "counts only by caller × entitlement key emitted from
billing-worker, used by the admin-worker dashboard and on-call"), and it builds directly on
the `support` read path established by B8. Grounded in real code: the entitlement decision is
`apps/billing-worker/src/handlers/check-entitlement.ts` `decideEntitlement(repo, parsed)` →
`allowed` + `reason` (`not_configured` | `disabled`), reached via internal
`POST /v1/internal/billing/entitlements/check`. **No decision is observed/recorded today** —
that gap IS the milestone.

**Scope — counts-only observability, end to end (internal-only):**

1. **`billing-worker`** emits a counts-only decision observation (orgId, entitlementKey,
   outcome `allowed`|`denied`, denial reason, timestamp) on the `check-entitlement` path —
   **best-effort, non-blocking**, behind the existing `CheckEntitlementDeps` seam. A recording
   failure must NOT change the frozen `CheckBillingEntitlementResponse`.
2. **New migration** `packages/db/src/migrations/150_*` for decision-observation storage
   (next ordinal after 140), forward-only / idempotent, registered in `manifest.ts`/`types.ts`.
3. **`admin-worker`** new internal-only **deny-by-default** aggregation read (e.g.
   `GET /v1/internal/support/organizations/:orgId/entitlement-decisions`) returning
   per-`(entitlementKey, outcome)` counts over a bounded window — reuse
   `authorizeSupportAction` (denied read emits `support.access_denied`) + narrow-projection
   discipline (no `limitValue` / `subscriptionId` / payload / secret).
4. **Tests:** emission on allowed + denied paths (+ emission-failure-doesn't-change-response),
   admin deny-by-default (+ event), aggregation correctness + no-secret projection.

**Hard exclusions:** NO Analytics Engine / external sink binding (in-repo `packages/db` +
Hyperdrive persistence only this round — leave a clean seam); NO change to `decideEntitlement`
semantics or `CheckBillingEntitlementResponse` bytes (additive side-effect only); NO secrets /
payloads / limit values / subscription IDs in observations; NO api-edge route / public
exposure; NO web-console-next UI (later surface); NO impersonation; NO peer-worker contract
change beyond the additive billing emission seam; NO `ai/deferred.md` or
`infra/terraform/cloudflare-domain/**` touch.

**Component shape:** extends `billing-worker` + `admin-worker` + `packages/db` (both workers
**deploy-gated**; verifier PASS gate = post-merge main-CI deploy job for stage/prod). No new
top-level package required; any new `tests/*` package must ship `component.yaml`. Implementer
owns the storage-shape choice (append-only observation table aggregated at read vs rollup
counter — justify in report) + PR count. **BEHIND-main rebase is the verifier's
responsibility** (recurring 0103–0123).

## Next focus after 0124

1. **B9 Console surface** — surface the entitlement-decision counts in web-console-next
   (admin/support dashboard) once the read API lands. Deploy-gated cloudflare-pages.
2. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
3. **B10 (SSO/SAML + SCIM)** / **B6 Stripe** / **B1 real auth** — larger baseline legs;
   B10 waits on B1+B8 stability; B6 waits on U7.

Carry-forward nit (non-blocking): `packages/cli/src/commands/cross-reads.ts`
`parseAuditFilterFlags` doc-comment says malformed input "surfaces as a 400" — worker returns
422. Comment-only; fold into any future cross-reads touch.

Deferred (Deferred Decision Protocol, human input required, NOT picked):
`0085b` (cloudflare-domain v4→v5), `notifications-provider-swap`,
`notifications-worker-dev-reframe`, `optional-spec-13-commands`.

Repo health: green. 0 open PRs. Task 0123 closed; Task 0124 scoped + ready for implementer.
