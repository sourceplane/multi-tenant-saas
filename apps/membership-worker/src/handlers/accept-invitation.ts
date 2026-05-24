import type { Env } from "../env.js";
import type { MembershipRepository } from "@saas/db/membership";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { successResponse, errorResponse, validationError } from "../http.js";
import { parseOrgPublicId, invitationPublicId, memberPublicId, hashToken } from "../ids.js";

export interface AcceptActorContext {
  subjectId: string;
  subjectType: string;
  email: string;
}

const TOKEN_RE = /^[0-9a-f]{64}$/;

export interface AcceptInvitationDeps {
  repo: Pick<MembershipRepository, "acceptInvitation">;
  hashToken?: (raw: string) => Promise<string>;
  now?: () => Date;
}

export async function handleAcceptInvitation(
  request: Request,
  env: Env,
  requestId: string,
  actor: AcceptActorContext,
  orgIdParam: string,
  deps?: AcceptInvitationDeps,
): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  if (!orgUuid) {
    return errorResponse("not_found", "Organization not found", 404, requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("bad_request", "Invalid JSON body", 400, requestId);
  }

  if (!body || typeof body !== "object") {
    return validationError(requestId, { body: ["Request body must be a JSON object"] });
  }

  const { token } = body as { token?: unknown };

  const fields: Record<string, string[]> = {};
  if (typeof token !== "string" || !TOKEN_RE.test(token)) {
    fields.token = ["A valid invitation token is required"];
  }
  if (Object.keys(fields).length > 0) {
    return validationError(requestId, fields);
  }

  const validToken = token as string;

  if (!deps && !env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  const hashFn = deps?.hashToken ?? hashToken;
  const tokenHash = await hashFn(validToken);

  const now = deps?.now ? deps.now() : new Date();
  const memberId = crypto.randomUUID();
  const roleAssignmentId = crypto.randomUUID();

  const executor = deps ? null : createSqlExecutor(env.SOURCEPLANE_DB!);
  try {
    const repo = deps ? deps.repo : createMembershipRepository(executor!);

    const result = await repo.acceptInvitation({
      tokenHash,
      orgId: orgUuid,
      emailLower: actor.email.toLowerCase(),
      memberId,
      roleAssignmentId,
      subjectId: actor.subjectId,
      subjectType: actor.subjectType,
      acceptedAt: now,
    });

    if (!result.ok) {
      const err = result.error;
      switch (err.kind) {
        case "not_found":
        case "expired":
        case "revoked":
        case "already_accepted":
          return errorResponse("not_found", "Invitation not found", 404, requestId);
        case "conflict":
          return errorResponse("conflict", "Membership already exists", 409, requestId);
        default:
          return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }
    }

    const { invitation: inv, member, roleAssignment } = result.value;

    const publicInv = {
      id: invitationPublicId(inv.id),
      email: inv.email,
      role: inv.role,
      status: "accepted" as const,
      invitedBy: inv.invitedBy,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
      revokedAt: inv.revokedAt ? inv.revokedAt.toISOString() : null,
    };

    return successResponse(
      {
        invitation: publicInv,
        membership: {
          id: memberPublicId(member.id),
          role: roleAssignment.role,
          joinedAt: member.createdAt.toISOString(),
          status: member.status,
        },
      },
      requestId,
      200,
    );
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
