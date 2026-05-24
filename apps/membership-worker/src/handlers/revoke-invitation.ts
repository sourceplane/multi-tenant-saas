import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MembershipRepository } from "@saas/db/membership";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { authorizeViaPolicy } from "../policy-client.js";
import { successResponse, errorResponse } from "../http.js";
import { parseOrgPublicId, parseInvitationPublicId, invitationPublicId } from "../ids.js";

export interface RevokeInvitationDeps {
  repo: Pick<MembershipRepository, "listRoleAssignments" | "revokeInvitation">;
  now?: () => Date;
}

export async function handleRevokeInvitation(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgIdParam: string,
  invitationIdParam: string,
  deps?: RevokeInvitationDeps,
): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  if (!orgUuid) {
    return errorResponse("not_found", "Organization not found", 404, requestId);
  }

  const invUuid = parseInvitationPublicId(invitationIdParam);
  if (!invUuid) {
    return errorResponse("not_found", "Invitation not found", 404, requestId);
  }

  if (!deps && !env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  if (!env.POLICY_WORKER) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const policyWorker = env.POLICY_WORKER;
  const executor = deps ? null : createSqlExecutor(env.SOURCEPLANE_DB!);
  try {
    const repo = deps ? deps.repo : createMembershipRepository(executor!);

    const rolesResult = await repo.listRoleAssignments(orgUuid, actor.subjectId);
    if (!rolesResult.ok) {
      return errorResponse("not_found", "Organization not found", 404, requestId);
    }

    const authResult = await authorizeViaPolicy(policyWorker, {
      actor,
      action: "organization.invitation.revoke",
      resource: { kind: "organization", id: orgUuid, orgId: orgUuid },
      orgId: orgUuid,
      roleAssignments: rolesResult.value,
      requestId,
    });

    if (!authResult.allow) {
      return errorResponse("not_found", "Organization not found", 404, requestId);
    }

    const now = deps?.now ? deps.now() : new Date();
    const revokeResult = await repo.revokeInvitation(orgUuid, invUuid, now);
    if (!revokeResult.ok) {
      if (revokeResult.error.kind === "not_found") {
        return errorResponse("not_found", "Invitation not found", 404, requestId);
      }
      return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
    }

    const inv = revokeResult.value;
    const publicInv = {
      id: invitationPublicId(inv.id),
      email: inv.email,
      role: inv.role,
      status: "revoked",
      invitedBy: inv.invitedBy,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
      revokedAt: inv.revokedAt ? inv.revokedAt.toISOString() : null,
    };

    return successResponse({ invitation: publicInv }, requestId, 200);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
