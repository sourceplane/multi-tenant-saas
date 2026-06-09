import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { CreateCheckoutResponse } from "@saas/contracts/billing";
import { errorResponse, successResponse, validationError } from "../http.js";
import { authorizeBillingManage } from "../policy.js";
import { isKnownPlanCode } from "../plan-catalog.js";
import { orgPublicId } from "../ids.js";
import { resolveBillingOrgHex } from "../billing-scope.js";
import { buildBillingProviderRegistry } from "../billing-provider/polar.js";
import { parsePolarConfig } from "../billing-provider/polar-mapping.js";
import type { BillingProviderRegistry } from "../billing-provider/registry.js";

/**
 * POST /v1/organizations/:orgId/billing/checkout (BP2).
 *
 * Authorize `billing.manage`, resolve the plan to the active provider's product
 * (`POLAR_PRODUCT_MAP`), and return a URL to redirect to:
 *   - first purchase (no active subscription) → a hosted **checkout** URL;
 *   - existing subscriber (plan change) → the customer **portal** URL, since
 *     providers reject a second subscription via checkout ("You already have an
 *     active subscription"). `mode` distinguishes the two.
 *
 * Binds to the account's billing org (a child resolves to its parent — MO4) and
 * only accepts purchasable plans (free/enterprise are rejected). Creates no
 * local state; the plan is applied by the verified webhook (BP2 intake).
 */

export interface CreateCheckoutDeps {
  registry?: BillingProviderRegistry;
  productMap?: Record<string, string>;
  authorize?: typeof authorizeBillingManage;
}

export async function handleCreateCheckout(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: string,
  deps: CreateCheckoutDeps = {},
): Promise<Response> {
  const authorize = deps.authorize ?? authorizeBillingManage;
  const auth = await authorize(env, actor, orgId, requestId);
  if (!auth.ok) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return validationError(requestId, "request body is not valid JSON");
  }
  const planCode = (payload as { planCode?: unknown } | null)?.planCode;
  if (typeof planCode !== "string" || !isKnownPlanCode(planCode)) {
    return validationError(requestId, "planCode is required and must be a known plan");
  }

  const productMap = deps.productMap ?? parsePolarConfig(env)?.productMap ?? {};
  const productId = productMap[planCode];
  if (!productId) {
    return errorResponse(
      "plan_not_purchasable",
      "This plan cannot be purchased via self-serve checkout",
      400,
      requestId,
    );
  }

  const registry = deps.registry ?? buildBillingProviderRegistry(env);
  const resolved = registry.resolve(env);
  if (!resolved.ok) {
    return errorResponse("provider_unavailable", "Billing provider not configured", 503, requestId);
  }

  // Target the account's billing org (a child's purchase/change is the parent's
  // single subscription — MO4). Standalone orgs resolve to themselves.
  const billingOrgPublicId = orgPublicId(await resolveBillingOrgHex(env, orgId, requestId));

  try {
    // If the account already has an active subscription, a plan change can't be
    // a second checkout (the provider rejects it) — route to the customer portal.
    if (await resolved.provider.hasActiveSubscription(billingOrgPublicId)) {
      const portal = await resolved.provider.createPortalSession({ orgId: billingOrgPublicId });
      const body: CreateCheckoutResponse = { checkoutUrl: portal.portalUrl, mode: "portal" };
      return successResponse(body, requestId);
    }

    const result = await resolved.provider.createCheckout({
      orgId: billingOrgPublicId,
      planCode,
      productId,
      successUrl: env.POLAR_SUCCESS_URL ?? "",
    });
    const body: CreateCheckoutResponse = { checkoutUrl: result.checkoutUrl, mode: "checkout" };
    return successResponse(body, requestId);
  } catch {
    return errorResponse("provider_error", "Failed to start plan change", 502, requestId);
  }
}
