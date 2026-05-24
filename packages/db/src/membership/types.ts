export type { SqlExecutor, SqlExecutorResult, SqlRow } from "../hyperdrive/executor.js";

export type MembershipRepositoryError =
  | { kind: "not_found" }
  | { kind: "conflict"; entity: string }
  | { kind: "expired" }
  | { kind: "revoked" }
  | { kind: "already_accepted" }
  | { kind: "removed" }
  | { kind: "internal"; message: string };

export type MembershipResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: MembershipRepositoryError };

export interface Organization {
  id: string;
  name: string;
  slug: string;
  slugLower: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  orgId: string;
  subjectId: string;
  subjectType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationInvitation {
  id: string;
  orgId: string;
  email: string;
  emailLower: string;
  role: string;
  status: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface RoleAssignment {
  id: string;
  orgId: string;
  subjectId: string;
  subjectType: string;
  role: string;
  scopeKind: string;
  scopeRef: string | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface CreateOrganizationInput {
  id: string;
  name: string;
  slug: string;
  slugLower: string;
  createdAt: Date;
}

export interface CreateOrganizationMemberInput {
  id: string;
  orgId: string;
  subjectId: string;
  subjectType: string;
  createdAt: Date;
}

export interface CreateInvitationInput {
  id: string;
  orgId: string;
  email: string;
  emailLower: string;
  role: string;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateRoleAssignmentInput {
  id: string;
  orgId: string;
  subjectId: string;
  subjectType: string;
  role: string;
  scopeKind: string;
  scopeRef?: string | null;
  createdAt: Date;
}

export interface BootstrapOrganizationInput {
  org: CreateOrganizationInput;
  member: CreateOrganizationMemberInput;
  roleAssignment: CreateRoleAssignmentInput;
}

export interface CursorPosition {
  createdAt: string;
  id: string;
}

export interface PageQueryParams {
  limit: number;
  cursor: CursorPosition | null;
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: CursorPosition | null;
}

export interface MembershipRepository {
  createOrganization(input: CreateOrganizationInput): Promise<MembershipResult<Organization>>;
  getOrganizationById(id: string): Promise<MembershipResult<Organization>>;
  getOrganizationBySlug(slugLower: string): Promise<MembershipResult<Organization>>;
  listOrganizationsForSubject(subjectId: string): Promise<MembershipResult<Organization[]>>;
  listOrganizationsForSubjectPaged(subjectId: string, params: PageQueryParams): Promise<MembershipResult<PagedResult<Organization>>>;

  bootstrapOrganization(input: BootstrapOrganizationInput): Promise<MembershipResult<{ org: Organization; member: OrganizationMember; roleAssignment: RoleAssignment }>>;

  createMember(input: CreateOrganizationMemberInput): Promise<MembershipResult<OrganizationMember>>;
  getMemberById(orgId: string, memberId: string): Promise<MembershipResult<OrganizationMember>>;
  listMembers(orgId: string): Promise<MembershipResult<OrganizationMember[]>>;
  listMembersPaged(orgId: string, params: PageQueryParams): Promise<MembershipResult<PagedResult<OrganizationMember>>>;
  removeMember(orgId: string, memberId: string, updatedAt: Date): Promise<MembershipResult<OrganizationMember>>;

  createInvitation(input: CreateInvitationInput): Promise<MembershipResult<OrganizationInvitation>>;
  getInvitationById(orgId: string, invitationId: string): Promise<MembershipResult<OrganizationInvitation>>;
  getInvitationByTokenHash(tokenHash: string): Promise<MembershipResult<OrganizationInvitation>>;
  listInvitations(orgId: string): Promise<MembershipResult<OrganizationInvitation[]>>;
  revokeInvitation(orgId: string, invitationId: string, revokedAt: Date): Promise<MembershipResult<OrganizationInvitation>>;
  acceptInvitation(tokenHash: string, memberId: string, memberInput: CreateOrganizationMemberInput, acceptedAt: Date): Promise<MembershipResult<{ invitation: OrganizationInvitation; member: OrganizationMember }>>;

  createRoleAssignment(input: CreateRoleAssignmentInput): Promise<MembershipResult<RoleAssignment>>;
  listRoleAssignments(orgId: string, subjectId: string): Promise<MembershipResult<RoleAssignment[]>>;
  revokeRoleAssignment(orgId: string, assignmentId: string, revokedAt: Date): Promise<MembershipResult<RoleAssignment>>;
}
