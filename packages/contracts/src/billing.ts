/**
 * Billing contract types.
 *
 * These types define the public/shared shapes for plan, billing customer,
 * subscription, invoice, and entitlement APIs. They are provider-neutral —
 * payment-provider ids may appear only as opaque references and never carry
 * API keys, webhook signing secrets, raw provider payloads, checkout/portal
 * session secrets, or plaintext secret material.
 *
 * Billing consumes normalized metering outputs (rollups). It does not own
 * raw usage facts; usage shapes live in '@saas/contracts/metering'.
 */

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export type PublicPlanStatus = "active" | "archived";
export type PublicBillingInterval = "month" | "year" | "none";

export interface PublicPlan {
  id: string;
  /** Stable machine code (e.g. 'starter', 'pro'). */
  code: string;
  name: string;
  description: string | null;
  status: PublicPlanStatus;
  billingInterval: PublicBillingInterval;
  /** Nominal display price in minor units; null when interval is 'none' or unpriced. */
  priceAmountCents: number | null;
  /** ISO-4217 lowercase currency code. */
  priceCurrency: string;
  /** Bounded safe metadata — no secrets, tokens, or credentials. */
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListPlansRequest {
  status?: PublicPlanStatus;
}

export interface ListPlansResponse {
  plans: PublicPlan[];
}

// ---------------------------------------------------------------------------
// Billing customers
// ---------------------------------------------------------------------------

export type PublicBillingCustomerStatus = "active" | "inactive";

export interface PublicBillingCustomer {
  id: string;
  orgId: string;
  displayName: string | null;
  email: string | null;
  status: PublicBillingCustomerStatus;
  /** Opaque adapter id (e.g. 'stripe'). Never an API key. */
  provider: string | null;
  /** Opaque external customer reference. Never a secret. */
  providerCustomerId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetBillingCustomerResponse {
  customer: PublicBillingCustomer;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type PublicSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export interface PublicSubscription {
  id: string;
  orgId: string;
  billingCustomerId: string;
  planId: string;
  status: PublicSubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAt: string | null;
  canceledAt: string | null;
  provider: string | null;
  providerSubscriptionId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export type PublicInvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "void"
  | "uncollectible";

export interface PublicInvoice {
  id: string;
  orgId: string;
  billingCustomerId: string;
  subscriptionId: string | null;
  number: string | null;
  status: PublicInvoiceStatus;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  provider: string | null;
  providerInvoiceId: string | null;
  /**
   * Safe display URL only. Must not embed bearer tokens, session secrets,
   * or credential material in query string or fragment.
   */
  hostedUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListInvoicesRequest {
  subscriptionId?: string;
  status?: PublicInvoiceStatus;
  limit?: number;
  cursor?: { createdAt: string; id: string } | null;
}

export interface ListInvoicesResponse {
  invoices: PublicInvoice[];
  nextCursor: { createdAt: string; id: string } | null;
}

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

export type PublicEntitlementValueType = "boolean" | "quantity" | "feature";
export type PublicEntitlementSource = "plan" | "override";

export interface PublicEntitlement {
  id: string;
  orgId: string;
  subscriptionId: string | null;
  entitlementKey: string;
  valueType: PublicEntitlementValueType;
  enabled: boolean;
  /** NULL means unlimited (when enabled). */
  limitValue: number | null;
  source: PublicEntitlementSource;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetEntitlementsRequest {
  subscriptionId?: string;
  source?: PublicEntitlementSource;
}

export interface GetEntitlementsResponse {
  entitlements: PublicEntitlement[];
}

// ---------------------------------------------------------------------------
// Billing summary
// ---------------------------------------------------------------------------

export interface GetBillingSummaryResponse {
  customer: PublicBillingCustomer | null;
  activeSubscription: PublicSubscription | null;
  plan: PublicPlan | null;
  entitlements: PublicEntitlement[];
}
