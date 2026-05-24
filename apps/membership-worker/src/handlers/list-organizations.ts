import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { createOrganizationService } from "../services/organization.js";
import { successResponse, errorResponse } from "../http.js";

export async function handleListOrganizations(
  env: Env,
  requestId: string,
  actor: ActorContext,
): Promise<Response> {
  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  const executor = createSqlExecutor(env.SOURCEPLANE_DB);
  try {
    const repo = createMembershipRepository(executor);
    const service = createOrganizationService({ repo, now: () => new Date() });
    const result = await service.listOrganizations(actor);

    if (!result.ok) {
      return errorResponse(result.code, result.message, result.status, requestId);
    }

    return successResponse(result.value, requestId);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    await executor.dispose();
  }
}
