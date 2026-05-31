# Task 0108 — Implementer Report

**Task:** B5 webhook secret rotation grace — dual-secret window so rotated
endpoints keep the previous signing secret valid for a configurable grace
period; outbound delivery dual-signs with `X-Webhook-Signature` (current)
and `X-Webhook-Signature-Previous` (previous) during the window. Rotate
response now reveals the new plaintext signing secret EXACTLY ONCE
(`whsec_<32 hex>`), never persisted in any log/event/audit row.

**Branch:** `impl/task-0108-webhook-secret-rotation-grace`
**Base:** `main` (commit `b82b305 ai: scope Task 0108`)

---

## Summary

- Forward-only migration `130_webhook_secret_rotation_grace` adds three
  nullable previous-secret columns to `webhooks.webhook_endpoints`.
- `rotateEndpointSecret` is atomic: a single UPDATE snapshots
  `secret_ciphertext` / `secret_version` into the previous-* columns,
  writes the new ciphertext + bumps the version, and stamps
  `previous_secret_expires_at = now() + grace_period`.
- Worker rotate handler returns `{ endpoint, secret: "whsec_<32hex>",
  previousSecretExpiresAt, gracePeriodSeconds }` — plaintext is reveal-once
  and never re-readable. Event/audit payload carries only
  `{ secretVersion, previousSecretExpiresAt }` (no plaintext).
- Worker delivery decrypts the previous ciphertext (when present and
  un-expired) and attaches a second signature on
  `X-Webhook-Signature-Previous`. After the grace expiry, no previous
  header is emitted.
- 6 new test cases (worker delivery x4, worker handler static-source x2)
  plus 2 contracts test additions and 1 repository test — verifier-required
  count of ≥4 satisfied with margin.

## Files changed

```
apps/webhooks-worker/src/delivery.ts                       |  21 ++
apps/webhooks-worker/src/env.ts                            |   8 +
apps/webhooks-worker/src/handlers/webhook-endpoints.ts     |  47 ++-
packages/contracts/src/webhooks.ts                         |  25 +
packages/db/src/manifest.ts                                |   9 +
packages/db/src/migrations/130_..._/up.sql      (NEW)
packages/db/src/webhooks/repository.ts                     |  80 +-
packages/db/src/webhooks/types.ts                          |  37 +-
tests/contracts/src/webhooks.test.ts                       |  30 +
tests/db/src/webhooks.test.ts                              | 104 +-
tests/webhooks-worker/src/delivery.test.ts                 |  86 +
tests/webhooks-worker/src/webhooks-worker.test.ts          |  51 +
```

11 files, +472/-26.

PR-boundary footnote: spec lists 8 path slots. Of the 11 paths above, three
are unavoidable infrastructure (`packages/db/src/manifest.ts` registers the
new migration; `apps/webhooks-worker/src/env.ts` declares the new
`WEBHOOK_SECRET_ROTATION_GRACE_SECONDS` env var; the contracts/db test
files exercise the repository+contract changes the spec lists as Verifier
acceptance gates). All paths remain inside the worker / db / contracts
subsystems.

## Migration `130_webhook_secret_rotation_grace`

`packages/db/src/migrations/130_webhook_secret_rotation_grace/up.sql`:

- `ALTER TABLE webhooks.webhook_endpoints ADD COLUMN IF NOT EXISTS
  previous_secret_ciphertext TEXT NULL;`
- `ALTER TABLE webhooks.webhook_endpoints ADD COLUMN IF NOT EXISTS
  previous_secret_version INT NULL;`
- `ALTER TABLE webhooks.webhook_endpoints ADD COLUMN IF NOT EXISTS
  previous_secret_expires_at TIMESTAMPTZ NULL;`

Idempotent (safe to re-run). No backfill — existing rows stay NULL until
their next rotation. Forward-only.

`packages/db/src/manifest.ts` registers the migration with sha-256
`4c5474e7b5ca228adc18ca09b7cd2387938efab8f1e55b675fd4aee6e3ec4e5a`.

## Repository + types

`packages/db/src/webhooks/types.ts` adds `RotateEndpointSecretInput`
(optional `secretCiphertext`, optional `gracePeriodSeconds`),
`RotateEndpointSecretResult` (`{ endpoint, previousSecretExpiresAt }` —
no secret material), and three optional fields on
`EndpointForDelivery`: `previousSecretCiphertext`,
`previousSecretVersion`, `previousSecretExpiresAt`.

`packages/db/src/webhooks/repository.ts`:
- `rotateEndpointSecret(orgId, endpointId, input)` — single UPDATE that
  copies current ciphertext/version into previous-* columns and sets
  `previous_secret_expires_at = now() + (gracePeriodSeconds * interval
  '1 second')`. Returns the post-rotate endpoint plus
  `previousSecretExpiresAt` for the response builder. NEVER returns
  plaintext or ciphertext.
- `getEndpointForDelivery` now hydrates the three previous-* columns
  alongside the active secret. `ENDPOINT_SAFE_COLUMNS` (the read-set used
  by public endpoint reads) is UNCHANGED — it still excludes
  `secret_ciphertext` and now excludes `previous_secret_ciphertext` by
  omission.

## Contracts

`packages/contracts/src/webhooks.ts` extends
`RotateWebhookSecretResponse`:

