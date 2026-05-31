# Current Context

Last updated: 2026-05-31 — Task 0108 IMPLEMENTER COMPLETE; PR #163 OPEN
+ MERGEABLE/BLOCKED on required CI checks (CI in flight at hand-off).
Verifier task scoped and dispatched.

## Active Task — 0108 (Verifier dispatched)

**Branch:** `impl/task-0108-webhook-secret-rotation-grace`
**HEAD:** `90044b1` (impl + report w/ real PR number).
**PR:** #163 — https://github.com/sourceplane/multi-tenant-saas/pull/163
**Sealed snapshot:** main `aae8d35` (Task 0107 verifier-PASS bookkeeping).
**Verifier prompt:** `ai/tasks/task-0108-verifier.md`
**Implementer report:** `ai/reports/task-0108-implementer.md` (committed
on PR branch, commit `cada19b`).
**Status:** awaiting verifier pickup.

**Diff:** 13 files, +736/-26. Eight prompted slots + three structurally
forced overshoots: `packages/db/src/manifest.ts` (mandatory migration
registration), `apps/webhooks-worker/src/env.ts` (declares the new
`WEBHOOK_SECRET_ROTATION_GRACE_SECONDS` env var), and the contracts/db
test files (acceptance gates listed in the prompt). Verifier evaluates
deviation acceptability.

**What shipped (per implementer report):**

1. Forward-only migration `130_webhook_secret_rotation_grace` adds three
   nullable previous-* columns (`previous_secret_ciphertext`,
   `previous_secret_version`, `previous_secret_expires_at`) on
   `webhooks.webhook_endpoints`; idempotent `ADD COLUMN IF NOT EXISTS`.
2. `rotateEndpointSecret` is atomic: a single UPDATE snapshots
   current ciphertext/version into previous-* columns, writes new + bumps
   version, stamps `previous_secret_expires_at = now() + grace`.
3. Worker rotate handler returns reveal-once `{ secret: whsec_<32hex>,
   previousSecretExpiresAt, gracePeriodSeconds }`. Event/audit payload
   carries ONLY `{ secretVersion, previousSecretExpiresAt }`.
4. Worker delivery dual-signs with `X-Webhook-Signature` (current) and
   `X-Webhook-Signature-Previous` (previous, when un-expired); clean
   fallthrough on decryption failure.
5. New env: `WEBHOOK_SECRET_ROTATION_GRACE_SECONDS` (default 86400).
6. 6 new test cases (delivery x4, handler x2) + contracts + repository.

**Implementer-reported checks:** typecheck 43/43, lint 0 errors / 45
pre-existing warnings, contracts-tests 95/95, db-tests 512/513 (1
pre-existing notifications failure unrelated to PR), webhooks-worker-tests
70/70 (+6 new vs baseline).

## Pipeline status

- **Active task:** 0108 (verifier dispatched).
- **Open PRs:** #163 (Task 0108).
- **`main` HEAD:** `aae8d35` (Task 0107 verifier-PASS bookkeeping); will
  advance with orchestrator state-update commit on next push.
- **B5 webhook-helper dogfood arc:** CLOSED (0105/0106/0107 merged).
- **B5 secret-rotation arc:** OPEN — backend slice (0108) verifier in
  flight; console (0109) and CLI (0110) follow on stable contract.

## Next Tasks (after 0108 PASS)

- **Task 0109 — console reveal-once modal.** Pure SDK consumer of
  `RotateWebhookSecretResponse.secret`. Stripe/Linear-quality reveal-once
  modal in `apps/web-console-next/**`. Single-PR shape.
- **Task 0110 — `sourceplane webhook secrets rotate` CLI subcommand.**
  Symmetric CLI surface; pure SDK consumer; mirrors 0106/0107 conventions.
- **B5 — replay UI / failure-budget alerts** (console-side; consumer
  of existing events-worker read APIs once SDK delivery-history is final).
- **B7 — Audit-log UX expansion.**
- **B8 — admin-worker scaffold** (greenfield single-PR breather).

## Deferred (unchanged)

- `0085b` — see `ai/deferred.md`.
- `notifications-provider-swap` — see `ai/deferred.md`.
- `notifications-worker-dev-reframe` — see `ai/deferred.md`.
- `optional-spec-13-commands` — see `ai/deferred.md`.
