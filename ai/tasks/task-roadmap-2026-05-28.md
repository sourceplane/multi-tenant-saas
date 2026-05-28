# Task Roadmap — 2026-05-28

## Purpose

This roadmap is a planning check for the next 20 PR-sized tasks after the
current repo state.

It is not a replacement for the Orchestrator loop. Each task still needs a
fresh real-repo inspection, PR-state check, and exact prompt before assignment.
The intent is to keep the next slice choices coherent: finish identity/security
account basics, then move through API keys, configuration, notifications,
webhooks, metering, billing, and product surfaces without mixing bounded
contexts in one PR.

## Source Of Truth Used

- `ai/state.json`
- `ai/context/current.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/context/task-ledger.md`
- `specs/schedule.md`
- `specs/components/02-identity.md`
- `specs/components/09-events-audit-observability.md`
- `specs/components/12-web-console.md`
- `specs/components/13-cli-and-sdk.md`

## Current Baseline

- Tasks 0043 and 0044 are complete.
- Identity-owned security-event source persistence is live.
- Identity auth runtime writes security events for login challenge creation,
  failed login completion, session creation, and session revocation/logout.
- Task 0045 is scoped as the next task: authenticated
  `GET /v1/auth/security-events`.
- Active spec pack remains `specs/**`; `specs-v2/**` stays out of scope.

## Detailed Next 10 Tasks

### Task 0045 — Identity Security Events Query Surface

Objective:
Expose authenticated `GET /v1/auth/security-events` through api-edge and
identity-worker so a signed-in user can list their own pre-organization,
identity-owned security history.

PR boundary:
- `@saas/contracts` response types.
- identity-worker handler/router, pagination validation, safe response mapping.
- api-edge auth-facade forwarding.
- focused identity-worker and api-edge tests.

Key outcomes:
- Standard success/error envelope with `meta.requestId` and `meta.cursor`.
- Cursor pagination with default limit 50 and max 100.
- Opaque cursor validation and `validation_failed` on malformed input.
- Self-only query based on bearer session resolution.
- Redacted safe metadata; no raw codes, tokens, hashes, API keys, or provider
  secrets.

Non-goals:
- No web-console UI.
- No API-key/account-settings behavior.
- No org-scoped audit copies.
- No migrations.

Verification focus:
- contracts, identity-worker, and api-edge typechecks.
- identity-worker and api-edge tests.
- Orun validate, changed plan, DAG, and dry-run.

Unlocks:
Account/security UI and future account settings surfaces can show real
security history.

### Task 0046 — Web Console Account Security Events View

Objective:
Add a small account/security view in the web console that consumes
`GET /v1/auth/security-events` and lets signed-in users inspect recent login and
session security history.

PR boundary:
- web-console navigation/state only for account security history.
- API client method for `auth/security-events`.
- UI rendering for event type, outcome, time, request context, and safe
  metadata.
- focused web-console tests or smoke checks already used by the app.

Key outcomes:
- Authenticated user can view their own security events from the deployed
  console.
- Pagination or "load more" uses the public cursor contract.
- Empty, loading, error, and unauthenticated states are handled cleanly.
- No internal Worker calls; web-console remains a public api-edge client.

Non-goals:
- No account settings mutation.
- No API-key UI.
- No organization audit changes.
- No new backend routes.

Verification focus:
- web-console typecheck/build.
- api client and UI behavior checks.
- Orun changed plan and dry-run.

Unlocks:
Account/security page shell for later account settings, API keys, and session
management UI.

### Task 0047 — API Key And Service Principal Persistence Foundation

Objective:
Add the database and repository foundation for organization-bound API keys and
service principals without exposing runtime routes yet.

PR boundary:
- new identity-owned migration for service principals and API keys.
- `@saas/db/identity` repository types and methods.
- db tests for schema, hashed-secret storage, cursor pagination, and
  bounded-context ownership.

Key outcomes:
- API keys store only hashes/prefixes, never raw key material.
- Service principals are organization-bound and optionally project-scoped.
- Role/scope model is explicit enough for later policy facts.
- Repository supports list/create/revoke primitives.
- Migration is idempotent and safe for the autocommit runner.

Non-goals:
- No public API-key route.
- No api-edge API-key auth.
- No web-console UI.
- No billing or metering tie-in.

Verification focus:
- db typecheck and db tests.
- manifest checksum.
- Orun changed plan proves db-migrate stage/prod path.

Unlocks:
API-key administration and service-principal auth runtime.

