import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { GetBillingCustomerResponse } from "@saas/contracts/billing";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createBillingRepository } from "@saas/db/billing";
import { errorResponse, successResponse } from "../http.js";
import { authorizeBillingRead } from "../policy.js";
import { mapBillingCustomerToPublic } from "../mappers.js";

export async function handleGetBillingCustomer(
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
  const result = await repo.getBillingCustomer(orgId);
  if (!result.ok) {
    if (result.error.kind === "not_found") {
      return errorResponse("not_found", "Not found", 404, requestId);
    }
    return errorResponse("internal_error", "Failed to get billing customer", 503, requestId);
  }

  const body: GetBillingCustomerResponse = { customer: mapBillingCustomerToPublic(result.value) };
  return successResponse(body, requestId);
}
