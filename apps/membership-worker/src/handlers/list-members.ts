import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MembershipRepository, PageQueryParams } from "@saas/db/membership";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { authorizeViaPolicy } from "../policy-client.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { parseOrgPublicId, memberPublicId } from "../ids.js";
import { parsePageParams, encodeCursor } from "../pagination.js";

export interface ListMembersDeps {
  repo: Pick<
    MembershipRepository,
    "listRoleAssignments" | "listRoleAssignmentsForSubjects" | "listMembersPaged"
  >;
}

export async function handleListMembers(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgIdParam: string,
  url?: URL,
  deps?: ListMembersDeps,
): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  if (!orgUuid) {
    return errorResponse("not_found", "Organization not found", 404, requestId);
  }

  let pageParams: PageQueryParams = { limit: 50, cursor: null };
  if (url) {
    const pageResult = parsePageParams(url);
    if (!pageResult.ok) {
      return validationError(requestId, { [pageResult.field]: [pageResult.reason] });
    }
    const { limit, cursor } = pageResult.value;
    pageParams = { limit, cursor: cursor ? { createdAt: cursor.createdAt, id: cursor.id } : null };
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
      action: "organization.member.list",
      resource: { kind: "organization", id: orgUuid, orgId: orgUuid },
      orgId: orgUuid,
      roleAssignments: rolesResult.value,
      requestId,
    });

    if (!authResult.allow) {
      return errorResponse("not_found", "Organization not found", 404, requestId);
    }

    const membersResult = await repo.listMembersPaged(orgUuid, pageParams);
    if (!membersResult.ok) {
      return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
    }

    const { items, nextCursor } = membersResult.value;

    // PERF3 (task 0132): one batched role-assignment query for the whole page
    // instead of one query per member (N+1). Falls back to the per-subject path
    // when the batched repo method is unavailable (e.g. older fakes).
    const rolesBySubject = new Map<string, { role: string; scopeKind: string }[]>();
    if (repo.listRoleAssignmentsForSubjects) {
      const pageRolesResult = await repo.listRoleAssignmentsForSubjects(
        orgUuid,
        items.map((m) => m.subjectId),
      );
      if (!pageRolesResult.ok) {
        return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }
      for (const [subjectId, ras] of pageRolesResult.value) {
        rolesBySubject.set(subjectId, ras.map((ra) => ({ role: ra.role, scopeKind: ra.scopeKind })));
      }
    } else {
      for (const member of items) {
        const r = await repo.listRoleAssignments(orgUuid, member.subjectId);
        if (!r.ok) {
          return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
        }
        rolesBySubject.set(
          member.subjectId,
          r.value.map((ra) => ({ role: ra.role, scopeKind: ra.scopeKind })),
        );
      }
    }

    const enriched = items.map((member) => ({
      id: memberPublicId(member.id),
      subjectType: member.subjectType,
      subjectId: member.subjectId,
      status: member.status,
      joinedAt: member.createdAt.toISOString(),
      roles: rolesBySubject.get(member.subjectId) ?? [],
    }));

    const cursorToken = nextCursor ? encodeCursor(nextCursor.createdAt, nextCursor.id) : null;
    return successResponse({ members: enriched }, requestId, 200, cursorToken);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
