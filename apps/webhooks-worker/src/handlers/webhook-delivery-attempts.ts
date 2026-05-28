import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import { createWebhookRepository } from "@saas/db/webhooks";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { fetchAuthorizationContext } from "../membership-client.js";
import { authorizeViaPolicy } from "../policy-client.js";
import { errorResponse, successResponse, listResponse, validationError } from "../http.js";
import { toPublicDeliveryAttempt } from "../mappers.js";
import { parsePageParams, encodeCursor } from "../pagination.js";
import type { PolicyResource } from "@saas/contracts/policy";

async function authorizeWebhookRead(
  env: Env,
  actor: ActorContext,
  orgId: string,
  requestId: string,
): Promise<Response | null> {
  const contextResult = await fetchAuthorizationContext(
    env.MEMBERSHIP_WORKER!,
    actor.subjectId,
    actor.subjectType,
    orgId,
    requestId,
  );
  if (!contextResult.ok) {
    return errorResponse("not_found", "Not found", 404, requestId);
  }

  const resource: PolicyResource = { kind: "organization", orgId };

  const policyResult = await authorizeViaPolicy(
    env.POLICY_WORKER!,
    actor.subjectId,
    actor.subjectType,
    "organization.webhook.read",
    resource,
    contextResult.memberships,
    requestId,
  );
  if (!policyResult.allow) {
    return errorResponse("not_found", "Not found", 404, requestId);
  }

  return null;
}

// ── Get ──────────────────────────────────────────────────────

export async function handleGetDeliveryAttempt(
  _request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: string,
  attemptId: string,
): Promise<Response> {
  const denied = await authorizeWebhookRead(env, actor, orgId, requestId);
  if (denied) return denied;

  const executor = createSqlExecutor(env.SOURCEPLANE_DB!);
  try {
    const repo = createWebhookRepository(executor);
    const result = await repo.getDeliveryAttempt(orgId, attemptId);
    if (!result.ok) {
      return errorResponse("not_found", "Delivery attempt not found", 404, requestId);
    }

    return successResponse({ deliveryAttempt: toPublicDeliveryAttempt(result.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    await executor.dispose();
  }
}

// ── List ─────────────────────────────────────────────────────

export async function handleListDeliveryAttempts(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: string,
  endpointId: string,
): Promise<Response> {
  const denied = await authorizeWebhookRead(env, actor, orgId, requestId);
  if (denied) return denied;

  const pageResult = parsePageParams(new URL(request.url));
  if (!pageResult.ok) {
    return validationError(requestId, { [pageResult.field]: [pageResult.reason] });
  }

  const { limit, cursor } = pageResult.value;
  const dbCursor = cursor ? { createdAt: cursor.createdAt, id: cursor.id } : null;

  const executor = createSqlExecutor(env.SOURCEPLANE_DB!);
  try {
    const repo = createWebhookRepository(executor);
    const result = await repo.listDeliveryAttempts(orgId, endpointId, { limit, cursor: dbCursor });
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }

    const deliveryAttempts = result.value.items.map(toPublicDeliveryAttempt);
    const nextCursor = result.value.nextCursor
      ? encodeCursor(result.value.nextCursor.createdAt, result.value.nextCursor.id)
      : null;

    return listResponse({ deliveryAttempts }, requestId, nextCursor);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    await executor.dispose();
  }
}
