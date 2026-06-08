# saas-multi-org-billing — Implementation Status (as-built)

Status: **In progress.** All human-independent work has shipped to `main` — MO1
(schema seam + the full flat-tier catalog/entitlements) and sub-epic BP0 (the
provider interface), all dormant. Paid multi-org (MO2+) and the Polar adapter
(BP1) are gated on Polar credentials (see `risks-and-open-questions.md`). This
file tracks PR-level as-built state, kept distinct from the design/plan docs.

## Epic milestones (MO)

| Milestone | Status | PR(s) | Notes |
|-----------|--------|-------|-------|
| MO1 — schema + resolution seam + entitlements | ✅ Shipped | #253, #257 | #253: `170_membership_org_parent` (nullable `parent_org_id` + sparse index), `Organization.parentOrgId`, `effectiveBillingOrgId`. #257: the D5 flat-tier catalog (Free/Pro/Business/Enterprise) + `feature.multi_org` / `limit.organizations` entitlements. Dormant — applied cleanly to dev/stage/prod; no behavior change (Free's `limit.environments` kept at 3 per the no-regress rule). |
| MO2 — purchase-gated org creation | 🗓️ Planned | — | Needs provider checkout (BP1) + Polar creds. |
| MO3 — child lifecycle + entitlement fan-out | 🗓️ Planned | — | |
| MO4 — consolidated billing + usage rollup | 🗓️ Planned | — | |
| MO5 — console surfaces | 🗓️ Planned | — | |
| MO6 — migration + reversibility | 🗓️ Planned | — | |

## Sub-epic: billing-provider-abstraction (BP)

| Milestone | Status | PR(s) | Notes |
|-----------|--------|-------|-------|
| BP0 — provider interface + registry | ✅ Shipped | #254 | `BillingProvider` interface + `NormalizedEvent` union + config-driven registry (`BILLING_PROVIDER`, default polar) that fails closed. Dormant — empty adapter map until BP1. |
| BP1 — Polar adapter | ⛔ Blocked (creds) | — | `@polar-sh/sdk` checkout/portal/webhook-verify. Needs Polar sandbox `POLAR_ACCESS_TOKEN` + `POLAR_WEBHOOK_SECRET` + products. |
| BP2 — edge + contracts + SDK + console | 🗓️ Planned | — | Depends on BP1. |
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
