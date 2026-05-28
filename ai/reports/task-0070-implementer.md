# Task 0070 — Implementer Report

## Summary

Implemented delivery lifecycle events, recursion guard, and auto-disable for the webhooks worker.

## PR

https://github.com/sourceplane/multi-tenant-saas/pull/113

## Branch

`impl/task-0070-delivery-lifecycle-auto-disable`

## What Changed

### Delivery Lifecycle Events (`delivery.ts`)

After terminal delivery outcomes, the worker emits lifecycle events:
- `webhook.delivery_succeeded` — on successful HTTP delivery (2xx response)
- `webhook.delivery_failed` — on terminal failure (retry exhausted, non-retryable status)

Events are appended via `eventsRepo.appendEvent()` with:
- `source: "webhooks-worker"`, `actorType: "system"`
- `subjectKind: "webhook_delivery_attempt"`, `subjectId: attempt.id`
- `causationId` links back to the original event that triggered delivery
- Safe payload via `buildDeliveryLifecyclePayload()` — no secrets, no response bodies

Lifecycle event emission failures are caught and logged without affecting delivery status.

### Recursion Guard (`delivery.ts`)

`isWebhookLifecycleEvent(eventType)` checks against `WEBHOOK_LIFECYCLE_EVENT_TYPES` set:
- `webhook.delivery_succeeded`, `webhook.delivery_failed`, `webhook.disabled`

The dispatch loop skips lifecycle events entirely — no subscription matching, no delivery attempts created. The cursor still advances past them so they don't block processing.

### Auto-Disable (`delivery.ts` + `repository.ts` + `types.ts`)

On terminal failure during retry:
1. Calls `countConsecutiveEndpointFailures(orgId, endpointId)` — SQL counts failures after the latest success using `COALESCE` subquery
2. If count >= `AUTO_DISABLE_FAILURE_THRESHOLD` (15), calls `disableEndpoint()`
3. On successful disable, emits `webhook.disabled` audit event via `appendEventWithAudit`
4. Idempotent — if `disableEndpoint` returns `not_found` (already disabled), no event is emitted

### Repository Changes

- `WebhookRepository` interface: added `countConsecutiveEndpointFailures(orgId, endpointId): Promise<number>`
- `repository.ts`: SQL implementation counting `failed` status delivery attempts after the most recent `success` attempt for the endpoint

## Tests

17 new test cases added (66 total, all passing):

**Lifecycle events (4 tests):**
- Emits `webhook.delivery_succeeded` on success
- Emits `webhook.delivery_failed` on terminal failure
- Payload contains only safe metadata
- Lifecycle event append failure doesn't cause duplicate delivery

**Recursion guard (4 tests):**
- `isWebhookLifecycleEvent` type identification
- Lifecycle events not delivered to subscriptions
- `webhook.disabled` events not delivered
- Non-lifecycle events delivered normally alongside lifecycle events

**Auto-disable (4 tests):**
- Disables endpoint at threshold with audit event
- Does not disable below threshold
- Disabled endpoint skips HTTP delivery
- Idempotent for already-disabled endpoints

**buildDeliveryLifecyclePayload (1 test):**
- Returns safe metadata, no secrets

## Verification

- `tsc --noEmit` on `apps/webhooks-worker`: ✓ clean
- Jest: 66/66 tests passing ✓
