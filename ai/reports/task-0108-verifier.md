# Task 0108 — Verifier Report

## Result: PASS

PR #163 (B5 webhook secret rotation grace — backend slice) verified and squash-merged.
Migration `130_webhook_secret_rotation_grace` applied successfully on stage and prod
in both PR-CI and post-merge main-CI.

## PR Number

**#163** — https://github.com/sourceplane/multi-tenant-saas/pull/163
Squash merge commit on `main`: `28b3ca1` (merged 2026-05-31T05:43:20Z).

## Sealed Inputs Echo

| Item              | Value                                                 |
|-------------------|-------------------------------------------------------|
| PR HEAD (initial) | `90044b1`                                             |
| PR HEAD (rebased) | `a1945ed` (after `gh pr update-branch 163`)           |
| Sealed main snap  | `aae8d35` (Task 0107 verifier-PASS bookkeeping)       |
| Diff              | 13 files, +738/-26                                    |
| Branch            | `impl/task-0108-webhook-secret-rotation-grace`        |

## Checks

| Phase | Check                                                                 | Result                                              |
|------:|-----------------------------------------------------------------------|-----------------------------------------------------|
| 0     | Implementer report committed on PR branch (`cada19b` / report `90044b1`) | PASS                                            |
| 1     | PR file boundary: 8 prompted + 3 structurally forced + 2 test files   | PASS — all 13 documented and accepted               |
| 1     | `git checkout impl/task-0108-...` clean                               | PASS                                                |
| 2     | Hazard scan (`eslint-disable`/`@ts-ignore`/`@ts-expect-error`/`as any`/`as unknown as`/`node:` imports under PR diff) | ZERO hits |
| 2     | Plaintext leak scan in rotate handler                                 | `whsec_` ONLY in response builder line 595; payload limited to `{secretVersion, previousSecretExpiresAt}` |
| 2     | `ENDPOINT_SAFE_COLUMNS` audit                                         | `previous_secret_ciphertext` NEVER in safe-columns list (repository.ts:28) |
| 2     | Atomic rotate: single UPDATE writes both secret + previous-* columns  | PASS — repository.ts:303-333, single SQL statement  |
| 2     | `getEndpointForDelivery` hydrates the 3 previous-* fields             | PASS — repository.ts:537-563                        |
| 2     | Delivery dual-sign gated on `previousSecretCiphertext != null AND previousSecretExpiresAt > now`; clean fallthrough | PASS — delivery.ts:259-273 |
| 2     | Migration is forward-only and idempotent (`ADD COLUMN IF NOT EXISTS`) | PASS — up.sql, all three columns                    |
| 2     | Contracts addition is additive/backwards-compatible (`secret?` optional, new fields appended) | PASS — webhooks.ts:100-108 |
| 2     | `encryptSigningSecret` shape change to `{secret, ciphertext}` — call-site audit | Both call sites (lines 141 + 539) updated; no other consumers |
| 3     | `pnpm install --frozen-lockfile`                                      | clean, 39 workspaces                                |
| 3     | `pnpm -w typecheck`                                                   | 43/43 SUCCESS (FULL TURBO cached)                   |
| 3     | `pnpm -w lint`                                                        | 36/36 SUCCESS (FULL TURBO cached, 0 errors / 45 pre-existing warnings in `tests/api-edge/**`) |
| 3     | `pnpm --filter @saas/contracts-tests test`                            | 95/95 PASS, 7 suites                                |
| 3     | `pnpm --filter @saas/db-tests test`                                   | 512/513 PASS — only failure is the documented pre-existing `notifications` migration test (unchanged from main) |
| 3     | `pnpm --filter @saas/webhooks-worker-tests test`                      | 70/70 PASS, 2 suites (matches expected baseline +6 new) |
| 4     | `kiox -- orun validate --intent intent.yaml`                          | Intent valid                                        |
| 4     | `kiox -- orun plan --changed --base origin/main --intent intent.yaml` | 6 components × 3 envs → 13 jobs (contracts, contracts-tests, db, db-migrate, db-tests, webhooks-worker) — exactly the changed-set |
| 4     | `kiox -- orun run --plan ... --dry-run --runner github-actions`       | 13/13 selected, all preview-green                   |
| 5     | PR-CI on rebased HEAD `a1945ed` (run `26704498632`)                   | 14/14 SUCCESS                                       |
| 5     | PR-CI migration apply: `db-migrate · stage · Migrate`                 | applied `130_webhook_secret_rotation_grace`         |
| 5     | PR-CI migration apply: `db-migrate · prod · Migrate`                  | applied `130_webhook_secret_rotation_grace`         |
| 6     | `gh pr update-branch 163` (PR was BEHIND main on orchestrator dispatch commit `3fb258f`, recurring 0103/0104/0105/0107 pattern) | PASS — produced `a1945ed` |
| 6     | `gh pr merge 163 --squash --delete-branch`                            | merge commit `28b3ca1`                              |
| 6     | `git checkout main && git pull --ff-only origin main`                 | HEAD now `28b3ca1`                                  |
| 6.5   | Post-merge main-CI run `26704557782`                                  | 14/14 SUCCESS                                       |
| 6.5   | Post-merge main-CI: `db-migrate · stage · Migrate`                    | applied `130_webhook_secret_rotation_grace` (idempotent re-apply on stage; column adds are no-ops if present) |
| 6.5   | Post-merge main-CI: `db-migrate · prod · Migrate`                     | applied `130_webhook_secret_rotation_grace`         |

