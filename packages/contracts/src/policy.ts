import type { OrganizationRole, ProjectRole, TenancyRole, RoleScopeKind } from "./tenancy.js";

export type SubjectType = "user" | "service_principal" | "workflow" | "system";

export interface PolicySubject {
  type: SubjectType;
  id: string;
}

export interface PolicyResource {
  kind: string;
  id?: string;
  orgId: string;
  projectId?: string;
  environmentId?: string;
}

export interface MembershipFact {
  kind: "role_assignment";
  role: TenancyRole;
  scope: {
    kind: RoleScopeKind;
    orgId: string;
    projectId?: string;
  };
}

export type PolicyMembershipFact = MembershipFact | Record<string, unknown>;

export interface PolicyContext {
  memberships: PolicyMembershipFact[];
  attributes?: Record<string, unknown>;
}

export interface AuthorizationRequest {
  subject: PolicySubject;
  action: string;
  resource: PolicyResource;
  context: PolicyContext;
}

export interface AuthorizationResponse {
  allow: boolean;
  reason: string;
  policyVersion: number;
  derivedScope: {
    orgId: string;
    projectId?: string;
  };
}

export interface EffectivePermissionsRequest {
  subject: PolicySubject;
  resource: PolicyResource;
  context: PolicyContext;
}

export interface EffectivePermission {
  action: string;
  allow: boolean;
  reason: string;
}

export interface EffectivePermissionsResponse {
  permissions: EffectivePermission[];
  policyVersion: number;
  derivedScope: {
    orgId: string;
    projectId?: string;
  };
}

export interface RoleAssignmentValidationRequest {
  role: string;
  scope: {
    kind: string;
    orgId: string;
    projectId?: string;
  };
}

export interface RoleAssignmentValidationResponse {
  valid: boolean;
  reason: string;
  policyVersion: number;
}

export const ORGANIZATION_ACTIONS = [
  "organization.read",
  "organization.settings.update",
  "organization.invitation.create",
  "organization.invitation.list",
  "organization.invitation.revoke",
  "organization.member.list",
  "organization.member.remove",
  "organization.member.update_role",
  "project.create",
  "project.read",
  "project.update",
  "project.delete",
  "environment.read",
  "environment.update",
  "billing.read",
  "billing.manage",
] as const;

export type OrganizationAction = (typeof ORGANIZATION_ACTIONS)[number];

export const POLICY_VERSION = 1;

export interface AuthorizationContextRequest {
  subject: PolicySubject;
  orgId: string;
}

export interface AuthorizationContextResponse {
  memberships: MembershipFact[];
}

export type { OrganizationRole, ProjectRole, TenancyRole, RoleScopeKind };
