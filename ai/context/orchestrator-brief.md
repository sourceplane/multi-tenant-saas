# Orchestrator Warm-Boot Brief

Last refreshed: 2026-05-31 (post Task 0124 close / Task 0125 scope).

## Ground truth (verify, don't trust)

- main HEAD: `0a8f9d7` ("feat(b9): entitlement-decision observability (#179)").
- Open PRs: **0**. Working tree: clean after this cycle's commit.
- Repo health: **green**. Tests at HEAD: billing-worker 52/52, admin-worker 28/28, db 522/522.

ALWAYS re-derive this from `git`/`gh` on boot — prior briefs have been stale (0122/0123/0124 all
diverged from reality; trust-but-verify caught each).

## Last closed: Task 0124 — B9 entitlement-decision observability (PASS, PR #179, squash `0a8f9d7`)

Counts-only, internal-only decision observability. billing-worker emits a best-effort,
non-blocking observation behind the `CheckEntitlementDeps` seam (frozen response contract
untouched); migration `150_entitlement_decision_observations` (append-only, aggregated at read,
no value column, CHECK-constrained vocab) applied stage+prod via remote-state CI; admin-worker
deny-by-default read `GET /v1/internal/support/organizations/:orgId/entitlement-decisions`
(bounded window 24h/168h, MAX_GROUPS=200, narrow secret-free projection). Post-merge main-CI run
`26720845615` SUCCESS with real worker uploads + db-migrate stage+prod. Milestone B9 read API
CLOSED.

## Active: Task 0125 — drift-proof `VALID_CONTEXTS` (SCOPED, ready for implementer)

Prompt: `ai/tasks/task-0125.md`. Branch `impl/task-0125-bounded-context-single-source` off
`0a8f9d7`. Make a runtime `BOUNDED_CONTEXTS as const` the single source of truth in
`packages/db/src/types.ts`, derive `BoundedContext = typeof BOUNDED_CONTEXTS[number]`,
value-export it, and import it into `tests/db/src/migrations.test.ts` (delete the hand-maintained
11-literal array). Kills a recurring red-test drift class (0117/#172; re-flagged 0117/0118/0120/
0124). 3 source files + 1 new report. db-tests turbo lane, **no deploy gate** — PASS gate = green
CI (typecheck + db 522/522). BEHIND-main rebase is the verifier's job.

## Next focus after 0125

1. **B9 Console surface — DEFERRED** (human architecture decision). The B9 read lives on
   internal-only `admin-worker` (never on api-edge); `web-console-next` is the customer console
   via SDK→api-edge. No internal-operator console app/auth model exists. Surfacing the counts
   requires a human product/architecture call (internal ops console + auth, vs scoped api-edge
   exposure with a new authz story). Do NOT auto-pick.
2. **B10 (SSO/SAML + SCIM)** / **B6 Stripe** / **B1 real auth** — larger legs; B10 gated on
   B1+B8 stability, B6 on U7.

## Deferred (human input required — do NOT pick)

B9 Console surface (internal/external boundary), `0085b` (cloudflare-domain v4→v5),
`notifications-provider-swap`, `notifications-worker-dev-reframe`, `optional-spec-13-commands`.

## Carry-forward nit (non-blocking)

`packages/cli/src/commands/cross-reads.ts` `parseAuditFilterFlags` doc-comment says malformed
input "surfaces as a 400" — worker returns 422. Comment-only; fold into any future cross-reads
touch.

## Recurring discipline reminders

- Every cycle ends with report + state files (`current.md`, `state.json`, this brief) committed
  AND pushed (gap recurred 0103–0123; held this cycle).
- BEHIND-main rebase = verifier responsibility.
- Verifier hygiene: revert incidental `kiox.lock` mutations; don't commit `plan.json`.
