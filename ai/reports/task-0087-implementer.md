# Task 0087 — Implementer Report

**Task:** Wire `identity-worker` magic-link login to `notifications-worker` via internal service binding.
**Branch:** `impl/task-0087-identity-notifications-wire`
**PR:** [#135](https://github.com/sourceplane/multi-tenant-saas/pull/135)
**Status:** Submitted for review.

---

## Outcome

Magic-link login codes from `identity-worker` now flow through `notifications-worker` via an internal Cloudflare Worker service binding. The auth lifecycle stays decoupled from notifications delivery: a notifications failure cannot 5xx the login response.

## Changes

| File | Kind | Notes |
|---|---|---|
| `apps/identity-worker/wrangler.jsonc` | M | Add `NOTIFICATIONS_WORKER` service binding under `env.stage` (`notifications-worker-stage`) and `env.prod` (`notifications-worker-prod`). |
| `apps/identity-worker/src/env.ts` | M | Declare `NOTIFICATIONS_WORKER?: Fetcher`. |
| `apps/identity-worker/src/notifications-client.ts` | A | New best-effort client. POSTs `EnqueueNotificationRequest` to `https://notifications.internal/v1/notifications`. Never throws. Returns discriminated `{ok, notificationId} \| {ok:false, reason}` (`no_binding` \| `non_2xx` \| `network_error` \| `bad_response`). Modeled on `apps/notifications-worker/src/events-client.ts`. |
| `apps/identity-worker/src/handlers/login-start.ts` | M | After successful `auth.startLogin`, fire-and-forget enqueue an `auth.magic_link` notification. Skipped when `DEBUG_DELIVERY=true` (existing local-debug path already returns the raw code inline; emitting also would write a `local-debug` provider row per dev call). |
| `tests/identity-worker/src/notifications-client.test.ts` | A | 7 unit tests: missing binding no-op, 2xx success + header/body assertions, 4xx/5xx → `non_2xx`, fetch throw → `network_error`, wrong envelope → `bad_response`, malformed JSON → `bad_response`, never-throws contract. |

## Verification

| Check | Result |
|---|---|
| `pnpm test` (tests/identity-worker) | **110 passed.** New `notifications-client` suite: 7/7 green. Pre-existing baseline failure in `api-key-admin.test.ts` is unchanged (verified against `main`). |
| `pnpm --filter @saas/identity-worker typecheck` | Clean. |
| `pnpm --filter @saas/identity-worker build` (`wrangler deploy --dry-run`) | Clean. 199.63 KiB upload / 42.86 KiB gzip. |
| `orun validate` | Passes. |
| `orun plan` | 34 components × 3 envs → 72 jobs. Plan id `08b77a0bda18`. |
| `orun dry-run` | N/A — subcommand not present in installed orun (v2.9.0). Validate + plan executed in lieu. |

## Deviations from task spec (flagged for verifier)

### 1. `category: "security"` instead of `"transactional"`
Task body literally specifies `category="transactional"`. The V1 contract
(`packages/contracts/src/notifications.ts`, `NotificationCategorySchema`) enumerates
only `invitation | billing | security | support | product` — there is no `transactional`.
Task 0087 Non-Goals forbid contract changes. Spec `14-notifications.md` line 72 lists
`security` as the auditable category for auth flows. Chose `"security"`.

### 2. Sentinel `orgId = 00000000-0000-0000-0000-000000000000`
Login is pre-org (a user may belong to many orgs; the challenge is identity-scoped).
The notifications row schema (`packages/db/src/migrations/120_notifications_core/up.sql`)
requires a UUID `org_id` with no FK. The zero UUID is already the established system
sentinel (config-worker settings rows, COALESCE patterns in migrations 070/080).
Documented inline in `login-start.ts` as `SYSTEM_ORG_ID`.

### 3. Dev-env binding omitted
Task says wire `env.dev/stage/prod`. `identity-worker`'s `env.dev` block has **no**
other service bindings (only env vars), no `notifications-worker-dev` service is
deployed in this repo, and the dev path short-circuits via `DEBUG_DELIVERY=true`
which already returns the raw code inline (the enqueue branch is skipped). Added
binding to stage + prod only, matching repo convention.

## Design notes

- **Hostname**: `https://notifications.internal/v1/notifications`. The `.internal` host is
  cosmetic over a service binding — the routing is governed by the binding name
  `NOTIFICATIONS_WORKER`, not DNS. Chose this to match the documented internal-namespace
  convention rather than the bare `http://membership-worker/...` style used by
  `membership-client.ts`. Either works; the `.internal` form better signals intent
  to anyone grep'ing for cross-worker boundaries.
- **Idempotency**: not set on the enqueue request body itself (the `EnqueueNotificationRequest`
  contract does not include one). `correlationId: requestId` is propagated; the
  challenge identity (one challenge → one code) makes practical dedupe a notifications-side
  concern keyed on `(orgId, templateKey, correlationId)`.
- **No secret leakage**: `templateData` carries `code`, `emailHint`, `expiresAt`,
  `requestId`. The raw `code` IS the message payload by definition of magic-link
  (it's what the user pastes back); `codeHash` stays in `auth_challenges`. No
  tokens, no provider responses, no DB rows are placed in `templateData`.
- **Best-effort enforcement**: `enqueueNotification` swallows all failure modes inside
  the client; the handler does not need a try/catch and the user-facing response
  is computed independently. Tested explicitly.

## Items left for downstream / future work

- Provisioning a `notifications-worker-dev` instance would let us wire dev too if
  the team later wants the enqueue path exercised in local stacks. Not required for 0087.
- Contract evolution to add a `transactional` category (if product wants the
  taxonomy expanded) would be a separate task.
- Notifications-side dedupe / idempotency strategy is unchanged; not in scope.

## Files of interest for the verifier

- `apps/identity-worker/src/handlers/login-start.ts:67-102` — the enqueue branch.
- `apps/identity-worker/src/notifications-client.ts` — full client.
- `tests/identity-worker/src/notifications-client.test.ts` — coverage.
- `apps/identity-worker/wrangler.jsonc` — `env.stage.services` and `env.prod.services` arrays.
