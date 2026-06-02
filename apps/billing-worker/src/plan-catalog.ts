import type { EntitlementValueType } from "@saas/db/billing";

/**
 * Provider-neutral plan catalog (Task 0128 / B11).
 *
 * Pure data + helpers (no DB, no fetch) so the catalog and the per-plan
 * entitlement set can be unit-tested in isolation. This is the single source of
 * truth for which entitlements a plan grants. The billing-worker materializes
 * these into `billing.entitlements` rows when a plan is assigned to an org
 * (see `handlers/assign-plan.ts`), so policy/product surfaces read real
 * per-org rows rather than the PR-#209 hard-coded fallback.
 *
 * Plans are global catalog rows (`billing.plans`); they are ensured idempotently
 * on first assignment (`createPlan` is `ON CONFLICT (code) DO NOTHING`), so no
 * data migration is required for the lifecycle to work. `priceAmountCents` is a
 * nominal display price only — a payment provider remains the source of truth
 * once B6 wires Stripe behind the adapter seam.
 */

export interface PlanEntitlementDef {
  entitlementKey: string;
  valueType: EntitlementValueType;
  enabled: boolean;
  /** quantity limit; null = unlimited (when enabled). boolean/feature use null. */
  limitValue: number | null;
}

export interface PlanDefinition {
  /** Stable plan row id (billing.plans.id) — exposed verbatim as the public id. */
  id: string;
  /** Stable machine code (billing.plans.code) — the assignment key. */
  code: string;
  name: string;
  description: string;
  billingInterval: "month" | "year" | "none";
  priceAmountCents: number;
  priceCurrency: string;
  entitlements: PlanEntitlementDef[];
}

/** The plan code assigned to every organization at bootstrap. */
export const DEFAULT_PLAN_CODE = "free";

/**
 * The catalog. Keep the free tier's limit values >= the PR-#209 stopgap so
 * retiring that fallback never regresses a bootstrapped org's limits.
 */
export const PLAN_CATALOG: PlanDefinition[] = [
  {
    id: "plan_free",
    code: "free",
    name: "Free",
    description: "Starter tier for new organizations.",
    billingInterval: "month",
    priceAmountCents: 0,
    priceCurrency: "usd",
    entitlements: [
      { entitlementKey: "limit.projects", valueType: "quantity", enabled: true, limitValue: 3 },
      { entitlementKey: "limit.environments", valueType: "quantity", enabled: true, limitValue: 3 },
      { entitlementKey: "limit.members", valueType: "quantity", enabled: true, limitValue: 5 },
      { entitlementKey: "feature.custom_domains", valueType: "boolean", enabled: false, limitValue: null },
    ],
  },
  {
    id: "plan_pro",
    code: "pro",
    name: "Pro",
    description: "Higher limits and premium features for growing teams.",
    billingInterval: "month",
    priceAmountCents: 2000,
    priceCurrency: "usd",
    entitlements: [
      { entitlementKey: "limit.projects", valueType: "quantity", enabled: true, limitValue: 50 },
      { entitlementKey: "limit.environments", valueType: "quantity", enabled: true, limitValue: 50 },
      { entitlementKey: "limit.members", valueType: "quantity", enabled: true, limitValue: 100 },
      { entitlementKey: "feature.custom_domains", valueType: "boolean", enabled: true, limitValue: null },
    ],
  },
];

/** Look up a plan definition by its machine code. */
export function getPlanDefinition(code: string): PlanDefinition | null {
  return PLAN_CATALOG.find((p) => p.code === code) ?? null;
}

/** Whether a code names a known catalog plan. */
export function isKnownPlanCode(code: string): boolean {
  return PLAN_CATALOG.some((p) => p.code === code);
}