### Task 0048 — API Key Administration API

Objective:
Expose policy-gated organization API-key create/list/revoke routes through
api-edge and identity-worker, backed by the Task 0047 persistence seam.

PR boundary:
- contract types for public API-key list/create/revoke responses.
- identity-worker handlers for org-bound API-key admin.
- membership/policy authorization seam use for organization scope.
- api-edge forwarding.
- focused policy, identity-worker, and api-edge tests.

Key outcomes:
- Organization owner/admin can create, list, and revoke API keys.
- Returned raw API key secret is shown only once on creation.
- Stored data remains hash-only.
- Create/revoke emit identity-owned security events and org-scoped audit copies
  when organization context exists.
- Cursor pagination for list.

Non-goals:
- No API-key bearer authentication yet.
- No web-console UI.
- No project-scoped API-key narrowing unless the persistence model already
  supports a clean PR-sized path.

Verification focus:
- authorization denial cannot enumerate orgs or keys.
- no raw secret leakage in list/get/reports/logs.
- Orun and targeted tests.

Unlocks:
Machine authentication and CLI/automation work.

### Task 0049 — API Key Bearer Authentication Runtime

Objective:
Teach the public auth resolution path to accept API-key bearer credentials and
resolve them to service-principal actors without weakening user-session auth.

PR boundary:
- identity-worker API-key resolution method.
- api-edge auth resolution changes where bearer credentials are interpreted.
- contract updates only where actor shape requires it.
- focused tests for user sessions and API keys side by side.

Key outcomes:
- Revoked/expired API keys stop working.
- Resolved actor distinguishes `user` from `service_principal`.
- API-key use updates safe last-used metadata if supported.
- API-key auth does not expose raw secrets or hashes.
- Existing user bearer-token behavior remains unchanged.

Non-goals:
- No API-key UI.
- No broad role model redesign.
- No billing or usage tracking.

Verification focus:
- auth facade/session tests.
- policy context compatibility for service-principal actors.
- denial behavior for revoked, malformed, or expired keys.

Unlocks:
CLI/SDK automation, webhooks signing workflows, and service-principal oriented
operations.

### Task 0050 — Account Profile And Security Settings Foundation

Objective:
Add a narrow account profile/security settings backend surface for the signed-in
user.

PR boundary:
- identity persistence/repository additions if missing.
- identity-worker routes for get/update account profile and security settings.
- contracts and api-edge forwarding.
- focused tests.

Key outcomes:
- User can read/update safe profile fields such as display name.
- Security settings have a clear persistence shape for later MFA/passkey or
  notification preferences.
- Mutations record identity security events.
- Public response never exposes internal UUID-only fields or secrets.

Non-goals:
- No MFA/passkey implementation.
- No notification delivery.
- No web-console UI in this PR.

Verification focus:
- authenticated self-only access.
- validation and safe errors.
- no cross-context coupling.

Unlocks:
Web-console account settings and future MFA/passkey tasks.

### Task 0051 — Web Console Account Settings And API Keys UI

Objective:
Make the web console useful for account/security basics by adding profile,
security settings, and API-key management screens backed by the public API.

PR boundary:
- web-console UI and API client methods only.
- account profile/security view.
- API-key list/create/revoke view.
- focused frontend checks.

Key outcomes:
- User can update profile/security settings.
- User can create an API key and copy the one-time raw secret from the response.
- User can revoke API keys.
- UI makes scope/organization context visible for organization-bound keys.
- No internal service calls or dashboard-only flows.

Non-goals:
- No new backend behavior.
- No billing/usage/webhook UI.
- No design-system overhaul.

Verification focus:
- build/typecheck.
- interaction tests or smoke checks.
- raw secret appears only in the creation result path.

Unlocks:
Human-manageable automation credentials.

### Task 0052 — Notifications Persistence And Delivery Contract Foundation

Objective:
Create the starter notifications bounded-context foundation for auditable
product/security/invitation notification delivery without wiring every producer.

PR boundary:
- notifications package or Worker scaffold if absent.
- database migration and repository for notification preferences, templates,
  delivery records, and attempts.
- contracts for enqueue/delivery-safe payloads.
- tests.

Key outcomes:
- Notification records never store raw one-time codes or secrets.
- Delivery attempts are visible and retryable.
- Preferences can be modeled per user/org without implementation overreach.
- Orun discovers the new component/test surfaces.

Non-goals:
- No real email provider integration unless a local/stub adapter exists safely.
- No broad notification UI.
- No invitation flow rewrite yet.

