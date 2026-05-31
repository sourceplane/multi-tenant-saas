# Task 0113 — Implementer Report

**Task:** Webhook-endpoint re-enable surface (symmetric to disable)
**Branch:** `impl/task-0113-webhook-endpoint-reenable`
**Base:** `aa13ba7` (main, Task 0112 verifier-PASS bookkeeping)
**Status:** READY FOR PR

## Summary

- Shipped `POST /v1/organizations/:orgId/webhooks/endpoints/:endpointId/enable`
  end-to-end: contract → SDK → api-edge passthrough (regex already covers it,
  test pinned) → webhooks-worker route → db repo → console action.
- Worker handler mirrors the Task 0024 atomicity pattern: both repos
  (`createWebhookRepository(txExec)` + `createEventsRepository(txExec)`)
  constructed from the same `txExec` inside `executor.transaction(...)`;
  mutation failure short-circuits without event append; event-append
  failure throws `"event_append_failed"` to roll the tx back.
- DB repo `enableEndpoint(orgId, endpointId)` runs
  `UPDATE … SET status='active', disabled_reason=NULL, disabled_at=NULL,
  updated_at=now() WHERE org_id=$1 AND id=$2 AND status='disabled'
  RETURNING ${ENDPOINT_SAFE_COLUMNS}`; 0-row rowCount → `not_found`
  envelope (covers both "missing" and "already active"). `pending`
  endpoints are intentionally excluded by the WHERE guard.
- Console detail page replaces the inline notice card pointing at the
  spec proposal with a working "Re-enable endpoint" button + confirm
  dialog (`enable-endpoint-dialog.tsx`) calling
  `client.webhooks.enableEndpoint(...)`. Empty / active states unchanged.
- +11 net tests across the workspace (target ≥ +6): 5 worker (route
  405 + 3 atomicity cases + static-source guard for `txExec` wiring),
  3 db (success / not_found / internal), 2 SDK (URL+method, NotFoundError
  on 404), 1 api-edge facade (matcher pin).

## Files Changed (grouped)

Contracts (1):
- `packages/contracts/src/webhooks.ts` — add
  `EnableWebhookEndpointRequest` (empty, reserved) and
  `EnableWebhookEndpointResponse` (envelope-only). No change to
  `UpdateWebhookEndpointRequest`.

SDK (1):
- `packages/sdk/src/webhooks.ts` — `WebhooksClient.enableEndpoint(orgId,
  endpointId, body?, opts?)`. Idempotency-key forwarding via the same
  `RequestOptions` shape used by `disableEndpoint`. Standardized envelope
  via `transport.request<…>`.

DB (2):
- `packages/db/src/webhooks/types.ts` — `WebhookRepository.enableEndpoint`.
- `packages/db/src/webhooks/repository.ts` — implementation; mirrors
  `disableEndpoint` shape; uses `ENDPOINT_SAFE_COLUMNS` (no
  `secret_ciphertext` on the public-read surface).

API-Edge (0 src changes; passthrough is regex-driven):
- The existing `ORG_WEBHOOKS_RE` and `PRJ_WEBHOOKS_RE` regexes in
  `apps/api-edge/src/webhooks-facade.ts` already cover the new
  `/enable` subpath. No source change required.

Webhooks-Worker (2):
- `apps/webhooks-worker/src/handlers/webhook-endpoints.ts` —
  `handleEnableWebhookEndpoint`. Branches:
  (a) live executor path — opens `executor.transaction(async txExec =>
      …)`, constructs `txRepo` + `txEventsRepo` from the same `txExec`,
      mutation → emit event+audit; throws on event-append failure;
  (b) deps-injected path — for unit tests; mutation → optional
      eventsRepo emit; mirrors the failure modes for atomicity assertion.
- `apps/webhooks-worker/src/router.ts` — `ORG_ENDPOINT_ENABLE_RE` regex
  + `POST` dispatch to `handleEnableWebhookEndpoint`. Method-not-allowed
  on non-POST returns 405 (test pinned).

Console (3):
- `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`
  — adds `Re-enable endpoint` button (visible iff `isDisabled`),
  rewrites the disabled-state notice card to point at the new button
  instead of the spec proposal, mounts `EnableEndpointDialog`. Empty
  / active states unchanged.
- `apps/web-console-next/src/components/webhooks/enable-endpoint-dialog.tsx`
  — new. Confirm dialog using `useSession().client.webhooks.enableEndpoint`
  via `wrap(...)`; `<PreconditionInsight />` on `precondition_failed`;
  toast on other errors.
- `apps/web-console-next/src/components/webhooks/endpoint-crud.ts` —
  delete the "carry-forward gap" comment block; replace with a one-line
  pointer to the new dialog component.

Tests (4):
- `tests/db/src/webhooks.test.ts` — +3 tests (success clears
  `disabled_reason`/`disabled_at`, WHERE-guard scopes to `'disabled'`,
  no `secret_ciphertext` in RETURNING; not_found on 0 rows; internal
  envelope on PG error).
- `tests/webhooks-worker/src/webhooks-worker.test.ts` — +5 tests:
  - route 405 on GET to `/enable`
  - atomicity (a): mutation success → exactly one `webhook_endpoint.enabled`
    event with description "Webhook endpoint re-enabled" appended
  - atomicity (b): mutation failure → `appended === false`
  - atomicity (c): event-append failure → 503 to caller
  - static-source guard: enable block contains
    `createWebhookRepository(txExec)` + `createEventsRepository(txExec)`
    + `throw new Error("event_append_failed")`; repo SQL contains
    `SET status = 'active', disabled_reason = NULL, disabled_at = NULL`
    and `AND status = 'disabled'`.
