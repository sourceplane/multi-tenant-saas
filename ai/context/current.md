# Current Context

Last updated: 2026-05-31 — Task 0108 VERIFIED PASS + MERGED. PR #163 squash
`28b3ca1` on main. Post-merge main-CI run `26704557782` 14/14 SUCCESS,
including db-migrate apply on stage and prod. B5 secret-rotation backend
slice locked; downstream consumers (Task 0109 console, Task 0110 CLI) now
unblocked on a stable contract.

## Current Task — 0109 (next)

**Recommended:** Task 0109 — console reveal-once modal. Pure SDK consumer of
`RotateWebhookSecretResponse.secret`; the contract is now locked on `main`.
Single-PR shape under `apps/web-console-next/**`. No backend changes needed.

Task 0110 (`sourceplane webhook secrets rotate` CLI subcommand) is symmetric
and parallel-safe with 0109 (file-disjoint).

## Just-merged — 0108

**Branch (deleted):** `impl/task-0108-webhook-secret-rotation-grace`
**Squash merge:** `28b3ca1` (merged 2026-05-31T05:43:20Z)
**PR:** #163 — https://github.com/sourceplane/multi-tenant-saas/pull/163
**Reports:**
- Implementer: `ai/reports/task-0108-implementer.md`
- Verifier: `ai/reports/task-0108-verifier.md`

**Durable outcome on main:**

1. Migration `130_webhook_secret_rotation_grace` adds three nullable
   `previous_*` columns to `webhooks.webhook_endpoints` (forward-only,
   idempotent, applied on stage + prod).
2. `rotateEndpointSecret` is atomic single-UPDATE with optional grace
   window; `ENDPOINT_SAFE_COLUMNS` continues to exclude
   `previous_secret_ciphertext`.
3. Rotate handler returns reveal-once `{ secret: whsec_<32hex>,
   previousSecretExpiresAt, gracePeriodSeconds }`. Event/audit payload
   carries ONLY `{ secretVersion, previousSecretExpiresAt }`.
4. Worker delivery dual-signs with `X-Webhook-Signature` (current) and
   `X-Webhook-Signature-Previous` (previous, when un-expired); silent
   fallthrough on decryption failure.
5. New env: `WEBHOOK_SECRET_ROTATION_GRACE_SECONDS` (default 86400, 0 to
   disable snapshot).
6. Contract addition to `RotateWebhookSecretResponse` is purely additive
   (optional `secret`, new `previousSecretExpiresAt`, `gracePeriodSeconds`).

**Verification highlights:**

- PR-CI 14/14 SUCCESS on initial HEAD `90044b1` (run `26704364701`) and on
  rebased HEAD `a1945ed` (run `26704498632`, after `gh pr update-branch 163`
  for the recurring BEHIND-main pattern).
- Post-merge main-CI 14/14 SUCCESS (run `26704557782`).
- Migration apply on stage AND prod confirmed via `gh run view --log`
  grepping the runner's `applied` JSON list (not just job conclusion).
- Quality gates: typecheck 43/43 FULL TURBO, lint 36/36 FULL TURBO,
  contracts-tests 95/95, db-tests 512/513 (1 pre-existing notifications
  failure unchanged from main), webhooks-worker-tests 70/70 (+6 new).
- Orun gates: validate green, plan --changed selects exactly 6 components ×
  3 envs → 13 jobs, dry-run 13/13 preview-green.
- Hazard scan clean (zero new `eslint-disable`/`@ts-ignore`/`@ts-expect-error`/
  `as any`/`as unknown as`/`node:*` under PR diff).
- Plaintext leak scan: `whsec_` ONLY in success-response builder; payload
  literal carries no plaintext or ciphertext.
- `encryptSigningSecret` shape change (`{secret, ciphertext}`) — only two
  call sites in the workspace, both updated; no external consumers.

## Pipeline status

- **Active task:** 0109 (next pass — orchestrator scopes).
- **Open PRs:** none.
- **`main` HEAD:** `28b3ca1` (Task 0108 squash). State-update commit will
  advance HEAD on next push.
- **B5 webhook-helper dogfood arc:** CLOSED (0105/0106/0107 merged).
- **B5 secret-rotation arc:** backend slice (0108) MERGED. Console (0109)
  and CLI (0110) follow as pure SDK consumers on locked contract.

## Next Tasks

- **Task 0109 — console reveal-once modal.** Pure SDK consumer of
  `RotateWebhookSecretResponse.secret`. Stripe/Linear-quality reveal-once
  modal in `apps/web-console-next/**`. Single-PR shape.
- **Task 0110 — `sourceplane webhook secrets rotate` CLI subcommand.**
  Symmetric CLI surface; pure SDK consumer; mirrors 0106/0107 conventions.
- **B5 — replay UI / failure-budget alerts** (console-side; consumer
  of existing events-worker read APIs once SDK delivery-history is final).
- **B7 — Audit-log UX expansion.**
- **B8 — admin-worker scaffold** (greenfield single-PR breather).

## Spec Proposals (non-blocking)

- Webhook docs update for the new `X-Webhook-Signature-Previous` header +
  grace-window operational guidance for subscribers (verify-either-key
  during the window).
- `@saas/webhook-verifier` multi-key extension (out-of-scope per 0108
  spec): accept an array of secrets and validate against any. Track as a
  B5 tail item.

## Deferred (unchanged)

- `0085b` — see `ai/deferred.md`.
- `notifications-provider-swap` — see `ai/deferred.md`.
- `notifications-worker-dev-reframe` — see `ai/deferred.md`.
- `optional-spec-13-commands` — see `ai/deferred.md`.
