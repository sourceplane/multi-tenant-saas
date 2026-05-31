# Current Context

Last updated: 2026-05-31 — Task 0109 implementer COMPLETE; verifier
dispatched. PR #164 OPEN, MERGEABLE/CLEAN, PR-CI 5/5 SUCCESS at HEAD
`f95befa`. Verifier prompt at `ai/tasks/task-0109-verifier.md`.

## Current Task — 0109 (verifier in flight)

**PR:** #164 — https://github.com/sourceplane/multi-tenant-saas/pull/164
**Branch:** `impl/task-0109-webhook-console-reveal-once`
**HEAD:** `f95befa6137b424fba286b4e96ca26a66cfacf82`
**State:** OPEN / MERGEABLE / CLEAN
**Diff:** 12 files, +1170/-0, scope-clean (`apps/web-console-next/**`,
`tests/web-console-next/**`, report, lockfile only).
**PR-CI lanes (all SUCCESS):** plan +
`web-console-next-tests · dev · Verify` +
`web-console-next · {dev,stage,prod} · Verify deploy`.

Implementer report at `ai/reports/task-0109-implementer.md` (committed
on PR branch). Highlights:

- Two-page route shape: list at `/orgs/{orgSlug}/webhooks` + detail at
  `/orgs/{orgSlug}/webhooks/{endpointId}`. Mirrors `members` /
  `api-keys` precedent.
- Reveal-once invariant enforced at the **state-machine level**
  (discriminated union in `rotate-flow.ts`): `secret` field exists
  ONLY on the `revealing` arm; `closeReveal` returns to `idle`,
  dropping the secret from React state. Defensive `useEffect` cleanup
  on dialog unmount as belt-and-braces.
- Sidebar gains exactly one new "Webhooks" entry under
  `Org · {orgSlug}` (between API keys and Config), `Webhook` icon
  from `lucide-react`.
- Legacy no-encryption-key case handled: when `secret` is undefined
  on `RotateWebhookSecretResponse`, dialog renders an amber-toned
  "rotation completed — secret not returned" affordance.
- New workspace `tests/web-console-next` (mirroring `tests/contracts`
  shape) with 18-test Jest suite — includes
  `JSON.stringify(state).includes("whsec_")` scrub assertion after
  `closeReveal`.
- Decisions deferred (record-only, not blockers): Cmd-K palette
  entry, console-side endpoint creation UX, narrow-viewport sidebar
  visual regression check.

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

## Pipeline status

- **Active task:** 0109 (verifier dispatched).
- **Open PRs:** #164.
- **`main` HEAD:** advances on this dispatch commit.
- **B5 webhook-helper dogfood arc:** CLOSED (0105/0106/0107 merged).
- **B5 secret-rotation arc:** backend (0108) MERGED. Console (0109)
  in verification. CLI (0110) follows after 0109 PASS.

## Next Tasks

- **Task 0110 — `sourceplane webhook secrets rotate` CLI subcommand.**
  Symmetric CLI surface; pure SDK consumer; mirrors 0106/0107
  conventions. File-disjoint from 0109 — could be parallel-scoped if
  needed, but per user-profile rule (Orun SaaS task agents run inline
  by default), wait for 0109 PASS before scoping.
- **B5 — replay UI / failure-budget alerts** (console-side; consumer
  of existing events-worker read APIs once SDK delivery-history is final).
- **B5 — webhook subscriptions UX / delivery-attempts UX** (console;
  separate B5 follow-ups deferred from 0109).
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
