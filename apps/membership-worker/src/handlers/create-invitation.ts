import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MembershipRepository } from "@saas/db/membership";
import type { EventsRepository } from "@saas/db/events";
import { ORGANIZATION_ROLES } from "@saas/contracts/membership";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { createEventsRepository } from "@saas/db/events";
import { authorizeViaPolicy } from "../policy-client.js";
import {
  checkBillingEntitlement,
  decideMembersLimit,
} from "../billing-client.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { parseOrgPublicId, orgPublicId, invitationPublicId, generateInvitationToken } from "../ids.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITATION_EXPIRY_DAYS = 7;
const MEMBERS_LIMIT_ENTITLEMENT_KEY = "limit.members";

export interface CreateInvitationDeps {
  repo: Pick<MembershipRepository, "listRoleAssignments" | "createInvitation" | "countBillableMembers">;
  eventsRepo?: Pick<EventsRepository, "appendEventWithAudit">;
  generateToken?: () => Promise<{ raw: string; hash: string }>;
  now?: () => Date;
  generateId?: () => string;
  /**
   * Injectable billing entitlement check for tests. Defaults to a real call
   * against env.BILLING_WORKER.
   */
  checkEntitlement?: typeof checkBillingEntitlement;
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

  if (!deps && !env.BILLING_WORKER) {
    // Production code path: missing service binding fails closed before any
    // policy / repo work runs. Tests that inject `deps` provide their own
    // billing seam (or opt out entirely) and skip this check.
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

    // ── Billing entitlement gate (Task 0080) ─────────────────────
    // Invitation creation is gated on `limit.members` after policy allow and
    // before any invitation / event / audit row is written. The billable
    // count is `active members + pending invitations` so that pending
    // invitations occupy seats until they accept, expire, or are revoked.
    // Fails closed on any service / misconfiguration error.
    //
    // Tests that inject `deps` without an explicit `checkEntitlement` opt
    // out of the gate entirely — preserving the original seam for handler
    // tests that predate the gate. Production code path always passes
    // through `checkBillingEntitlement` against `env.BILLING_WORKER`, which
    // is asserted by the dedicated billing-gate test suite below.
    const skipBillingGate = deps !== undefined && !deps.checkEntitlement;
    if (!skipBillingGate) {
      const entitlementFn = deps?.checkEntitlement ?? checkBillingEntitlement;
      const billingBinding = env.BILLING_WORKER;
      if (!billingBinding && !deps?.checkEntitlement) {
        return errorResponse("internal_error", "Service unavailable", 503, requestId);
      }
      const entitlementResult = await entitlementFn(
        billingBinding as Fetcher,
        orgPublicId(orgUuid),
        MEMBERS_LIMIT_ENTITLEMENT_KEY,
        requestId,
      );
      if (entitlementResult.kind === "service_error") {
        return errorResponse("internal_error", "Service unavailable", 503, requestId);
      }

      const nowForGate = deps?.now ? deps.now() : new Date();
      const countResult = await repo.countBillableMembers(orgUuid, nowForGate);
      if (!countResult.ok) {
        return errorResponse("internal_error", "Service unavailable", 503, requestId);
      }

      const gate = decideMembersLimit(entitlementResult.decision, countResult.value);
      if (gate.kind === "service_error") {
        return errorResponse("internal_error", "Service unavailable", 503, requestId);
      }
      if (gate.kind === "deny") {
        return errorResponse(
          "precondition_failed",
          gate.message,
          412,
          requestId,
          { reason: gate.reason },
        );
      }
    }

    const now = deps?.now ? deps.now() : new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const tokenGen = deps?.generateToken ?? generateInvitationToken;
    const { raw: rawToken, hash: tokenHash } = await tokenGen();
    const invitationId = crypto.randomUUID();
    const genId = deps?.generateId ?? (() => randomHex(16));

    if (executor && "transaction" in executor) {
      const result = await executor.transaction(async (txExec) => {
        const txRepo = createMembershipRepository(txExec);
        const txEventsRepo = createEventsRepository(txExec);

        const createResult = await txRepo.createInvitation({
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
          return { createResult };
        }

        const eventResult = await txEventsRepo.appendEventWithAudit({
          event: {
            id: genId(),
            type: "invite.created",
            version: 1,
            source: "membership-worker",
            occurredAt: now,
            actorType: actor.subjectType,
            actorId: actor.subjectId,
            orgId: orgUuid,
            subjectKind: "invitation",
            subjectId: invitationId,
            requestId,
            payload: { invitationId: invitationPublicId(invitationId), role: validRole, expiresAt: expiresAt.toISOString() },
          },
          audit: {
            id: genId(),
            category: "membership",
            description: `Invitation ${invitationPublicId(invitationId)} created`,
          },
        });

        if (!eventResult.ok) {
          throw new Error("event_append_failed");
        }

        return { createResult };
      });

      if (!result.createResult.ok) {
        return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }

      const inv = result.createResult.value;
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
    }

    // Non-transactional path (unit tests with injected deps)
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

    if (deps?.eventsRepo) {
      const eventResult = await deps.eventsRepo.appendEventWithAudit({
        event: {
          id: genId(),
          type: "invite.created",
          version: 1,
          source: "membership-worker",
          occurredAt: now,
          actorType: actor.subjectType,
          actorId: actor.subjectId,
          orgId: orgUuid,
          subjectKind: "invitation",
          subjectId: invitationId,
          requestId,
          payload: { invitationId: invitationPublicId(invitationId), role: validRole, expiresAt: expiresAt.toISOString() },
        },
        audit: {
          id: genId(),
          category: "membership",
          description: `Invitation ${invitationPublicId(invitationId)} created`,
        },
      });

      if (!eventResult.ok) {
        return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }
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
