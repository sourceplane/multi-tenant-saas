import {
  selectUpgradePlans,
  formatPlanPrice,
  hasManageableSubscription,
} from "@web-console-next/components/billing/plan-actions";
import type { PublicPlan } from "@saas/contracts/billing";

function plan(over: Partial<PublicPlan>): PublicPlan {
  return {
    id: over.code ? `plan_${over.code}` : "plan_x",
    code: "x",
    name: "X",
    description: null,
    status: "active",
    billingInterval: "month",
    priceAmountCents: 0,
    priceCurrency: "usd",
    metadata: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

const CATALOG: PublicPlan[] = [
  plan({ code: "free", name: "Free", priceAmountCents: 0 }),
  plan({ code: "business", name: "Business", priceAmountCents: 9900 }),
  plan({ code: "pro", name: "Pro", priceAmountCents: 2000 }),
  plan({ code: "enterprise", name: "Enterprise", billingInterval: "none", priceAmountCents: 0 }),
  plan({ code: "archived_pro", name: "Old", priceAmountCents: 1500, status: "archived" }),
];

describe("selectUpgradePlans", () => {
  it("returns only active, recurring, priced plans (excludes free/enterprise/archived), sorted by price", () => {
    const out = selectUpgradePlans(CATALOG, "free");
    expect(out.map((p) => p.code)).toEqual(["pro", "business"]);
  });

  it("excludes the current plan", () => {
    const out = selectUpgradePlans(CATALOG, "pro");
    expect(out.map((p) => p.code)).toEqual(["business"]);
  });

  it("returns nothing to upgrade to when on the top tier", () => {
    expect(selectUpgradePlans(CATALOG, "business").map((p) => p.code)).toEqual([]);
  });
});

describe("formatPlanPrice", () => {
  it("formats whole-dollar monthly USD", () => {
    expect(formatPlanPrice(plan({ priceAmountCents: 2000 }))).toBe("$20/mo");
  });
  it("formats cents and yearly", () => {
    expect(formatPlanPrice(plan({ priceAmountCents: 9999, billingInterval: "year" }))).toBe("$99.99/yr");
  });
  it("prefixes non-usd currency codes", () => {
    expect(formatPlanPrice(plan({ priceAmountCents: 1000, priceCurrency: "eur" }))).toBe("EUR 10/mo");
  });
  it("is empty for an unpriced plan", () => {
    expect(formatPlanPrice(plan({ priceAmountCents: null }))).toBe("");
  });
});

describe("hasManageableSubscription", () => {
  it("is true for a paid plan, false for free/none", () => {
    expect(hasManageableSubscription("pro")).toBe(true);
    expect(hasManageableSubscription("business")).toBe(true);
    expect(hasManageableSubscription("free")).toBe(false);
    expect(hasManageableSubscription(null)).toBe(false);
  });
});
