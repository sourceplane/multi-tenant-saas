import type { Env } from "../env.js";
import type { MembershipRepository } from "@saas/db/membership";
import type { EventsRepository } from "@saas/db/events";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { createEventsRepository } from "@saas/db/events";
import { successResponse, errorResponse, validationError } from "../http.js";
import { parseOrgPublicId, invitationPublicId, memberPublicId, orgPublicId, hashToken } from "../ids.js";

export interface AcceptActorContext {
  subjectId: string;
  subjectType: string;
  email: string;
}

const TOKEN_RE = /^[0-9a-f]{64}$/;

export interface AcceptInvitationDeps {
  repo: Pick<MembershipRepository, "acceptInvitation">;
  eventsRepo?: Pick<EventsRepository, "appendEventWithAudit">;
  hashToken?: (raw: string) => Promise<string>;
  now?: () => Date;
  generateId?: () => string;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i]!.toString(16).padStart(2, "0");
  }
  return hex;
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
  const genId = deps?.generateId ?? (() => randomHex(16));

  const executor = deps ? null : createSqlExecutor(env.SOURCEPLANE_DB!);
  try {
    if (executor && "transaction" in executor) {
      const txResult = await executor.transaction(async (txExec) => {
        const txRepo = createMembershipRepository(txExec);
        const txEventsRepo = createEventsRepository(txExec);

        const result = await txRepo.acceptInvitation({
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
          return { result };
        }

        const { invitation: inv, member } = result.value;

        const eventResult = await txEventsRepo.appendEventWithAudit({
          event: {
            id: genId(),
            type: "invite.accepted",
            version: 1,
            source: "membership-worker",
            occurredAt: now,
            actorType: actor.subjectType,
            actorId: actor.subjectId,
            orgId: orgPublicId(orgUuid),
            subjectKind: "invitation",
            subjectId: invitationPublicId(inv.id),
            requestId,
            payload: { role: inv.role, memberId: memberPublicId(member.id) },
          },
          audit: {
            id: genId(),
            category: "membership",
            description: `Invitation ${invitationPublicId(inv.id)} accepted`,
          },
        });

        if (!eventResult.ok) {
          throw new Error("event_append_failed");
        }

        return { result };
      });

      if (!txResult.result.ok) {
        const err = txResult.result.error;
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

      const { invitation: inv, member, roleAssignment } = txResult.result.value;

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
    }

    // Non-transactional path (unit tests with injected deps)
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

    if (deps?.eventsRepo) {
      const eventResult = await deps.eventsRepo.appendEventWithAudit({
        event: {
          id: genId(),
          type: "invite.accepted",
          version: 1,
          source: "membership-worker",
          occurredAt: now,
          actorType: actor.subjectType,
          actorId: actor.subjectId,
          orgId: orgPublicId(orgUuid),
          subjectKind: "invitation",
          subjectId: invitationPublicId(inv.id),
          requestId,
          payload: { role: inv.role, memberId: memberPublicId(member.id) },
        },
        audit: {
          id: genId(),
          category: "membership",
          description: `Invitation ${invitationPublicId(inv.id)} accepted`,
        },
      });

      if (!eventResult.ok) {
        return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }
    }

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
