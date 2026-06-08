import type { PublicPlan } from "@saas/contracts/billing";

/**
 * Pure (no-React) helpers for the billing actions UI, kept separate so the
 * selection/formatting logic is unit-testable without a DOM.
 */

/**
 * The plans a user can upgrade to via self-serve checkout: active, recurring,
 * and priced strictly above the current plan. Excludes Free (price 0),
 * Enterprise (billingInterval "none" — contact sales), and any plan at or below
 * the current price (downgrades go through the customer portal, not checkout).
 * Sorted by price asc.
 */
export function selectUpgradePlans(
  plans: PublicPlan[],
  activePlanCode: string | null,
): PublicPlan[] {
  const current = activePlanCode ? plans.find((p) => p.code === activePlanCode) : undefined;
  const currentPrice = current?.priceAmountCents ?? 0;
  return plans
    .filter(
      (p) =>
        p.status === "active" &&
        p.billingInterval !== "none" &&
        (p.priceAmountCents ?? 0) > 0 &&
        p.code !== activePlanCode &&
        (p.priceAmountCents ?? 0) > currentPrice,
    )
    .sort((a, b) => (a.priceAmountCents ?? 0) - (b.priceAmountCents ?? 0));
}

/** Short human price, e.g. "$20/mo". Empty string when unpriced. */
export function formatPlanPrice(plan: PublicPlan): string {
  if (plan.priceAmountCents == null) return "";
  const amount = plan.priceAmountCents / 100;
  const num = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const symbol = plan.priceCurrency.toLowerCase() === "usd" ? "$" : `${plan.priceCurrency.toUpperCase()} `;
  const per = plan.billingInterval === "year" ? "/yr" : plan.billingInterval === "month" ? "/mo" : "";
  return `${symbol}${num}${per}`;
}

/** Whether the org has a paid subscription worth surfacing a "Manage billing" portal for. */
export function hasManageableSubscription(activePlanCode: string | null): boolean {
  return activePlanCode !== null && activePlanCode !== "free";
}