## CI Log Review

- **PR-CI on initial HEAD `90044b1`** (run `26704364701`): 14/14 SUCCESS — all
  required lanes green: `plan`, `contracts·{dev,stage,prod}·Verify`,
  `contracts-tests·dev·Verify`, `db·{dev,stage,prod}·Verify`,
  `db-migrate·{stage,prod}·Migrate`, `db-tests·dev·Verify`,
  `webhooks-worker·{dev,stage,prod}·Verify deploy`.
- **PR-CI on rebased HEAD `a1945ed`** (run `26704498632`): 14/14 SUCCESS.
  Migration apply log inspection (`gh run view --job=<jid> --log`) shows for
  both `stage` and `prod` migrate lanes:
  ```
  "applied": [
    "130_webhook_secret_rotation_grace"
  ```
  Confirming the migration ran (`Run orun run \\` → migrations runner output),
  not just job conclusion=success.
- **Post-merge main-CI on `28b3ca1`** (run `26704557782`): 14/14 SUCCESS.
  Same shape as PR-CI — re-application on stage/prod is idempotent because of
  `ADD COLUMN IF NOT EXISTS`. Both `stage` and `prod` `Migrate` jobs again log
  the applied migration list including `130_webhook_secret_rotation_grace`.

## Live Resource Evidence

- **Migration applied on stage:** PR-CI job `78920…` and post-merge job (run
  `26704557782`) both log the migration in the runner's `applied` list. The
  three new columns now exist on `webhooks.webhook_endpoints` in stage.
- **Migration applied on prod:** identical evidence on the prod migrate lane.
- **No deploy lane changes:** `webhooks-worker · {dev,stage,prod} · Verify deploy`
  ran the typecheck/build/dry-run smoke; this slice does not redeploy the worker
  (deploys land on push-main `deploy` profile separately and were not part of
  the scoped set here — none required for this slice).
- **Backwards-compatibility on existing endpoints:** the migration does not
  backfill; existing rows keep `previous_*` NULL until the next rotate. No data
  loss, no destructive changes.
- **Encryption-key call-site audit:** searched the workspace for
  `encryptSigningSecret(` — only two call sites, both inside
  `apps/webhooks-worker/src/handlers/webhook-endpoints.ts` (lines 141 create,
  539 rotate), both updated to the new `{secret, ciphertext}` return shape.
  No external consumers.

## Secret Handling Review

Confirmed zero plaintext leaks across the rotate path:

