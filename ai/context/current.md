# Current Context

Last updated: 2026-06-01 — **Task 0125 CLOSED** (hygiene: drift-proof
`VALID_CONTEXTS` single source of truth; verifier PASS, PR #180 squash `c25fce5`,
db-tests 522/522, union equivalence proven from dist artifact — drift class
permanently killed). Bookkeeping back-fill: `completed[]` now includes BOTH 0124
and 0125 (0124/PR #179 was merged but never appended). **Task 0126 SCOPED** —
B5 webhooks polish: manual delivery replay. Implementer prompt at
`ai/tasks/task-0126.md`. Repo health green; 0 open PRs; sealed snapshot main HEAD
`c25fce5`.

## Cycle note (Task 0126 — next-leg selection, full B/U/P frontier survey)

Roadmap statuses lag code reality. Inspection this cycle confirmed **B3** (edge
idempotency + rate limiting) is already shipped (`apps/api-edge/src/{idempotency,
rate-limit}.ts`, wired across every facade) and **U7** (precondition_failed /
upgrade UX) is already shipped across the console (orgs/projects/api-keys/billing/
invitations/environments + a demo gallery covering all four reason codes). The
B-track forward legs B1 (OAuth + email creds), B6 (Stripe creds + receipts), and
B10 (SSO/SCIM creds) are all human-blocked; B9-console stays deferred on a human
architecture decision. The one named, human-independent B5 surface still missing
on main is **manual delivery replay** — there is no "redeliver this specific past
delivery attempt" path anywhere (only the background `retryFailedDeliveries()`
cron, which stops terminal at `MAX_RETRIES=5`). Selected as Task 0126: reconstruct
a fresh attempt and re-drive it through the existing `deliverAttempt()` signing/
delivery chokepoint, surfaced as a "Redeliver" action across worker → contracts →
SDK → CLI → Console. See `ai/state.json` notes[0] for the full scope/exclusions.

## Cycle note (Task 0124 — warm-boot trust-but-verify, inline verifier)

The warm-boot brief claimed Task 0124 was "scoped, not implemented," but trust-but-verify caught
that reality had diverged: Task 0124 was COMPLETE — branch `impl/task-0124-entitlement-observability`
pushed, PR #179 OPEN + CLEAN. The orchestrator ran the **full inline verifier cycle**: boundary
exact (12 files on allowlist), best-effort emission proven (errors swallowed in try/catch,
`outcome.body` returned unchanged), counts-only storage enforced by schema (no value column +
CHECK constraints on closed outcome/reason vocab), deny-by-default admin read confirmed
(`authorizeSupportAction`, denied → `support.access_denied`), all local + CI gates green (billing
52/52, admin 28/28, db 522/522; 14/14 CI), **migration 150 actually applied on stage AND prod**
via `--remote-state` db-migrate during PR CI. Merged squash `0a8f9d7`; post-merge main CI run
`26720845615` SUCCESS with real worker uploads (billing/admin stage+prod) + db-migrate stage+prod.
`kiox.lock` reverted as verifier hygiene. Report: `ai/reports/task-0124-verifier.md` (PASS).

## Last delivered: Task 0124 — B9 entitlement-decision observability (PASS)

Counts-only, internal-only decision observability end to end. `billing-worker` emits a best-effort,
non-blocking decision observation on the `check-entitlement` path behind the existing
`CheckEntitlementDeps` seam (a recording failure cannot change the frozen
`CheckBillingEntitlementResponse`). New migration `150_entitlement_decision_observations`
(append-only observations aggregated at read time — chosen over a rollup counter so a recording
failure has no read-modify-write contention path back into decision latency/outcome; backed by
composite index `(org_id, occurred_at DESC, entitlement_key, outcome)`). `admin-worker` adds a
deny-by-default internal read
`GET /v1/internal/support/organizations/:orgId/entitlement-decisions` returning per-(entitlementKey,
outcome) counts over a bounded window (default 24h / max 168h, MAX_GROUPS=200), narrow secret-free
projection (no limit values / subscription IDs / payloads). `support` context owns the new repo
`packages/db/src/billing/entitlement-decisions.ts` (`EntitlementDecisionRepository`). Reports:
`ai/reports/task-0124-{implementer,verifier}.md`.

## Active task: Task 0125 — drift-proof `VALID_CONTEXTS` (Implementer)

**Milestone:** `hygiene-bounded-context-drift-proofing`. Branch
`impl/task-0125-bounded-context-single-source`. Sealed snapshot main HEAD `0a8f9d7`.

**Selection.** B9 read API is closed; the natural next leg (B9 Console surface) is **deferred**
— the read lives on internal-only `admin-worker` (never on api-edge) while `web-console-next` is
the customer console reached via SDK→api-edge, and there is no internal-operator console
app/auth model in the repo, so surfacing the counts needs a human architecture/product decision
(Deferred Decision Protocol). The highest leverage-per-effort, fully human-independent pick is
the long-flagged **`VALID_CONTEXTS` drift-proofing**: a recurring red-test failure class
(manually patched in Task 0117/PR #172; re-flagged in the 0117/0118/0120/0124 verifier reports).
The test hard-codes its own 11-literal `VALID_CONTEXTS` array (`tests/db/src/migrations.test.ts:52`)
that silently drifts from the type-only `BoundedContext` union (`packages/db/src/types.ts:1`)
because TS types are erased at runtime. Fix: make a runtime `BOUNDED_CONTEXTS` const the single
source of truth, derive `BoundedContext = typeof BOUNDED_CONTEXTS[number]`, and import it in the
test — structurally impossible to drift afterward. db-tests turbo lane, **no deploy gate**, clean
rollback, parallel-safe.

**Scope (IN):** `packages/db/src/types.ts` (add `BOUNDED_CONTEXTS as const`, re-derive type),
`packages/db/src/index.ts` (value export of `BOUNDED_CONTEXTS`),
`tests/db/src/migrations.test.ts` (delete literal, import + use), `ai/reports/task-0125-implementer.md`
(new). **OUT:** any set/order change to the contexts, any migration/manifest/checksum/.sql,
`MigrationEntry`/`MigrationManifest` shape, any worker / component.yaml / infra / lockfile /
package.json / other tests/* package, new deps, deferred/roadmap edits.

**PR:** one PR, `refactor(db): single source of truth for bounded contexts (drift-proof VALID_CONTEXTS)`.
Verifier PASS gate = green CI (typecheck + db 522/522), no post-merge deploy job.
**BEHIND-main rebase is the verifier's responsibility** (recurring 0103–0124).

## Next focus after 0125

1. **B9 Console surface** — DEFERRED pending human architecture decision (internal-only
   admin-worker vs customer-facing web-console-next api-edge path; no internal-operator console
   today). Do not pick until that boundary/authz story is resolved by a human.
2. **B10 (SSO/SAML + SCIM)** / **B6 Stripe** / **B1 real auth** — larger baseline legs;
   B10 waits on B1+B8 stability; B6 waits on U7.

Carry-forward nit (non-blocking): `packages/cli/src/commands/cross-reads.ts`
`parseAuditFilterFlags` doc-comment says malformed input "surfaces as a 400" — worker returns
422. Comment-only; fold into any future cross-reads touch.

Deferred (Deferred Decision Protocol, human input required, NOT picked): **B9 Console surface**
(internal/external boundary), `0085b` (cloudflare-domain v4→v5), `notifications-provider-swap`,
`notifications-worker-dev-reframe`, `optional-spec-13-commands`.

Repo health: green. 0 open PRs. Task 0124 closed; Task 0125 scoped + ready for implementer.
