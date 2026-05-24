import type { AuthorizationRequest, AuthorizationResponse, MembershipFact, PolicySubject, TenancyRole, RoleScopeKind } from "@saas/contracts/policy";
import type { RoleAssignment } from "@saas/db/membership";
import type { ActorContext } from "./router.js";

export interface AuthorizeParams {
  actor: ActorContext;
  action: string;
  resource: { kind: string; id?: string; orgId: string; projectId?: string };
  orgId: string;
  roleAssignments: RoleAssignment[];
  requestId: string;
}

export interface AuthorizeResult {
  allow: boolean;
}

function mapRoleAssignments(orgId: string, assignments: RoleAssignment[]): MembershipFact[] {
  return assignments.map((ra) => {
    const scope: MembershipFact["scope"] =
      ra.scopeKind === "project" && ra.scopeRef
        ? { kind: "project" as RoleScopeKind, orgId, projectId: ra.scopeRef }
        : { kind: "organization" as RoleScopeKind, orgId };
    return { kind: "role_assignment" as const, role: ra.role as TenancyRole, scope };
  });
}

export async function authorizeViaPolicy(
  policyWorker: Fetcher,
  params: AuthorizeParams,
): Promise<AuthorizeResult> {
  const subject: PolicySubject = {
    type: params.actor.subjectType as PolicySubject["type"],
    id: params.actor.subjectId,
  };

  const body: AuthorizationRequest = {
    subject,
    action: params.action,
    resource: params.resource,
    context: {
      memberships: mapRoleAssignments(params.orgId, params.roleAssignments),
    },
  };

  let response: Response;
  try {
    response = await policyWorker.fetch("http://policy-worker/v1/internal/policy/authorize", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": params.requestId,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { allow: false };
  }

  if (!response.ok) {
    return { allow: false };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return { allow: false };
  }

  if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
    return { allow: false };
  }

  const data = (parsed as { data: unknown }).data;
  if (!data || typeof data !== "object" || !("allow" in data) || typeof (data as AuthorizationResponse).allow !== "boolean") {
    return { allow: false };
  }

  return { allow: (data as AuthorizationResponse).allow };
}

export { mapRoleAssignments };
