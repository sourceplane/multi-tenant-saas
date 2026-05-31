# Current Context

Last updated: 2026-05-31 — Task 0107 closed (PASS+MERGED on `e08d106`),
Task 0108 SCOPED and dispatched to implementer. The B5 webhook-helper
dogfood arc closed with 0107; the **B5 secret-rotation UX arc** opens
with 0108 (backend slice).

## Active Task — 0108 (Implementer dispatched)

**Branch:** `impl/task-0108-webhook-secret-rotation-grace`
**Sealed snapshot:** main `aae8d35` (Task 0107 verifier-PASS bookkeeping).
**Prompt:** `ai/tasks/task-0108.md`
**Status:** scoped, ready for implementer pickup.

**Objective.** Backend half of the B5 "webhook secrets rotate UX" arc:
ship a reveal-once plaintext `whsec_<32hex>` secret on rotate, a
24h-default dual-secret grace window persisted on
`webhooks.webhook_endpoints`, and a dual-signature delivery during the
window via a new `X-Webhook-Signature-Previous` header. Contract
extends `RotateWebhookSecretResponse`. Console (Task 0109) and CLI
(Task 0110) consumer surfaces follow on stable contracts — same
0103→0104→0105 cadence used for the AuthClient → console → CLI arc.

**PR boundary (≤8 paths).**

1. `packages/db/src/migrations/130_webhook_secret_rotation_grace/up.sql`
   NEW — idempotent column adds.
2. `packages/db/src/webhooks/repository.ts` — extend
   `rotateEndpointSecret` to accept `gracePeriodSeconds` and perform an
   atomic single-`UPDATE` (copy current→previous, set
   `previous_secret_expires_at = now() + interval`, write new, bump
   `secret_version`). `ENDPOINT_SAFE_COLUMNS` must NOT leak
   `previous_secret_ciphertext`.
3. `packages/db/src/webhooks/types.ts` — three optional fields on the
   delivery-bound endpoint type.
4. `packages/contracts/src/webhooks.ts` — `RotateWebhookSecretResponse`
   gets `secret`, `previousSecretExpiresAt`, `gracePeriodSeconds`.
5. `apps/webhooks-worker/src/handlers/webhook-endpoints.ts` — return
   plaintext once; event/audit payload sanitised to
   `{secretVersion, previousSecretExpiresAt}` ONLY.
6. `apps/webhooks-worker/src/delivery.ts` —
   `X-Webhook-Signature-Previous` when un-expired previous secret is
   present.
7. `apps/webhooks-worker/src/__tests__/*.test.ts` — ≥4 new cases (shape
   regex, no-leak audit, dual-sig within grace, single-sig post-expiry).
8. `ai/reports/task-0108-implementer.md` — committed on PR branch.

**Hard rules.** Zero new disables/casts under any path in scope; zero
`node:*` under new code; zero plaintext in event/audit/log paths;
reveal-once (no fetch-secret surface introduced); reuse
`computeSignature` verbatim. No edits to `packages/sdk/**`,
`packages/webhook-verifier/**`, `packages/cli/**`,
`apps/web-console-next/**`, or `pnpm-lock.yaml`.

## Pipeline status

- **Active task:** 0108 (implementer dispatched).
- **Open PRs:** none yet (implementer creates).
- **`main` HEAD:** `aae8d35` (Task 0107 verifier-PASS bookkeeping).
- **Working tree:** clean except long-standing unrelated `kiox.lock`
  v2.3.0→v2.9.0 drift (NOT bundled).
- **`@saas/cli` test count baseline:** 9 files, 123 cases (from 0107).
- **B5 webhook-helper dogfood arc:** CLOSED.
- **B5 secret-rotation arc:** OPEN — backend slice (0108) in flight.

## Next Tasks (after 0108 PASS)

- **Task 0109 — console reveal-once modal.** Pure SDK consumer of the
  new `RotateWebhookSecretResponse.secret`. Builds the
  Stripe/Linear-quality reveal-once modal in
  `apps/web-console-next/**`. Single-PR shape.
- **Task 0110 — `sourceplane webhook secrets rotate` CLI subcommand.**
  Symmetric CLI surface; pure SDK consumer; mirrors
  0106/0107 surface conventions. Single-PR shape.
- **B5 — replay UI / failure-budget alerts** (console-side; pure
  consumer of existing events-worker read APIs once SDK
  delivery-history client is final).
- **B7 — Audit-log UX expansion.**
- **B8 — admin-worker scaffold** (greenfield single-PR breather).

## Deferred (unchanged)

- `0085b` — see `ai/deferred.md`.
- `notifications-provider-swap` — see `ai/deferred.md`.
- `notifications-worker-dev-reframe` — see `ai/deferred.md`.
- `optional-spec-13-commands` — see `ai/deferred.md`.
