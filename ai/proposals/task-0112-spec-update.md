# Spec Proposal: Webhook endpoint re-enable surface

**Source task:** Task 0112 (console webhook-endpoint CRUD)
**Status:** Open — surfaced during implementation, not resolved in this PR.
**Out-of-scope guardrails:** Task 0112 explicitly forbids contract / SDK /
api-edge / webhooks-worker changes. This proposal documents the gap so a
follow-on can pick it up cleanly.

## The Gap

Task 0112's "Required Outcomes" includes:

> Org admin can re-enable an endpoint when the SDK/contract supports it;
> otherwise the implementer report carries a Spec Proposal pointing at the
> gap and the UI hides the control.

After reading the contract and SDK surface in this PR's "out of scope" zone:

- `packages/contracts/src/webhooks.ts` `UpdateWebhookEndpointRequest` accepts
  only `{ url?, name?, description? }` — no `status` field, no
  `disabledReason` clear, no `re-enable` toggle.
- `packages/sdk/src/webhooks.ts` mirrors this shape; there is no
  `enableEndpoint(...)` or equivalent method.
- `apps/webhooks-worker/src/handlers/webhook-endpoints.ts` exposes a
  `POST /disable` route (calling `repo.disableEndpoint`) but no `/enable`
  inverse — the repo layer has no exported `enableEndpoint` function.

So there is **no path** through the existing surface for a console operator
to flip a `disabled` endpoint back to `active`. The CLI is in the same
position. The disable-then-recreate workflow currently requires a fresh
endpoint with a fresh signing-secret rotation cycle, which is friction the
buyer-facing console should not impose long-term.

## Decision in Task 0112

The detail page hides the re-enable control entirely. When `status === "disabled"`,
the detail page now renders an inline notice card explaining the gap and
pointing at this proposal file. The destructive-confirm delete still works,
so the operator's recovery path is "delete + recreate" — same as before
this PR.

This avoids inventing an SDK method or contract field outside the PR
boundary, and keeps the user-facing message honest about why the option
isn't there.

## Proposed Follow-on

A separate task should:

1. Extend `UpdateWebhookEndpointRequest` with an optional `status: "active"`
   that flips a `disabled` endpoint back to `active`. Reject other status
   transitions at the contract level (active → disabled goes through the
   existing `/disable` route to preserve the audit-event shape).
2. Add a worker route `POST /v1/organizations/:orgId/webhooks/endpoints/:endpointId/enable`
   (symmetric to `/disable`), with a corresponding `repo.enableEndpoint`
   that clears `disabled_at` / `disabled_reason` and emits a
   `webhook_endpoint.enabled` event + audit entry. Symmetric route is
   preferred over an `UpdateWebhookEndpointRequest.status` flip because:
   - The disable side already lives at `POST /disable` with audit + event
     coupling that an unrelated `PATCH /endpoint` shouldn't replicate.
   - Symmetric routes make the audit log + event stream legible without
     consumers having to interpret a `PATCH` body to derive status changes.
3. Add `enableEndpoint(orgId, endpointId, opts)` to the SDK
   `WebhooksClient`.
4. Wire the console: re-enable button (replacing the inline notice card),
   destructive-confirm not required since this is an additive recovery.
5. Tests at the worker, SDK, and console layers — at minimum, an audit
   ledger entry on enable mirroring the disable shape.

## Why this can't ship inside Task 0112

PR Boundary explicitly lists `packages/contracts/src/webhooks.ts`,
`packages/sdk/src/webhooks.ts`, `apps/api-edge/src/webhooks-facade.ts`,
and `apps/webhooks-worker/**` as out of scope. A new route + method + contract
field would touch all four. Task 0112's "Failure modes that invalidate the
PR even if tests pass" list is unambiguous on this.

## Suggested next-task scoping

- **Task 0113 (proposed):** "Webhook endpoint re-enable: contract + SDK +
  worker route + console wiring." Single PR; the disable→enable symmetry
  and audit-event coupling keeps the diff focused.
- **Pre-req:** none. The console already gracefully degrades; this is
  purely an additive recovery path.
- **Acceptance:** disabled endpoint → console "Re-enable" button →
  endpoint flips to `active`, `disabled_at` / `disabled_reason` clear,
  `webhook_endpoint.enabled` audit + event row appear, deliveries
  resume on the next event.