1. `handleRotateWebhookSecret` (lines 515-606):
   - Plaintext `secret` is generated in `encryptSigningSecret` and held only
     in the response-builder local (`plaintextSecret` line 541).
   - Event payload (lines 577-580) emits ONLY
     `{ secretVersion, previousSecretExpiresAt }` — **no plaintext, no
     ciphertext, no `whsec_` prefix in the event/audit row**.
   - Audit `description` is the static string
     `"Webhook endpoint signing secret rotated"` — no template interpolation,
     no leak vector.
   - `whsec_${plaintextSecret}` literal appears exactly once at line 595 in
     the success response builder, inside the optional spread that's only
     present when an encryption key is configured.
2. `ENDPOINT_SAFE_COLUMNS` (`repository.ts:28`) excludes
   `previous_secret_ciphertext` (and never has and never will include
   `secret_ciphertext`). All 8 callers of the constant are read-shaped surfaces.
   The two places `previous_secret_ciphertext` IS named in queries are:
   - The atomic rotate UPDATE (writes only) — repository.ts:306, 315, 324.
   - The delivery-time hydration query (`getEndpointForDelivery`) — repository.ts:537-541
     — which goes only into the `EndpointForDelivery` type and is consumed by
     the delivery loop, not by any API/read surface.
3. Reveal-once shape regex check: the value is `whsec_${randomHex(32)}`,
   `randomHex(32)` produces 32 lowercase hex chars, satisfying
   `/^whsec_[0-9a-f]{32}$/`.
4. Delivery-time dual-sign (`delivery.ts:259-273`): the previous-secret
   decrypt sits inside its own `try {} catch {}` with an empty body — failure
   is silent, no header is emitted, primary `X-Webhook-Signature` and the
   delivery itself are unaffected.

## Issues

None. No verifier fixes were required. The implementer's three "bonus" paths
beyond the 8-slot prompt budget (`packages/db/src/manifest.ts`,
`apps/webhooks-worker/src/env.ts`, contracts/db test files) are all
**structurally forced** and accepted:

- `manifest.ts` — every new migration MUST be registered there or
  `applyAllMigrations` will not run it.
- `env.ts` — declaring `WEBHOOK_SECRET_ROTATION_GRACE_SECONDS` in the typed
  `Env` is mandatory for `env.WEBHOOK_SECRET_ROTATION_GRACE_SECONDS` access in
  the handler to typecheck.
- `tests/contracts/src/webhooks.test.ts` and `tests/db/src/webhooks.test.ts` —
  explicitly listed in the verifier prompt's acceptance criteria for contracts
  shape + repository atomic-rotate coverage.

## Risk Notes

1. **`@saas/webhook-verifier` is single-key today.** Subscribers consuming the
   new `X-Webhook-Signature-Previous` header during the grace window must
   choose which key to verify against on a per-request basis (the helper
   doesn't yet take an array of secrets). This is documented as a non-goal in
   the implementer prompt and is a Spec Proposal candidate (see below).
2. **Operators tuning grace = 0** disable the dual-secret window. The handler
   correctly clears the previous-* columns on rotate-without-grace
   (`repository.ts:312-320` and `:321-328`), so disabled grace cleanly wipes
   any stale window from a prior rotation.
3. **`X-Webhook-Signature-Previous` is a NEW public header** — opt-in for
   subscribers, no breaking change. Webhook docs should be updated (Spec
   Proposal below).

## Spec Proposals

1. **Webhook docs update**: document the new `X-Webhook-Signature-Previous`
   header semantics + grace-window operational guidance for subscribers
   (verify-either-key during the window). Defer to docs-only follow-up;
   non-blocking.
2. **`@saas/webhook-verifier` multi-key extension** (out-of-scope per spec):
   accept an array of secrets and validate against any. Track as a B5 tail
   item; not blocking on 0108.

## Recommended Next Move

**Task 0109 — console reveal-once modal.** Pure SDK consumer of
`RotateWebhookSecretResponse.secret`; the contract is now locked on `main`.
Single-PR shape under `apps/web-console-next/**`. No backend changes needed.

Task 0110 (`sourceplane webhook secrets rotate` CLI subcommand) follows on
the same locked contract and can run in parallel with 0109 (file-disjoint).