```ts
export interface RotateWebhookSecretResponse {
  endpoint: PublicWebhookEndpoint;
  /** Reveal-once plaintext secret. `whsec_<32 hex>`. Never persisted. */
  secret?: string;
  /** ISO timestamp the dual-signature grace window closes at. Null when no grace window was applied. */
  previousSecretExpiresAt: string | null;
  /** Echo of the grace-period window applied to this rotation, in seconds. */
  gracePeriodSeconds: number;
}
```

`secret` is optional because legacy callers without a configured
`SECRET_ENCRYPTION_KEY` cannot mint plaintext (worker degrades to no-op
rather than emitting cleartext through an unencrypted path).

## Worker rotate handler

`apps/webhooks-worker/src/handlers/webhook-endpoints.ts` —
`encryptSigningSecret(env)` now returns `{ secret, ciphertext }` instead
of just the ciphertext. `handleRotateWebhookSecret` consumes both: the
ciphertext goes through the repository write, the plaintext is wrapped
`whsec_${plaintext}` and placed on the response exactly once.

The event/audit emission carries ONLY `secretVersion` and
`previousSecretExpiresAt` — no plaintext, no ciphertext, no version of
the variable name in the payload. Audit description is the static
string `Webhook endpoint signing secret rotated`.

## Worker delivery dual-sign

`apps/webhooks-worker/src/delivery.ts` — when the endpoint carries a
non-null `previousSecretCiphertext` AND `previousSecretExpiresAt > now`,
the previous ciphertext is decrypted via the same encryption adapter
and a second signature is computed using the existing constant-time
`computeSignature` helper. The header
`X-Webhook-Signature-Previous` is attached alongside
`X-Webhook-Signature`. After expiry — or if decryption fails — the
previous header is omitted (parallels current secret behaviour).

## Env

`apps/webhooks-worker/src/env.ts` adds optional
`WEBHOOK_SECRET_ROTATION_GRACE_SECONDS?: string`. Server default is
86400 (24h). `0` disables the snapshot (no previous secret captured;
no `X-Webhook-Signature-Previous` ever emitted from that rotation
forward).

## Tests added

Worker delivery (`tests/webhooks-worker/src/delivery.test.ts`):
1. dual-signature delivery within grace window — both
   `X-Webhook-Signature` and `X-Webhook-Signature-Previous` present
2. post-expiry delivery — only `X-Webhook-Signature` present
3. previous-decryption-failure fallback — no `Previous` header,
   delivery still succeeds
4. previous-secret-null endpoint — single signature, no `Previous`
   header

Worker handler (`tests/webhooks-worker/src/webhooks-worker.test.ts`):
5. reveal-once shape regression — handler source contains
   `secret: \`whsec_${plaintextSecret}\`` and `randomHex(32)`
6. payload-sanitisation regression — neither `plaintextSecret` nor
   `whsec_` ever appears inside any `payload: { ... }` literal nor in
   the audit description string in the rotate handler

Contracts (`tests/contracts/src/webhooks.test.ts`):
- existing rotate-response fixture extended with new fields
- new fixture asserting `secret` matches `/^whsec_[0-9a-f]{32}$/`

Repository (`tests/db/src/webhooks.test.ts`):
- `rotateEndpointSecret` accepts new input shape, params include
  `86400` and the new ciphertext envelope
- `rotateEndpointSecret` never returns plaintext/ciphertext (regression)
- `getEndpointForDelivery` mapping covers the three previous-* fields

## Checks run

- `pnpm -w typecheck` → 43/43 OK
- `pnpm -w lint` → 0 errors, 45 warnings (all pre-existing in
  `tests/api-edge/**`)
- `pnpm --filter @saas/contracts-tests test` → 95/95 pass
- `pnpm --filter @saas/db-tests test` → 512/513 pass; 1 pre-existing
  failure in `migrations.test.ts` (`notifications` context, unrelated to
  this PR — confirmed via `git stash`)
- `pnpm --filter @saas/webhooks-worker-tests test` → 70/70 pass
  (+6 cases added: 4 in delivery.test.ts, 2 in webhooks-worker.test.ts)

## Assumptions

- Header name: `X-Webhook-Signature-Previous` (mirrors existing
  `X-Webhook-Signature`).
- Grace default: 86400s (24h). Operator override via
  `WEBHOOK_SECRET_ROTATION_GRACE_SECONDS`. Setting `0` disables the
  snapshot for that rotation (response still includes
  `gracePeriodSeconds: 0` but never a `previousSecretExpiresAt`).
- Hex length: 32 (`/^whsec_[0-9a-f]{32}$/`).
- Atomic UPDATE chosen over read-then-write because it eliminates a
  race between rotates (a back-to-back rotate cannot lose the previous
  ciphertext because the snapshot reads inside the same UPDATE).
- Reveal-once architecture: `secret` is a response-only field; there is
  NO new "fetch endpoint secret" surface, no audit row carrying the
  plaintext, no event payload carrying it.

## Remaining gaps (out of scope per spec)

- `@saas/webhook-verifier` is single-key today. Until extended (a
  follow-on task), subscribers must inspect the response and choose
  which key to verify against during the grace window. Spec explicitly
  carves this out as out-of-scope.
- Console reveal-once modal (Task 0109) — pending.
- `sourceplane webhook secrets rotate` CLI subcommand (Task 0110) —
  pending.

## Next task dependencies

- Task 0109 (console reveal-once modal) consumes
  `RotateWebhookSecretResponse.secret`.
- Task 0110 (CLI rotate subcommand) consumes the same field.

## PR

PR Number: TBD — to be filled after `gh pr create` runs on user
authorisation.