- `tests/api-edge/src/webhooks-facade.test.ts` — +1 test pinning
  `isWebhooksRoute("/v1/organizations/.../endpoints/.../enable") === true`.
- `packages/sdk/src/__tests__/resources.test.ts` — +2 tests
  (POST hits `/enable` subpath; 404 → `NotFoundError`).

Spec proposal (1):
- `ai/proposals/task-0112-spec-update.md` — status flipped to RESOLVED,
  carry-forward block updated to point at this task / the symmetric
  route + SDK method.

## Checks Run

- `pnpm -w typecheck` — 44/44 success, FULL TURBO.
- `pnpm -w lint` — 37/37 success, FULL TURBO.
- `pnpm -w test` — 21 cached + 5 fresh successful; one **pre-existing**
  failure unrelated to this task: `tests/db/src/migrations.test.ts` →
  "each migration declares a valid bounded context" expects
  `VALID_CONTEXTS` to include `"notifications"`. The current main also
  fails this test (verified by stashing this task's diff and re-running);
  fixing the manifest constant is out of scope here and would expand
  the diff into the notifications context. Not introduced by Task 0113.
  Net new passing tests on this branch: +11 (target ≥ +6).
- `kiox exec -- orun validate --intent intent.yaml` — `✓ Intent is valid`,
  `✓ All validation passed`.
- `kiox exec -- orun plan --changed --intent intent.yaml --output plan.json`
  — 7 components × 3 envs → 17 jobs.
  Components selected: api-edge-tests, contracts, db, db-tests, sdk,
  web-console-next, webhooks-worker. **No** unrelated drag-in (events,
  identity, billing, notifications absent). api-edge itself is absent
  because the facade source is unchanged (regex already covers `/enable`);
  the matcher is pinned by the new test in `api-edge-tests` instead.
- `kiox exec -- orun run --plan plan.json --dry-run --runner github-actions`
  — 17/17 ✓ Verify (no failures, correct ordering).

## Architect-Brief Decisions

- **Confirm dialog vs no-dialog inline action** — chose dialog. Mirrors
  the existing `DisableEndpointDialog` UX pattern (label, busy state,
  precondition insight on failure, success toast); operators get a
  single beat to confirm + see what re-enabling preserves (signing
  secret unchanged, prior reason cleared) before the mutation fires.
  Matches Stripe-quality bar; no friction tax beyond the symmetric one
  cycle of disable.
- **Button placement** — inline in the detail-page action row, only
  rendered when `isDisabled`, immediately after the (now hidden)
  "Disable" button slot. Notice card is rewritten to point at the
  button rather than orphaned.
- **Audit description** — `"Webhook endpoint re-enabled"` (mirrors
  disable's `"Webhook endpoint disabled"` shape; subject id, target id,
  actor, request id; no payload). Test pins description match `re-enabled/i`.
- **Empty body on the contract** — preserved as `interface
  EnableWebhookEndpointRequest {}` for forward-compat (e.g. opt-in
  re-arm of delivery retries) under a future spec proposal. Worker
  ignores any client-sent body fields today.
- **Idempotency-key path** — reused the SDK transport's
  `RequestOptions.idempotencyKey`; no new header path. The empty body
  + idempotency key gives "POST is safe to retry" semantics with no
  schema cost.

## Assumptions (durable)

- `WebhookRepository.enableEndpoint` is a hard NO on `pending` endpoints.
  If a product question surfaces around enabling pending endpoints
  (e.g. retry-after-failure quarantine flow), it requires a fresh spec
  proposal rather than widening the WHERE clause.
- The non-tx fallback in `handleEnableWebhookEndpoint` is purely a
  test seam. Production always flows through `executor.transaction`
  because `createSqlExecutor` returns an executor with `transaction`.
  Tests inject `deps` to bypass the live executor; the static-source
  guard test ensures the tx branch wires both repos from the same
  `txExec` and throws on event-append failure.
- The api-edge facade source intentionally needs no change. The
  passthrough regex already covers `/enable`; the matcher invariant
  is pinned by an explicit `isWebhooksRoute` test so a future
  refactor that narrows the regex will fail on PR CI.

## Spec Proposals

- `ai/proposals/task-0112-spec-update.md` — flipped to
  **Status: RESOLVED — implemented in Task 0113**. Carry-forward set
  to "None" with the new method/route/console wiring documented inline.
  No new spec proposals surfaced.

## Remaining Gaps

- The pre-existing `tests/db/src/migrations.test.ts` failure for the
  `notifications` bounded context is unrelated and remains open.
  Recommend a tiny follow-on PR adding `"notifications"` to
  `VALID_CONTEXTS` (already in the schema list per `010_…` through
  `120_notifications_core` migration set).
- CLI surface (`sourceplane webhooks endpoints enable`) is intentionally
  not shipped here; Required Outcomes says the contract + SDK are
  sufficient for a clean CLI fan-out later.

## Next Task Dependencies

- Verifier (Task 0113-verifier) — re-run the four pnpm gates and the
  three orun gates above; confirm `--changed` selects only the
  in-scope components; code-path inspection on
  `handleEnableWebhookEndpoint` for the atomicity pattern; confirm no
  signing-secret leak across the diff; confirm the disabled-state
  inline notice no longer points at the spec proposal; post-merge
  smoke `https://stage.sourceplane.ai/orgs/test/webhooks` returns
  HTTP 200 with `<title>Sourceplane Console</title>`.
- Console event-surface task (future) — when the events-list UI lands,
  verify `webhook_endpoint.enabled` rows render with the same shape
  as `webhook_endpoint.disabled`.

## PR Number

**#168** — https://github.com/sourceplane/multi-tenant-saas/pull/168
