import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { GetBillingSummaryResponse } from "@saas/contracts/billing";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createBillingRepository } from "@saas/db/billing";
import { errorResponse, successResponse } from "../http.js";
import { authorizeBillingRead } from "../policy.js";
import {
  mapBillingCustomerToPublic,
  mapEntitlementToPublic,
  mapPlanToPublic,
  mapSubscriptionToPublic,
} from "../mappers.js";

export async function handleGetBillingSummary(
  _request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: string,
): Promise<Response> {
  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Service misconfigured", 503, requestId);
  }

  const auth = await authorizeBillingRead(env, actor, orgId, requestId);
  if (!auth.ok) return auth.response;

  const executor = createSqlExecutor(env.SOURCEPLANE_DB);
  const repo = createBillingRepository(executor);
  const result = await repo.getBillingSummary(orgId);
  if (!result.ok) {
    return errorResponse("internal_error", "Failed to get billing summary", 503, requestId);
  }

  const { customer, activeSubscription, plan, entitlements } = result.value;
  const body: GetBillingSummaryResponse = {
    customer: customer ? mapBillingCustomerToPublic(customer) : null,
    activeSubscription: activeSubscription ? mapSubscriptionToPublic(activeSubscription) : null,
    plan: plan ? mapPlanToPublic(plan) : null,
    entitlements: entitlements.map(mapEntitlementToPublic),
  };
  return successResponse(body, requestId);
}
