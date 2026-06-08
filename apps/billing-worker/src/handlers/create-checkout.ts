import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { CreateCheckoutResponse } from "@saas/contracts/billing";
import { errorResponse, successResponse, validationError } from "../http.js";
import { authorizeBillingManage } from "../policy.js";
import { isKnownPlanCode } from "../plan-catalog.js";
import { orgPublicId } from "../ids.js";
import { buildBillingProviderRegistry } from "../billing-provider/polar.js";
import { parsePolarConfig } from "../billing-provider/polar-mapping.js";
import type { BillingProviderRegistry } from "../billing-provider/registry.js";

/**
 * POST /v1/organizations/:orgId/billing/checkout (BP2).
 *
 * Authorize `billing.manage`, resolve the plan code to the active provider's
 * product (`POLAR_PRODUCT_MAP`), and return a hosted checkout URL. The org's
 * public id is set as the provider customer's external id so the resulting
 * subscription webhook maps back to this org. Only purchasable plans (those
 * with a configured product) are accepted — free/enterprise are rejected.
 *
 * This creates no local state; the plan is applied by the verified webhook
 * (BP2 intake) after payment completes.
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

  try {
    const result = await resolved.provider.createCheckout({
      orgId: orgPublicId(orgId),
      planCode,
      productId,
      successUrl: env.POLAR_SUCCESS_URL ?? "",
    });
    const body: CreateCheckoutResponse = { checkoutUrl: result.checkoutUrl };
    return successResponse(body, requestId);
  } catch {
    return errorResponse("provider_error", "Failed to create checkout session", 502, requestId);
  }
}
