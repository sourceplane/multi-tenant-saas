import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MembershipRepository } from "@saas/db/membership";
import { ORGANIZATION_ROLES } from "@saas/contracts/membership";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { authorizeViaPolicy } from "../policy-client.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { parseOrgPublicId, invitationPublicId, generateInvitationToken } from "../ids.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITATION_EXPIRY_DAYS = 7;

export interface CreateInvitationDeps {
  repo: Pick<MembershipRepository, "listRoleAssignments" | "createInvitation">;
  generateToken?: () => Promise<{ raw: string; hash: string }>;
  now?: () => Date;
}

export async function handleCreateInvitation(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgIdParam: string,
  deps?: CreateInvitationDeps,
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

  const { email, role } = body as { email?: unknown; role?: unknown };

  const fields: Record<string, string[]> = {};
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    fields.email = ["A valid email address is required"];
  }
  if (typeof role !== "string" || !(ORGANIZATION_ROLES as readonly string[]).includes(role)) {
    fields.role = [`Role must be one of: ${ORGANIZATION_ROLES.join(", ")}`];
  }
  if (Object.keys(fields).length > 0) {
    return validationError(requestId, fields);
  }

  const validEmail = (email as string).trim();
  const validRole = role as string;

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
      action: "organization.invitation.create",
      resource: { kind: "organization", id: orgUuid, orgId: orgUuid },
      orgId: orgUuid,
      roleAssignments: rolesResult.value,
      requestId,
    });

    if (!authResult.allow) {
      return errorResponse("not_found", "Organization not found", 404, requestId);
    }

    const now = deps?.now ? deps.now() : new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const tokenGen = deps?.generateToken ?? generateInvitationToken;
    const { raw: rawToken, hash: tokenHash } = await tokenGen();
    const invitationId = crypto.randomUUID();

    const createResult = await repo.createInvitation({
      id: invitationId,
      orgId: orgUuid,
      email: validEmail,
      emailLower: validEmail.toLowerCase(),
      role: validRole,
      tokenHash,
      invitedBy: actor.subjectId,
      expiresAt,
      createdAt: now,
    });

    if (!createResult.ok) {
      return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
    }

    const inv = createResult.value;
    const publicInv = {
      id: invitationPublicId(inv.id),
      email: inv.email,
      role: inv.role,
      status: deriveStatus(inv, now),
      invitedBy: inv.invitedBy,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
      revokedAt: inv.revokedAt ? inv.revokedAt.toISOString() : null,
    };

    const isDebug = env.DEBUG_DELIVERY === "true";
    const responseData: Record<string, unknown> = { invitation: publicInv };
    if (isDebug) {
      responseData.delivery = { mode: "local_debug", token: rawToken };
    }

    return successResponse(responseData, requestId, 201);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

function deriveStatus(inv: { status: string; expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null }, now: Date): string {
  if (inv.revokedAt) return "revoked";
  if (inv.acceptedAt) return "accepted";
  if (inv.status === "pending" && inv.expiresAt < now) return "expired";
  return inv.status;
}
