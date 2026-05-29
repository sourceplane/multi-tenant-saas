import type { Env } from "./env.js";
import type { ActorContext } from "./router.js";
import type { PolicyResource } from "@saas/contracts/policy";
import { errorResponse } from "./http.js";
import { fetchAuthorizationContext } from "./membership-client.js";
import { authorizeViaPolicy } from "./policy-client.js";

/**
 * Authorize a billing-read action against an organization. Fails closed: any
 * negative or error condition collapses to a generic 404 to avoid leaking org
 * existence to unauthorized callers.
 */
export async function authorizeBillingRead(
  env: Env,
  actor: ActorContext,
  orgId: string,
  requestId: string,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (!env.MEMBERSHIP_WORKER || !env.POLICY_WORKER) {
    return { ok: false, response: errorResponse("internal_error", "Service misconfigured", 503, requestId) };
  }

  const contextResult = await fetchAuthorizationContext(
    env.MEMBERSHIP_WORKER,
    actor.subjectId,
    actor.subjectType,
    orgId,
    requestId,
  );
  if (!contextResult.ok) {
    return { ok: false, response: errorResponse("not_found", "Not found", 404, requestId) };
  }

  const resource: PolicyResource = { kind: "organization", orgId };
  const authResult = await authorizeViaPolicy(
    env.POLICY_WORKER,
    actor.subjectId,
    actor.subjectType,
    "billing.read",
    resource,
    contextResult.memberships,
    requestId,
  );

  if (!authResult.allow) {
    return { ok: false, response: errorResponse("not_found", "Not found", 404, requestId) };
  }
  return { ok: true };
}
