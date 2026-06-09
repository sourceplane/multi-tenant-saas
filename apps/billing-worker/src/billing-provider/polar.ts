import { Polar } from "@polar-sh/sdk";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import type { Env } from "../env.js";
import {
  type BillingProviderRegistry,
  createBillingProviderRegistry,
} from "./registry.js";
import {
  type PolarConfig,
  mapPolarEventToNormalized,
  parsePolarConfig,
} from "./polar-mapping.js";
import type {
  BillingProvider,
  BillingProviderId,
  CreateCheckoutInput,
  CreateCheckoutResult,
  CreatePortalSessionInput,
  CreatePortalSessionResult,
  ProviderCustomerRef,
  ProviderWebhookHeaders,
  VerifyWebhookResult,
} from "./types.js";

/** Treat a Polar/Speakeasy "not found" (404) as a null lookup; rethrow the rest. */
function isNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { statusCode?: unknown; name?: unknown };
  return e.statusCode === 404 || (typeof e.name === "string" && /not.?found/i.test(e.name));
}

/**
 * The Polar implementation of the `BillingProvider` seam (BP1). Polar is the
 * Merchant of Record. Checkout/portal/customer go through the official SDK;
 * webhooks are verified with the SDK's Standard-Webhooks `validateEvent` (which
 * fails closed) and then mapped to the provider-neutral `NormalizedEvent`.
 */
export function createPolarProvider(config: PolarConfig): BillingProvider {
  const client = new Polar({ accessToken: config.accessToken, server: config.server });

  return {
    id: "polar",

    async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
      const checkout = await client.checkouts.create({
        products: [input.productId],
        // Bind the checkout to our billing-parent org id so the resulting
        // customer/subscription carries it back as `customer.externalId`.
        externalCustomerId: input.orgId,
        successUrl: input.successUrl || config.successUrl || undefined,
        // When the console embeds the checkout, Polar requires the embedding
        // origin so the hosted page may be iframed there (in-app checkout).
        ...(input.embedOrigin ? { embedOrigin: input.embedOrigin } : {}),
        metadata: { plan_code: input.planCode, org_id: input.orgId },
      });
      return { checkoutUrl: checkout.url };
    },

    async createPortalSession(
      input: CreatePortalSessionInput,
    ): Promise<CreatePortalSessionResult> {
      const session = await client.customerSessions.create({
        externalCustomerId: input.orgId,
        ...(input.returnUrl ? { returnUrl: input.returnUrl } : {}),
      });
      return { portalUrl: session.customerPortalUrl };
    },

    async getCustomerByExternalId(externalId: string): Promise<ProviderCustomerRef | null> {
      try {
        const customer = await client.customers.getExternal({ externalId });
        return { providerCustomerId: customer.id, externalId: customer.externalId ?? null };
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },

    async hasActiveSubscription(externalId: string): Promise<boolean> {
      try {
        const res = await client.subscriptions.list({ externalCustomerId: externalId, active: true, limit: 1 });
        return res.result.items.length > 0;
      } catch {
        // Fail toward checkout: if we can't tell, don't block a first purchase.
        // (A genuinely-subscribed customer would then re-hit the provider's own
        // "already subscribed" guard — no worse than before this check existed.)
        return false;
      }
    },

    async verifyWebhook(
      rawBody: string,
      headers: ProviderWebhookHeaders,
    ): Promise<VerifyWebhookResult> {
      const eventId = headers["webhook-id"] ?? headers["svix-id"] ?? "";
      let parsed: { type: string; data: Record<string, unknown> };
      try {
        parsed = validateEvent(rawBody, headers, config.webhookSecret) as unknown as {
          type: string;
          data: Record<string, unknown>;
        };
      } catch (err) {
        // Signature failure → reject. Anything else (unparseable / schema
        // mismatch) → malformed. Never trust an unverified payload.
        if (err instanceof WebhookVerificationError) {
          return { ok: false, reason: "invalid_signature" };
        }
        return { ok: false, reason: "malformed" };
      }
      return { ok: true, event: mapPolarEventToNormalized(eventId, parsed) };
    },
  };
}

/**
 * Build the worker's provider registry from env. Registers the Polar adapter
 * only when Polar is fully configured (access token + webhook secret present);
 * otherwise the registry is empty and resolution fails closed (`not_configured`).
 */
export function buildBillingProviderRegistry(env: Env): BillingProviderRegistry {
  const adapters: Partial<Record<BillingProviderId, BillingProvider>> = {};
  const polarConfig = parsePolarConfig(env);
  if (polarConfig) adapters.polar = createPolarProvider(polarConfig);
  return createBillingProviderRegistry(adapters);
}
