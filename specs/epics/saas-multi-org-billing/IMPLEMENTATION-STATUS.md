# saas-multi-org-billing — Implementation Status (as-built)

Status: **Not started.** This epic is design-locked for MO1 and gated on the
decisions in `risks-and-open-questions.md` for MO2+. Nothing below has shipped;
this file tracks PR-level as-built state once milestones land (kept distinct from
the design/plan docs per the spec-pack convention).

| Milestone | Status | PR(s) | Notes |
|-----------|--------|-------|-------|
| MO1 — schema + resolution seam + entitlements | 🗓️ Planned | — | Dormant, human-independent; safe to land first. |
| MO2 — purchase-gated org creation | 🗓️ Planned | — | Needs provider checkout (BP0/BP1) + product decisions. |
| MO3 — child lifecycle + entitlement fan-out | 🗓️ Planned | — | |
| MO4 — consolidated billing + usage rollup | 🗓️ Planned | — | |
| MO5 — console surfaces | 🗓️ Planned | — | |
| MO6 — migration + reversibility | 🗓️ Planned | — | |

## Verified facts about today's code (the baseline this epic builds on)

- Organization is the billing boundary; `billing.*` tables are `org_id`-scoped
  (`uq_billing_customer_org`). Confirmed in `packages/db/.../110_billing_foundation`.
- Entitlements are materialized per-org and read via `check-entitlement`;
  consumed by `projects-worker` (project/env gates) and `membership-worker`
  (member-limit gate). Confirmed in `apps/*/src/billing-client.ts`.
- Org creation is **not** entitlement-gated today (bootstrap path). Confirmed in
  `membership-worker/src/handlers/create-organization.ts`.
- No `parent_org_id` / billing-account concept exists yet (greenfield for MO1).
</content>
