import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { Scope } from "@saas/db/config";
import { createConfigRepository } from "@saas/db/config";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { fetchAuthorizationContext } from "../membership-client.js";
import { authorizeViaPolicy } from "../policy-client.js";
import { errorResponse, listResponse, validationError } from "../http.js";
import { toPublicSetting } from "../mappers.js";
import { parsePageParams, encodeCursor } from "../pagination.js";
import type { PolicyResource } from "@saas/contracts/policy";

export async function handleListSettings(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  scope: Scope,
): Promise<Response> {
  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  if (!env.MEMBERSHIP_WORKER) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  if (!env.POLICY_WORKER) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const url = new URL(request.url);
  const pageResult = parsePageParams(url);
  if (!pageResult.ok) {
    return validationError(requestId, { [pageResult.field]: [pageResult.reason] });
  }

  const policyAction = scope.kind === "organization" ? "organization.config.read" : "project.config.read";
  const resource: PolicyResource = { kind: scope.kind === "organization" ? "organization" : "project", orgId: scope.orgId };
  if ("projectId" in scope) {
    resource.projectId = scope.projectId;
  }

  const { limit, cursor } = pageResult.value;
  const dbCursor = cursor ? { createdAt: cursor.createdAt, id: cursor.id } : null;

  const executor = createSqlExecutor(env.SOURCEPLANE_DB);
  try {
    const repo = createConfigRepository(executor);
    // PERF12: the authorization-context fetch (membership) and the read are
    // independent — run them concurrently, evaluate policy from the fetched
    // facts, and discard the speculatively read rows on deny (deny-by-default).
    const [contextResult, result] = await Promise.all([
      fetchAuthorizationContext(
        env.MEMBERSHIP_WORKER,
        actor.subjectId,
        actor.subjectType,
        scope.orgId,
        requestId,
      ),
      repo.listSettings(scope, { limit, cursor: dbCursor }),
    ]);
    if (!contextResult.ok) {
      return errorResponse("not_found", "Not found", 404, requestId);
    }

    const policyResult = await authorizeViaPolicy(
      env.POLICY_WORKER,
      actor.subjectId,
      actor.subjectType,
      policyAction,
      resource,
      contextResult.memberships,
      requestId,
    );
    if (!policyResult.allow) {
      return errorResponse("not_found", "Not found", 404, requestId);
    }

    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }

    const settings = result.value.items.map(toPublicSetting);
    const nextCursor = result.value.nextCursor
      ? encodeCursor(result.value.nextCursor.createdAt, result.value.nextCursor.id)
      : null;

    return listResponse({ settings }, requestId, nextCursor);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    await executor.dispose();
  }
}
