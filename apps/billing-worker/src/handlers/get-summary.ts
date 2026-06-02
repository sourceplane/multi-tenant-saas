import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { GetBillingSummaryResponse } from "@saas/contracts/billing";
import type { BillingRepository } from "@saas/db/billing";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createBillingRepository } from "@saas/db/billing";
import { errorResponse, successResponse, withTimings } from "../http.js";
import { authorizeBillingRead } from "../policy.js";
import { createTimings } from "@saas/contracts/timing";
import {
  mapBillingCustomerToPublic,
  mapEntitlementToPublic,
  mapPlanToPublic,
  mapSubscriptionToPublic,
} from "../mappers.js";

export interface HandleGetBillingSummaryDeps {
  repo?: Pick<BillingRepository, "getBillingSummary">;
}

export async function handleGetBillingSummary(
  _request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: string,
  deps?: HandleGetBillingSummaryDeps,
): Promise<Response> {
  if (!deps?.repo && !env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Service misconfigured", 503, requestId);
  }

  const timings = createTimings();
  const endTotal = timings.start("total");
  const executor = deps?.repo ? null : createSqlExecutor(env.SOURCEPLANE_DB!);
  const repo = deps?.repo ?? createBillingRepository(executor!);
  try {
    // PERF4 (task 0133): authorization (membership context + policy) and the
    // billing read are independent — the read does not depend on the authz result
    // for WHAT to read, only WHETHER to return it. Run them concurrently, then
    // apply the decision and discard the read on deny (deny-by-default).
    const [auth, result] = await Promise.all([
      timings.measure("authz", () => authorizeBillingRead(env, actor, orgId, requestId)),
      timings.measure("db", () => repo.getBillingSummary(orgId)),
    ]);

    if (!auth.ok) {
      endTotal();
      return withTimings(auth.response, requestId, "billing.summary", timings);
    }
    if (!result.ok) {
      endTotal();
      return withTimings(errorResponse("internal_error", "Failed to get billing summary", 503, requestId), requestId, "billing.summary", timings);
    }

    const { customer, activeSubscription, plan, entitlements } = result.value;
    const body: GetBillingSummaryResponse = {
      customer: customer ? mapBillingCustomerToPublic(customer) : null,
      activeSubscription: activeSubscription ? mapSubscriptionToPublic(activeSubscription) : null,
      plan: plan ? mapPlanToPublic(plan) : null,
      entitlements: entitlements.map(mapEntitlementToPublic),
    };
    endTotal();
    return withTimings(successResponse(body, requestId), requestId, "billing.summary", timings);
  } catch {
    endTotal();
    return withTimings(errorResponse("internal_error", "Failed to get billing summary", 503, requestId), requestId, "billing.summary", timings);
  } finally {
    if (executor) await executor.dispose();
  }
}
