import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { authorizeViaPolicy } from "../policy-client.js";
import { successResponse, errorResponse } from "../http.js";
import { parseOrgPublicId, memberPublicId } from "../ids.js";

export async function handleListMembers(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgIdParam: string,
): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  if (!orgUuid) {
    return errorResponse("not_found", "Organization not found", 404, requestId);
  }

  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  if (!env.POLICY_WORKER) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const policyWorker = env.POLICY_WORKER;
  const executor = createSqlExecutor(env.SOURCEPLANE_DB);
  try {
    const repo = createMembershipRepository(executor);

    const rolesResult = await repo.listRoleAssignments(orgUuid, actor.subjectId);
    if (!rolesResult.ok) {
      return errorResponse("not_found", "Organization not found", 404, requestId);
    }

    const authResult = await authorizeViaPolicy(policyWorker, {
      actor,
      action: "organization.member.list",
      resource: { kind: "organization", id: orgUuid, orgId: orgUuid },
      orgId: orgUuid,
      roleAssignments: rolesResult.value,
      requestId,
    });

    if (!authResult.allow) {
      return errorResponse("not_found", "Organization not found", 404, requestId);
    }

    const membersResult = await repo.listMembers(orgUuid);
    if (!membersResult.ok) {
      return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
    }

    const members = membersResult.value;
    const enriched = [];
    for (const member of members) {
      const memberRolesResult = await repo.listRoleAssignments(orgUuid, member.subjectId);
      if (!memberRolesResult.ok) {
        return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }
      enriched.push({
        id: memberPublicId(member.id),
        subjectType: member.subjectType,
        subjectId: member.subjectId,
        status: member.status,
        joinedAt: member.createdAt.toISOString(),
        roles: memberRolesResult.value.map((ra) => ({
          role: ra.role,
          scopeKind: ra.scopeKind,
        })),
      });
    }

    return successResponse({ members: enriched }, requestId);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    await executor.dispose();
  }
}
