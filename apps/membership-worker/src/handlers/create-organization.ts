import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MembershipRepository } from "@saas/db/membership";
import type { EventsRepository } from "@saas/db/events";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { createEventsRepository } from "@saas/db/events";
import { successResponse, errorResponse, validationError } from "../http.js";
import { orgPublicId, memberPublicId } from "../ids.js";
import { asUuid } from "@saas/db/ids";
import { assignPlan, type AssignPlanResult } from "../billing-client.js";

/** Plan code assigned to every organization at bootstrap. Stable contract with
 * billing-worker's plan catalog (plan-catalog.ts DEFAULT_PLAN_CODE). */
const BOOTSTRAP_PLAN_CODE = "free";

const NAME_MIN = 1;
const NAME_MAX = 100;
const SLUG_MIN = 2;
const SLUG_MAX = 63;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

interface CreateOrgBody {
  name?: unknown;
  slug?: unknown;
}

export interface CreateOrganizationDeps {
  repo: Pick<MembershipRepository, "bootstrapOrganization">;
  eventsRepo?: Pick<EventsRepository, "appendEventWithAudit">;
  now?: () => Date;
  generateId?: () => string;
  /** Injected best-effort plan-assignment seam for unit tests. When omitted in
   * the deps path, bootstrap skips the billing call entirely. */
  assignPlan?: (orgPublicId: string) => Promise<AssignPlanResult>;
}

/**
 * Best-effort: grant the free plan so the new org gets real entitlement rows
 * (Task 0128). NEVER fails the bootstrap — a transient billing failure falls
 * back to the check-entitlement free-tier safety net until a later assignment
 * succeeds.
 */
async function tryAssignFreePlan(
  env: Env,
  orgUuid: string,
  actor: ActorContext,
  requestId: string,
): Promise<void> {
  const binding = env.BILLING_WORKER;
  if (!binding) return;
  try {
    await assignPlan(binding as Fetcher, orgPublicId(orgUuid), BOOTSTRAP_PLAN_CODE, requestId, {
      id: actor.subjectId,
      type: actor.subjectType,
    });
  } catch {
    /* best-effort */
  }
}

function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
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

