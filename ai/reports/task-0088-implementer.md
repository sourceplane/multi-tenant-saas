# Task 0088 — Implementer Report

**Agent:** Implementer
**Branch:** `impl/task-0088-membership-notifications-wire`
**PR:** #136 — https://github.com/sourceplane/multi-tenant-saas/pull/136
**Base:** `main` @ `0b33184`

## Summary

- **Client module location:** `apps/membership-worker/src/notifications-client.ts` — duplicated in-place from identity-worker's reference (same shape, same never-throws contract, same internal route `https://notifications.internal/v1/notifications`). Shared `@saas/notifications-client` package extraction explicitly deferred per task scope (would need a third caller before the abstraction earns its keep).
- **Template key:** `"invitation.created"` — matches the existing `invite.created` event type the worker already emits in the same transaction, so the audit / event / notification trio share a stable nomenclature.
- **Ordering decision:** enqueue runs **after** `executor.transaction(...)` commits successfully — strictly outside the tx callback. A rolled-back invitation cannot produce a notification. (Mirrors Task 0087 vs. `auth.startLogin`.)
- **`DEBUG_DELIVERY === "true"` short-circuit:** YES, the enqueue is skipped. Mirrors identity-worker. Rationale: dev flows already get the raw token returned inline via `delivery: { mode: "local_debug", token }`; an additional `local-debug` provider row per dev call would be redundant noise.
- **Best-effort contract preserved:** enqueue is awaited (safe — never throws) but the result is discarded. The 201 invitation response body, status, and headers are byte-identical regardless of notifications-worker outcome.

## Files Changed

### Worker
- `apps/membership-worker/src/env.ts` — `NOTIFICATIONS_WORKER?: Fetcher` added
- `apps/membership-worker/src/notifications-client.ts` — **new** (116 lines)
- `apps/membership-worker/src/handlers/create-invitation.ts` — wire added in both the transactional path (real) and the deps path (test-only, opt-in via `deps.enqueueNotification`)

### Wrangler
- `apps/membership-worker/wrangler.jsonc` — `NOTIFICATIONS_WORKER` service binding on `stage` (→ `notifications-worker-stage`) and `prod` (→ `notifications-worker-prod`). `dev` env block intentionally unchanged.

### Tests
- `tests/membership-worker/src/notifications-client.test.ts` — **new** (6 cases — mirror identity-worker's suite: `no_binding`, success-shape + headers, `non_2xx`, `network_error`, `bad_response` envelope, `bad_response` malformed JSON, never-throws)
- `tests/membership-worker/src/create-invitation-notifications.test.ts` — **new** (9 cases: payload shape, no raw token / no hash in payload, 201 unchanged on non_2xx, 201 unchanged on `no_binding`, no enqueue on validation, no enqueue on policy-deny, no enqueue on billing precondition_failed, DEBUG_DELIVERY skip + local_debug response preserved, templateData redaction-safe key allowlist)

### Task spec
- `ai/tasks/task-0088.md` — task scope (added to repo)

## Checks Run

| Command | Result |
|---|---|
| `pnpm --filter @saas/membership-worker typecheck` | ✅ clean |
| `pnpm --filter @saas/membership-worker lint` | ✅ clean |
| `pnpm --filter @saas/membership-worker build` (wrangler dry-run) | ✅ 231.21 KiB |
| `pnpm --filter @saas/membership-worker-tests typecheck` | ✅ clean |
| `pnpm --filter @saas/membership-worker-tests test` | ✅ 238 passed (5 suites, includes 15 new cases) |
| `pnpm --filter @saas/membership-worker-tests lint` | ✅ no new errors/warnings from my files (7 pre-existing errors in `membership-worker.test.ts` predate this PR — verified by file-name grep) |
| `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml` | ✅ "All validation passed" |
| `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json` | ✅ 2 components × 3 envs → 4 jobs (membership-worker dev/stage/prod + tests) |
| `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions` | ✅ 4 selected, all ✓ |

## Assumptions (durable)

- The `category: "invitation"` value already exists in the V1 `NotificationCategory` enum — no contract change required (confirmed against `packages/contracts/src/notifications.ts`).
- `"membership-worker"` is already in `NOTIFICATIONS_INTERNAL_ACTOR_VALUES` (line 289) — no allow-list change required.
- `templateData` field shape `{ role, invitationId, expiresAt, invitedBy, orgId }` is redaction-safe per the contract's `Record<string, string | number | boolean | null>` constraint (line 95) — all values are bounded primitives, no provider payloads, no tokens.
- The `kiox.lock` cache bumped from `v2.3.0` → `v2.9.0` during local `orun validate` invocation. I reverted that change with `git checkout kiox.lock` to keep the PR strictly scoped to task deliverables. The provider auto-update will happen in a dedicated maintenance PR.

## Spec Proposals

None — all changes fit within the scope of the existing V1 notifications contract.

## Remaining Gaps

- **`notifications-worker-dev` deploy target** — still does not exist. Dev membership-worker invocations return `{ ok: false, reason: "no_binding" }` from the client and the invitation flow proceeds without a notification. Deferred per task constraints.
- **Real provider swap** (Resend / Postmark / SES) — still on `local-debug` provider on both stage and prod. Defers user-choice; notifications-worker is exercised end-to-end on both envs without generating real outbound mail.
- **`accept-invitation` notification** — could naturally fold in as `invitation.accepted` once UX confirms they want the "Alice accepted your invite" confirmation flow. See Next Task Dependencies.
- **Shared `@saas/notifications-client` package** — duplicated module currently in identity-worker AND membership-worker. Refactor once a third caller (e.g. billing-worker for receipts, or membership-worker accept-invitation) is wired.
- **Task 0085b** (cloudflare-domain v4→v5) — still deferred; untouched by this PR.

## Next Task Dependencies

- A follow-up could wire `accept-invitation` to enqueue an `invitation.accepted` notification to the inviter (would exercise the second invitation-category template and start to validate the case for a shared notifications-client package).
- A follow-up could wire `billing-worker` receipts (`category: "billing"`, third caller) — which would be the natural trigger to extract `@saas/notifications-client` into a shared workspace package.
- `notifications-worker-dev` deploy target is a small standalone task that would let dev invitations / dev magic-link logins exercise the full pipe locally.

## PR Number

**#136** — https://github.com/sourceplane/multi-tenant-saas/pull/136