Verification focus:
- migration safety.
- secret-safe payload design.
- Orun component discovery and tests.

Unlocks:
Invitation email delivery, security notifications, billing/webhook alerts.

### Task 0053 — Invitation And Security Notification Delivery

Objective:
Wire existing invitation and identity security flows to enqueue notification
records through the notifications seam.

PR boundary:
- producers only for invitation create and selected identity security events.
- notification enqueue adapter use.
- tests for payload safety and delivery records.

Key outcomes:
- Invitation creation enqueues an invitation notification without logging token
  secrets.
- Security-sensitive events can enqueue notification records where appropriate.
- Debug delivery behavior remains explicit and safe.
- Existing invitation API behavior remains compatible.

Non-goals:
- No full provider integration if Task 0052 only created a stub.
- No notification preferences UI.
- No unrelated invitation uniqueness/idempotency changes.

Verification focus:
- no raw token/code leakage.
- mutation + notification consistency or documented recovery behavior.
- focused membership/identity tests.

Unlocks:
Production-ready invitation delivery path and user security alerts.

### Task 0054 — Config, Settings, And Feature-Flag Persistence Foundation

Objective:
Add the first organization/project/environment settings and feature-flag
persistence foundation.

PR boundary:
- migrations and repository under the config/settings bounded context.
- contracts for non-secret configuration and feature-flag values.
- tests for tenant scoping and no plaintext secret storage.

Key outcomes:
- Org, project, and environment settings carry explicit scope.
- Feature flags can be stored and queried deterministically.
- Plaintext secret values are explicitly out of this foundation.
- Audit/event expectations are prepared for later mutation routes.

Non-goals:
- No public settings API yet unless a tiny read-only seam is needed for tests.
- No secret-value storage.
- No web-console UI.
- No resource/component registry work.

Verification focus:
- project/environment queries carry `orgId + projectId (+ environmentId)`.
- migration safety and tests.
- Orun changed plan.

Unlocks:
Settings APIs, config UI, feature-flag evaluation, and later secrets metadata.

## Lighter Vision Runway: Following 10 Tasks

### Task 0055 — Config And Secrets Metadata API

Expose policy-gated public APIs for org/project/environment settings and secret
metadata. Keep plaintext secret values out of responses and audit payloads.

### Task 0056 — Web Console Settings And Secrets Metadata UI

Add web-console surfaces for settings, feature flags, and secret metadata using
the public API. No internal Worker calls and no plaintext secret display.

### Task 0057 — Webhooks Persistence And Management API

Create webhook endpoint/subscription persistence and public admin routes.
Organization admins can create, list, update, rotate, and delete endpoints.

### Task 0058 — Webhook Delivery Worker And Event Fanout

Consume canonical events, select webhook subscribers, sign deliveries, track
attempts, and mark repeated failures without mutating source events.

### Task 0059 — Metering Ingestion Foundation

Add raw usage event ingestion, idempotency, and tenant/project scoping. Keep
billing out of scope until usage facts are durable and queryable.

### Task 0060 — Usage Summary And Quota Query API

Roll up metering data into organization/project summaries and expose usage or
quota reads through policy-gated public APIs.

### Task 0061 — Billing State Foundation

Add billing customers, plans, subscriptions, invoices, and entitlement
persistence with a provider-neutral adapter seam. No live payment provider
webhook yet unless explicitly scoped.

### Task 0062 — Billing Provider Webhook And Entitlement Runtime

Wire provider webhook handling into billing state and expose entitlement checks
through contracts rather than hardcoded UI behavior.

### Task 0063 — TypeScript SDK And CLI Foundation

Create a typed public API client plus CLI auth, `whoami`, organization
selection, and JSON output mode. Bind only to the public API.

### Task 0064 — Admin/Support Diagnostics Baseline

Add audited, read-only support diagnostics for users, organizations, and recent
audit/security events. No impersonation or privileged tenant-data mutation in
the first support slice.

## Roadmap Health Check

- The sequence keeps reusable SaaS foundation work separate from
  product-specific `specs-v2/**`.
- Identity/security account basics finish before API-key automation expands.
- API keys land before CLI/SDK so automation can authenticate cleanly.
- Notifications and webhooks wait until events/audit seams are stable.
- Metering lands before billing, matching `specs/schedule.md`.
- Web-console work follows public API availability instead of inventing UI-only
  contracts.
- Optional resources/runtime remain beyond this 20-task runway because core
  SaaS starter flows still have higher leverage.
