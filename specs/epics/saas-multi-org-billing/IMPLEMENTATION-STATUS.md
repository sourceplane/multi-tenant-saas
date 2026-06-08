# saas-multi-org-billing — Implementation Status (as-built)

Status: **In progress.** MO1 (schema seam + flat-tier catalog/entitlements) and
the entire `billing-provider-abstraction` sub-epic through **BP2** have shipped
to `main` — **Polar billing is live end-to-end** (webhook intake → entitlements,
console upgrade/manage). To exercise the live loop, the Polar webhook endpoint
must be registered in the dashboard (per env) and a `POLAR_SUCCESS_URL` set
(optional). Next: **MO3** (child lifecycle + entitlement fan-out) — so an
additional org created via the MO2 gate inherits the parent's plan and rolls
billing up, instead of being created standalone on Free.
This file tracks PR-level as-built state, kept distinct from the design/plan docs.

## Epic milestones (MO)

| Milestone | Status | PR(s) | Notes |
|-----------|--------|-------|-------|
| MO1 — schema + resolution seam + entitlements | ✅ Shipped | #253, #257 | #253: `170_membership_org_parent` (nullable `parent_org_id` + sparse index), `Organization.parentOrgId`, `effectiveBillingOrgId`. #257: the D5 flat-tier catalog (Free/Pro/Business/Enterprise) + `feature.multi_org` / `limit.organizations` entitlements. Dormant — applied cleanly to dev/stage/prod; no behavior change (Free's `limit.environments` kept at 3 per the no-regress rule). |
| MO2 — purchase-gated org creation | ✅ Shipped | #265, #266 | Additional-org gate on `feature.multi_org` + `limit.organizations` (bootstrap exempt) → `412`; console paywall with a Business-checkout "Upgrade" CTA. **Note:** the additional org is still created standalone on Free — parent linkage + entitlement fan-out is MO3. |
| MO3 — child lifecycle + entitlement fan-out | 🗓️ Planned | — | |
| MO4 — consolidated billing + usage rollup | 🗓️ Planned | — | |
| MO5 — console surfaces | 🗓️ Planned | — | |
| MO6 — migration + reversibility | 🗓️ Planned | — | |

## Sub-epic: billing-provider-abstraction (BP)

| Milestone | Status | PR(s) | Notes |
|-----------|--------|-------|-------|
| BP0 — provider interface + registry | ✅ Shipped | #254 | `BillingProvider` interface + `NormalizedEvent` union + config-driven registry (`BILLING_PROVIDER`, default polar) that fails closed. Dormant — empty adapter map until BP1. |
| BP1 — Polar adapter | ✅ Shipped | #260 | `@polar-sh/sdk` checkout/portal/customer + Standard-Webhooks `validateEvent` (fails closed) → `NormalizedEvent`. Bundles in workerd (156 KiB gzip). |
| BP2 — edge + contracts + SDK + console | ✅ Shipped | #261, #262, #263 | Public webhook intake (api-edge → billing-worker → assign-plan/downgrade), checkout/portal endpoints + contracts + SDK, and the console upgrade/manage-billing UI. Polar live end-to-end. |
| BP3 — Stripe adapter + switch policy | 🗓️ Planned | — | |
| BP4 — hardening (reconcile, observability, dunning) | 🗓️ Planned | — | |

## Verified facts about today's code (the baseline this epic builds on)

- Organization is the billing boundary; `billing.*` tables are `org_id`-scoped
  (`uq_billing_customer_org`). Confirmed in `packages/db/.../110_billing_foundation`.
- Entitlements are materialized per-org and read via `check-entitlement`;
  consumed by `projects-worker` (project/env gates) and `membership-worker`
  (member-limit gate). Confirmed in `apps/*/src/billing-client.ts`.
- Org creation is **not** entitlement-gated today (bootstrap path). Confirmed in
  `membership-worker/src/handlers/create-organization.ts`.
- `parent_org_id` now exists (MO1) but is unread until MO2+; every org is
  standalone (`NULL`), so `effectiveBillingOrgId` collapses to `org.id`.
