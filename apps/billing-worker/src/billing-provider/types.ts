/**
 * Provider-neutral billing-provider adapter seam.
 *
 * Epic: saas-multi-org-billing / sub-epic billing-provider-abstraction (BP0).
 *
 * One interface every payment provider implements; the active provider is
 * selected per-environment by config (`BILLING_PROVIDER`, default "polar").
 * Polar (BP1) is the first implementation; Stripe (BP3) proves the seam is real
 * (switch by config, not rewrite).
 *
 * Invariants honored by every adapter:
 *  - Entitlement DECISIONS are never read live from a provider — providers
 *    mutate our billing state via webhooks; product gates read
 *    `billing.entitlements`. This seam is for purchase/manage/sync only.
 *  - No provider SDK types, secrets, raw payloads, or tokenized URLs cross this
 *    seam into `@saas/contracts`, the DB, `metadata`, or logs. Only the
 *    normalized, safe shapes below leave an adapter.
 */

export type BillingProviderId = "polar" | "stripe";

/** A normalized, provider-neutral customer reference. Never a secret. */
export interface ProviderCustomerRef {
  /** Opaque provider customer id. */
  providerCustomerId: string;
  /** The external id we set on the provider (our billing-parent org id). */
  externalId: string | null;
}

export interface CreateCheckoutInput {
  /** Public org id of the billing parent (becomes the provider customerExternalId). */
  orgId: string;
  /** Stable plan code being purchased. */
  planCode: string;
  /** Opaque provider product id, resolved from the per-env plan↔product map. */
  productId: string;
  /** Where the provider returns the buyer after a successful checkout. */
  successUrl: string;
}

export interface CreateCheckoutResult {
  /** Hosted checkout URL the console redirects to. Safe display URL only. */
  checkoutUrl: string;
}

export interface CreatePortalSessionInput {
  /** Public org id of the billing parent. */
  orgId: string;
  /** Known provider customer id when already mirrored; else resolve by externalId. */
  providerCustomerId?: string | null;
  /** Optional return URL back into the console. */
  returnUrl?: string;
}

export interface CreatePortalSessionResult {
  /** Hosted customer-portal URL. Safe display URL only. */
  portalUrl: string;
}

/** Provider-specific subset of webhook headers needed for signature verification. */
export type ProviderWebhookHeaders = Record<string, string>;

// ── Normalized events ────────────────────────────────────────
// The small internal union every provider's `verifyWebhook` maps onto. These
// map 1:1 onto the events billing-worker already emits + the assign-plan path,
// so webhook intake stays provider-agnostic.

interface NormalizedEventBase {
  /** Opaque provider event id, used for idempotent intake (dedupe). */
  providerEventId: string;
  provider: BillingProviderId;
}

export interface NormalizedSubscriptionEvent extends NormalizedEventBase {
  type:
    | "subscription.activated"
    | "subscription.updated"
    | "subscription.canceled";
  /** Our billing-parent org id (from customerExternalId / metadata). */
  orgId: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  /** Opaque provider product id → resolved to a plan code by the mapper. */
  productId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface NormalizedInvoiceEvent extends NormalizedEventBase {
  type: "invoice.recorded" | "invoice.paid";
  orgId: string | null;
  providerCustomerId: string | null;
  providerInvoiceId: string | null;
  providerSubscriptionId: string | null;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  /** Safe display URL only; never embeds bearer tokens or session secrets. */
  hostedUrl: string | null;
}

export interface NormalizedPaymentFailedEvent extends NormalizedEventBase {
  type: "payment.failed";
  orgId: string | null;
  providerCustomerId: string | null;
  providerInvoiceId: string | null;
}

/** Events we do not act on yet are normalized to `ignored` (still verified). */
export interface NormalizedIgnoredEvent extends NormalizedEventBase {
  type: "ignored";
  /** The raw provider event type, for observability only (no payload). */
  providerType: string;
}

export type NormalizedEvent =
  | NormalizedSubscriptionEvent
  | NormalizedInvoiceEvent
  | NormalizedPaymentFailedEvent
  | NormalizedIgnoredEvent;

/** Result of verifying + normalizing a raw provider webhook. */
export type VerifyWebhookResult =
  | { ok: true; event: NormalizedEvent }
  | { ok: false; reason: "invalid_signature" | "malformed" };

// ── The adapter interface ────────────────────────────────────

export interface BillingProvider {
  readonly id: BillingProviderId;
  /** Create a hosted checkout session for a purchase. */
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  /** Create a hosted customer-portal session to manage an existing subscription. */
  createPortalSession(
    input: CreatePortalSessionInput,
  ): Promise<CreatePortalSessionResult>;
  /** Look up the provider customer mirrored to our org id, or null. */
  getCustomerByExternalId(externalId: string): Promise<ProviderCustomerRef | null>;
  /**
   * Verify a webhook signature over the RAW body bytes and normalize it.
   * Implementations MUST fail closed (`invalid_signature`) on any verification
   * failure — never trust an unverified payload.
   */
  verifyWebhook(
    rawBody: string,
    headers: ProviderWebhookHeaders,
  ): Promise<VerifyWebhookResult>;
}