export async function handleCreateOrganization(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  deps?: CreateOrganizationDeps,
): Promise<Response> {
  let body: CreateOrgBody;
  try {
    body = (await request.json()) as CreateOrgBody;
  } catch {
    return errorResponse("bad_request", "Invalid JSON body", 400, requestId);
  }

  const fields: Record<string, string[]> = {};

  if (typeof body.name !== "string" || body.name.length < NAME_MIN || body.name.length > NAME_MAX) {
    fields.name = [`Must be between ${NAME_MIN} and ${NAME_MAX} characters`];
  }

  let slug: string;
  if (body.slug !== undefined) {
    if (typeof body.slug !== "string" || body.slug.length < SLUG_MIN || body.slug.length > SLUG_MAX) {
      fields.slug = [`Must be between ${SLUG_MIN} and ${SLUG_MAX} characters`];
    } else if (!SLUG_RE.test(body.slug.toLowerCase())) {
      fields.slug = ["Must contain only lowercase letters, numbers, and hyphens, and start/end with alphanumeric"];
    }
    slug = body.slug as string;
  } else if (typeof body.name === "string") {
    slug = generateSlugFromName(body.name);
    if (slug.length < SLUG_MIN) {
      slug = `org-${slug || crypto.randomUUID().slice(0, 8)}`;
    }
  } else {
    slug = "";
  }

  if (Object.keys(fields).length > 0) {
    return validationError(requestId, fields);
  }

  if (!deps && !env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  const now = deps?.now ? deps.now() : new Date();
  const genId = deps?.generateId ?? (() => randomHex(16));
  const orgId = asUuid(crypto.randomUUID());
  const memberId = crypto.randomUUID();
  const roleAssignmentId = crypto.randomUUID();
  const orgName = body.name as string;
  const slugLower = slug.toLowerCase();

  const bootstrapInput = {
    org: { id: orgId, name: orgName, slug, slugLower, createdAt: now },
    member: { id: memberId, orgId, subjectId: actor.subjectId, subjectType: actor.subjectType, createdAt: now },
    roleAssignment: { id: roleAssignmentId, orgId, subjectId: actor.subjectId, subjectType: actor.subjectType, role: "owner", scopeKind: "organization", scopeRef: null, createdAt: now },
  };

  const executor = deps ? null : createSqlExecutor(env.SOURCEPLANE_DB!);
  try {
    if (executor && "transaction" in executor) {
      const result = await executor.transaction(async (txExec) => {
        const txRepo = createMembershipRepository(txExec);
        const txEventsRepo = createEventsRepository(txExec);

        const bootstrapResult = await txRepo.bootstrapOrganization(bootstrapInput);
        if (!bootstrapResult.ok) {
          return { bootstrapResult };
        }

        const orgEventResult = await txEventsRepo.appendEventWithAudit({
          event: {
            id: genId(),
            type: "organization.created",
            version: 1,
            source: "membership-worker",
            occurredAt: now,
            actorType: actor.subjectType,
            actorId: actor.subjectId,
            orgId,
            subjectKind: "organization",
            subjectId: orgId,
            subjectName: orgName,
            requestId,
            payload: { orgId: orgPublicId(orgId), name: orgName, slug },
          },
          audit: {
            id: genId(),
            category: "membership",
            description: `Organization ${orgPublicId(orgId)} created`,
          },
        });

        if (!orgEventResult.ok) {
          throw new Error("event_append_failed");
        }

        const memberEventResult = await txEventsRepo.appendEventWithAudit({
          event: {
            id: genId(),
            type: "membership.added",
            version: 1,
            source: "membership-worker",
            occurredAt: now,
            actorType: actor.subjectType,
            actorId: actor.subjectId,
            orgId,
            subjectKind: "member",
            subjectId: memberId,
            requestId,
            payload: { orgId: orgPublicId(orgId), memberId: memberPublicId(memberId), subjectType: actor.subjectType, subjectId: actor.subjectId, role: "owner" },
          },
          audit: {
            id: genId(),
            category: "membership",
            description: `Member ${memberPublicId(memberId)} added as owner`,
          },
        });

        if (!memberEventResult.ok) {
          throw new Error("event_append_failed");
        }

        return { bootstrapResult };
      });

      if (!result.bootstrapResult.ok) {
        if (result.bootstrapResult.error.kind === "conflict") {
          return errorResponse("conflict", "Organization already exists", 409, requestId);
        }
        return errorResponse("internal_error", "Failed to create organization", 500, requestId);
      }

      const { org, roleAssignment } = result.bootstrapResult.value;
      await tryAssignFreePlan(env, org.id, actor, requestId);
      return successResponse(
        {
          organization: { id: orgPublicId(org.id), name: org.name, slug: org.slug, createdAt: org.createdAt.toISOString() },
          membership: { role: roleAssignment.role, joinedAt: result.bootstrapResult.value.member.createdAt.toISOString() },
        },
        requestId,
        201,
      );
    }

    // Non-transactional path (unit tests with injected deps)
    const repo = deps!.repo;
    const bootstrapResult = await repo.bootstrapOrganization(bootstrapInput);
    if (!bootstrapResult.ok) {
      if (bootstrapResult.error.kind === "conflict") {
        return errorResponse("conflict", "Organization already exists", 409, requestId);
      }
      return errorResponse("internal_error", "Failed to create organization", 500, requestId);
    }

    if (deps?.eventsRepo) {
      const orgEventResult = await deps.eventsRepo.appendEventWithAudit({
        event: {
          id: genId(),
          type: "organization.created",
          version: 1,
          source: "membership-worker",
          occurredAt: now,
          actorType: actor.subjectType,
          actorId: actor.subjectId,
          orgId,
          subjectKind: "organization",
          subjectId: orgId,
          subjectName: orgName,
          requestId,
          payload: { orgId: orgPublicId(orgId), name: orgName, slug },
        },
        audit: {
          id: genId(),
          category: "membership",
          description: `Organization ${orgPublicId(orgId)} created`,
        },
      });

      if (!orgEventResult.ok) {
        return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }

      const memberEventResult = await deps.eventsRepo.appendEventWithAudit({
        event: {
          id: genId(),
          type: "membership.added",
          version: 1,
          source: "membership-worker",
          occurredAt: now,
          actorType: actor.subjectType,
          actorId: actor.subjectId,
          orgId,
          subjectKind: "member",
          subjectId: memberId,
          requestId,
          payload: { orgId: orgPublicId(orgId), memberId: memberPublicId(memberId), subjectType: actor.subjectType, subjectId: actor.subjectId, role: "owner" },
        },
        audit: {
          id: genId(),
          category: "membership",
          description: `Member ${memberPublicId(memberId)} added as owner`,
        },
      });

      if (!memberEventResult.ok) {
        return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }
    }

    const { org, member, roleAssignment } = bootstrapResult.value;
    if (deps?.assignPlan) {
      try {
        await deps.assignPlan(orgPublicId(org.id));
      } catch {
        /* best-effort */
      }
    }
    return successResponse(
      {
        organization: { id: orgPublicId(org.id), name: org.name, slug: org.slug, createdAt: org.createdAt.toISOString() },
        membership: { role: roleAssignment.role, joinedAt: member.createdAt.toISOString() },
      },
      requestId,
      201,
    );
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
