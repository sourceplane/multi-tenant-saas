# Task 0087 — Verifier Report

**PR:** [#135](https://github.com/sourceplane/multi-tenant-saas/pull/135)
`feat(identity): wire login-start to notifications-worker via service binding (task 0087)`
**Branch:** `impl/task-0087-identity-notifications-wire`
**Head SHA at verify:** `df36ba8136a5aa66e16af8ad18aafd824bc6bc4a`
**Base:** `main` (`e3ff231`)

---

## Result: PASS

All acceptance criteria met. The three implementer-flagged deviations are
judged acceptable against spec 14, the V1 notifications contract, and
established repo conventions. Merging via standard Verifier Merge
Protocol.

## Checks

### Scope audit (PR Boundary)

| File | +/- | Within boundary? |
|---|---|---|
| `apps/identity-worker/wrangler.jsonc` | +8 / -0 | ✓ |
| `apps/identity-worker/src/env.ts` | +1 / -0 | ✓ |
| `apps/identity-worker/src/notifications-client.ts` | +114 / -0 NEW | ✓ |
| `apps/identity-worker/src/handlers/login-start.ts` | +60 / -0 | ✓ |
| `tests/identity-worker/src/notifications-client.test.ts` | +143 / -0 NEW | ✓ |
| `ai/reports/task-0087-implementer.md` | +91 / -0 NEW | ✓ |

Total: **6 files, +417 / -0.** No edits under
`apps/notifications-worker/**`, `packages/contracts/src/notifications.ts`,
`packages/db/src/notifications/**`, `infra/terraform/cloudflare-domain/**`,
the cloudflare provider pin, or any unrelated worker / contract /
composition / migration.

### Local validation block (run verbatim on PR head)

```
$ pnpm -w install --frozen-lockfile
Lockfile is up to date, resolution step is skipped.  Already up to date. Done in 441ms.

$ pnpm -F @saas/identity-worker-tests test          # (the test workspace; implementer's pkg label)
PASS src/security-events.test.ts
PASS src/profile.test.ts
PASS src/auth-service.test.ts
PASS src/resolve-bearer.test.ts
PASS src/notifications-client.test.ts               # 7/7 new tests pass
PASS src/envelope.test.ts
FAIL src/api-key-admin.test.ts (suite-load typecheck error: Fetcher type)
Tests: 110 passed, 110 total.
       Pre-existing baseline failure on main (confirmed by `git checkout origin/main -- .`
       reproducing identical `Fetcher` + `crypto` TS errors). Not introduced by PR #135.

$ pnpm -F @saas/identity-worker typecheck
Clean. tsc --noEmit exit 0.

$ pnpm -F @saas/identity-worker build               # wrangler deploy --dry-run
Total Upload: 199.63 KiB / gzip: 42.86 KiB.  --dry-run: exiting now.

$ pnpm -w build
Pre-existing identity-worker-tests#build failure (Fetcher/crypto TS errors on main, same root
cause as the api-key-admin test-suite load failure). All worker workspaces build green
(20 successful, including identity-worker). Not a regression.

$ /Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
✓ Intent is valid  /  ✓ All validation passed

$ /Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output /tmp/plan-0087.json
2 components × 3 envs → 4 jobs.  components: identity-worker, identity-worker-tests
plan id: d12eaf4ca98f                      # changed-only correctly selected only the wire surface

$ /Users/irinelinson/.local/bin/kiox -- orun run --plan /tmp/plan-0087.json --dry-run --runner github-actions
✓ identity-worker-tests · dev · Verify
✓ identity-worker · {dev,stage,prod} · Verify deploy
4 selected.  (orun v2.9.0 — `run --dry-run` IS available; implementer's evidence was stale.)
```

### PR-CI rollup (re-polled at verify time)

Run [`26656687952`](https://github.com/sourceplane/multi-tenant-saas/actions/runs/26656687952)
on head `df36ba8`:

| Check | Status |
|---|---|
| `plan` | pass (9s) |
| `identity-worker-tests · dev · Verify` | pass (28s) |
| `identity-worker · dev · Verify deploy` | pass (49s) |
| `identity-worker · stage · Verify deploy` | pass (48s) |
| `identity-worker · prod · Verify deploy` | pass (1m27s) |

**5/5 SUCCESS.** `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`.

### Best-effort contract (cross-read both files)

Read both `notifications-client.ts` (lines 1–114) and the enqueue branch in
`login-start.ts` (lines 67–102). Confirmed:

- `enqueueNotification` returns a discriminated union `{ ok: true,
  notificationId } | { ok: false, reason }`, never throws. All four
  documented failure modes (`no_binding`, `non_2xx`, `network_error`,
  `bad_response`) return the closed-form result.
- `fetch` is wrapped in a `try/catch` that returns `network_error`.
  `response.json()` is wrapped in a `try/catch` that returns
  `bad_response`. Envelope-shape guards (`parsed.data`,
  `data.notification`, `notification.id`) each fail-soft into
  `bad_response`.
- `login-start.ts` calls `await enqueueNotification(...)` and discards
  the return value. The success path then unconditionally constructs
  `LoginStartResponse` from the auth result. A notifications outage
  cannot 5xx `POST /v1/auth/login/start`. The outer
  `try/catch/finally` returns `internal_error` only on `auth.startLogin`
  / DB executor failures, never on notifications-client failures.

### Login response contract (byte-for-byte)

- `DEBUG_DELIVERY=true`: enqueue branch is skipped (`if (!isDebug)` gate
  at line 67). Response body is
  `{ challengeId, expiresAt, delivery: { mode: "local_debug", emailHint,
  code: result.rawCode } }`. Matches existing local-debug contract.
- Non-debug: enqueue happens; response body is
  `{ challengeId, expiresAt, delivery: { mode: "email", emailHint } }`.
  **No `code` field** in the non-debug response (object spread
  `...(isDebug ? { code: result.rawCode } : {})` is the only `code`
  insertion). Byte-for-byte unchanged from pre-PR behaviour.

### Spec 14 conformance on the enqueue payload

Built in `login-start.ts:79–100`:

| Field | Value | Conformance |
|---|---|---|
| `templateKey` | `"auth.magic_link"` | ✓ matches prompt |
| `recipient.channel` | `"email"` | ✓ matches spec 14 (V1 = email-only) |
| `recipient.address` | `email.trim().toLowerCase()` | ✓ canonical lower-cased per `NotificationRecipient` contract |
| `category` | `"security"` | ✓ — see Issue #1 below |
| `templateData` | `{ code, emailHint, expiresAt, requestId }` | ✓ exactly the four fields the prompt allows; no email address, no `codeHash`, no `challengeId`, no tokens |
| `orgId` | `SYSTEM_ORG_ID` (zero UUID) | ✓ — see Issue #2 below |
| `correlationId` | `requestId` | ✓ tracing propagation |

### Internal headers vs `apps/notifications-worker/src/router.ts`

Notifications-worker `router.ts` requires three headers on every
internal endpoint:

```
x-internal-actor:    must be in NOTIFICATIONS_INTERNAL_ACTOR_VALUES
                     = ["identity-worker", "membership-worker", "billing-worker", …]
x-actor-subject-id:  non-empty string
x-actor-subject-type: non-empty string
```

PR head sends (`notifications-client.ts:66–72`):

```
content-type:          application/json
x-request-id:          ctx.requestId
x-internal-actor:      "identity-worker"   ← in allow-list ✓
x-actor-subject-type:  "system"            ← non-empty ✓
x-actor-subject-id:    "identity-worker"   ← non-empty ✓
```

URL path `/v1/notifications` matches `NOTIFICATIONS_LIST_PATH` POST
route in `router.ts`. The `https://notifications.internal` host is
cosmetic over the service binding (Cloudflare routes by binding name,
not DNS) — consistent with `events-client.ts` `http://events-worker`
convention.

## Issues (per flagged deviation)

### Deviation #1: `category: "security"` instead of `"transactional"` — **ACCEPT**

The prompt literally specified `category="transactional"`, but the V1
contract enum (`packages/contracts/src/notifications.ts:38–43`,
`NotificationCategory`) only allows
`invitation | billing | security | support | product`. There is no
`transactional` value. Adding one would require a contract change, which
Task 0087 Non-Goals explicitly forbid.

Spec 14 (`specs/components/14-notifications.md`) confirms `security` as
the auditable category for auth flows:
- L27: "…notification preferences, notification templates, and delivery
  orchestration for product, billing, security, invitation, and support
  messages."
- L72: "Invitation, billing, security, and support notifications must be
  auditable through emitted events."
- L96: "Invitation, billing, and security flows can enqueue
  notifications without knowing provider internals."

Magic-link login is by construction an identity proof / login challenge
— a "security" flow per the spec's own taxonomy. The implementer's
choice is the only choice consistent with both the contract and the
spec. **ACCEPT.** Reading the prompt's `"transactional"` as a spec drift
in the prompt itself rather than a constraint to honor.

### Deviation #2: Sentinel `orgId = "00000000-…"` — **ACCEPT**

`packages/db/src/migrations/120_notifications_core/up.sql:43,78,140,172`
declare `org_id UUID NOT NULL` on every notifications-owned table with
**no foreign key** to `iam.organizations`. The schema requires a
syntactically valid UUID, nothing more.

`specs/contracts/tenancy-and-rbac.md` does not mention `SYSTEM_ORG_ID`,
zero-UUID, or pre-org tenancy at all. There is no per-org RLS policy on
the notifications schema (no `CREATE POLICY` in migration 120), no FK
join-back to `iam.organizations`, and no application-level invariant in
`apps/notifications-worker/**` that would treat a zero-UUID row as
malformed (the enqueue handler stores `org_id` verbatim — verified by
inspection).

The zero UUID is an established repo sentinel:
- `packages/db/src/migrations/070_config_settings_flags/up.sql:48,104,166`
  uses `COALESCE(project_id, '00000000-…')` and
  `COALESCE(environment_id, '00000000-…')` in unique indexes for the
  null-project / null-environment case.
- `packages/db/src/migrations/080_webhooks_core/up.sql:74` uses the same
  pattern for `project_id`.

Using it on a pre-org row keeps the row well-formed without coupling
identity to membership (a user may belong to many orgs; the magic-link
challenge is identity-scoped). The login challenge cannot synthesize a
"real" org id without making an arbitrary, wrong choice. **ACCEPT.**

Risk note: filtering notifications-worker by `org_id` later won't
distinguish system-emitted from one-real-org rows for the zero UUID.
Not a tenancy violation; an operational filter consideration for a
future admin UI.

### Deviation #3: Dev-env binding omitted — **ACCEPT**

The prompt's Required Outcomes listed `env.dev`, `env.stage`, `env.prod`
binding wiring; the implementer wired only `env.stage` + `env.prod`.

Rationale checks out by inspection of `apps/identity-worker/wrangler.jsonc`:
- `env.dev` block has **no `services` array at all** (only `vars`). It
  also has **no `hyperdrive` binding** — dev identity-worker can't even
  reach a database, much less a service binding. The block is bare by
  design.
- No `notifications-worker-dev` service exists anywhere in the repo
  (`grep -r notifications-worker-dev` returns nothing). Adding a
  binding to a non-existent service would fail `wrangler deploy`'s
  service-binding resolution in dev.
- `env.dev.DEBUG_DELIVERY = "true"` short-circuits the enqueue branch
  via the `if (!isDebug)` gate. The wire would be unreachable even if
  bound.

This does not change any acceptance behaviour: the dev path returns the
raw `code` inline as it always has. Provisioning
`notifications-worker-dev` + adding the binding is a separate task if
the team later wants the path exercised in dev. **ACCEPT** and recorded
as a Remaining Gap, not a blocker.

### Additional finding — stage `DEBUG_DELIVERY=true`

`apps/identity-worker/wrangler.jsonc` shows `env.stage.DEBUG_DELIVERY =
"true"`. Only `env.prod` has `DEBUG_DELIVERY = "false"`. Consequence:
the enqueue branch **fires in prod only**; stage continues to return
`code` inline and skip the wire. This is pre-existing wiring (not added
by PR #135) and consistent with stage being a dev-debugging surface. It
means the live post-merge smoke can only exercise the wire on prod —
stage will validate the byte-for-byte "no regression on existing
local_debug response" path. Flagged so the smoke phase is interpreted
correctly. Not a FAIL.

## Risk Notes

- **No idempotency key on enqueue.** `correlationId: requestId` is
  propagated but the `EnqueueNotificationRequest` contract has no
  `idempotencyKey` field; retries within the challenge window will
  produce duplicate `local-debug` rows today. Acceptable for V1; a real
  provider swap will need a notifications-side dedupe strategy keyed on
  `(orgId, templateKey, recipient.address, correlationId)` or a contract
  evolution to add `idempotencyKey`.
- **Dev wire gap** (Deviation #3): the enqueue path is never exercised
  in dev. Local development will not catch regressions in the wire
  shape itself; only stage `Verify deploy` jobs and prod live behaviour
  do. Mitigated by the 7-unit-test coverage of the client and the V1
  notifications-worker contract tests.
- **PR-CI deploy-verify does not exercise the binding at runtime.**
  `Verify deploy` is a `wrangler deploy --dry-run` style check — it
  proves the identity-worker compiles + uploads with the new binding
  declared, not that the binding actually resolves to a live
  notifications-worker at runtime. Live `POST
  /v1/auth/login/start` against prod (post-merge) is the only
  end-to-end signal.
- **Sentinel-orgId filter ambiguity** (see Deviation #2 risk note).

## Spec Proposals

None filed. Both flagged deviations from the prompt are reconciled with
spec 14 and the contract enum as-is; no spec change is required.

## Live Deployment Status

To be appended after merge (post-merge main-CI run + live smoke).

## Recommended Next Move

Two strong candidates for the next orchestrator tick:

1. **`membership-worker` invitation-email wiring** on the same
   `NOTIFICATIONS_WORKER` service-binding pattern. `invitation` is in
   the contract enum, `membership-worker` is in the internal-actor
   allow-list, and the existing `revoke-invitation.ts` /
   `create-invitation.ts` handlers already follow the
   `executor.transaction()` + repo-construction-inside-callback pattern
   this PR mirrored. This consolidates a second real-world caller on
   notifications V1 before any provider swap, which de-risks the
   eventual Resend/Postmark/SES decision.
2. **Provision `notifications-worker-dev`** + add the dev binding to
   identity-worker (and to membership-worker once that lands). Closes
   the dev-wire gap so the enqueue path becomes locally testable
   without touching the contract or the existing live envs.

Deferred (parked, awaiting user input — orchestrator should not pick
without explicit user direction):
- Real notifications provider swap (Resend / Postmark / SES choice).
- Task 0085b cloudflare-domain v4 → v5 re-import.

## PR Number

**#135** — https://github.com/sourceplane/multi-tenant-saas/pull/135
