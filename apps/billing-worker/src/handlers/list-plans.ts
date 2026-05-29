import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { ListPlansResponse, PublicPlanStatus } from "@saas/contracts/billing";
import type { PlanStatus } from "@saas/db/billing";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createBillingRepository } from "@saas/db/billing";
import { errorResponse, successResponse, validationError } from "../http.js";
import { authorizeBillingRead } from "../policy.js";
import { mapPlanToPublic } from "../mappers.js";

const VALID_STATUS: ReadonlySet<PublicPlanStatus> = new Set(["active", "archived"]);

export async function handleListPlans(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: string,
): Promise<Response> {
  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Service misconfigured", 503, requestId);
  }

  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status");
  let status: PlanStatus | undefined;
  if (rawStatus) {
    if (!VALID_STATUS.has(rawStatus as PublicPlanStatus)) {
      return validationError(requestId, "status must be 'active' or 'archived'");
    }
    status = rawStatus as PlanStatus;
  }

  const auth = await authorizeBillingRead(env, actor, orgId, requestId);
  if (!auth.ok) return auth.response;

  const executor = createSqlExecutor(env.SOURCEPLANE_DB);
  const repo = createBillingRepository(executor);
  const result = await repo.listPlans(status ? { status } : {});
  if (!result.ok) {
    return errorResponse("internal_error", "Failed to list plans", 503, requestId);
  }

  const body: ListPlansResponse = { plans: result.value.map(mapPlanToPublic) };
  return successResponse(body, requestId);
}
