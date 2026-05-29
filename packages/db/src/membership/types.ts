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

export interface AcceptInvitationInput {
  tokenHash: string;
  orgId: string;
  emailLower: string;
  memberId: string;
  roleAssignmentId: string;
  subjectId: string;
  subjectType: string;
  acceptedAt: Date;
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
  listInvitationsPaged(orgId: string, params: PageQueryParams): Promise<MembershipResult<PagedResult<OrganizationInvitation>>>;
  revokeInvitation(orgId: string, invitationId: string, revokedAt: Date): Promise<MembershipResult<OrganizationInvitation>>;
  acceptInvitation(input: AcceptInvitationInput): Promise<MembershipResult<{ invitation: OrganizationInvitation; member: OrganizationMember; roleAssignment: RoleAssignment }>>;

  createRoleAssignment(input: CreateRoleAssignmentInput): Promise<MembershipResult<RoleAssignment>>;
  listRoleAssignments(orgId: string, subjectId: string): Promise<MembershipResult<RoleAssignment[]>>;
  revokeRoleAssignment(orgId: string, assignmentId: string, revokedAt: Date): Promise<MembershipResult<RoleAssignment>>;
  revokeAllRoleAssignments(orgId: string, subjectId: string, revokedAt: Date): Promise<MembershipResult<RoleAssignment[]>>;
  countActiveOwners(orgId: string): Promise<MembershipResult<number>>;

  /**
   * Counts billable members for an organization for the purposes of the
   * `limit.members` billing entitlement. The count includes:
   *   - active organization members (membership.organization_members.status = 'active'); and
   *   - pending invitations whose `expires_at > now` and that have neither
   *     been accepted nor revoked.
   *
   * Accepted invitations are not counted here because accepting an invitation
   * already inserts an `organization_members` row and the active member is
   * counted via the first clause; counting the accepted invitation again
   * would double-count.
   *
   * Revoked invitations and expired pending invitations are excluded so
   * that revoking or letting an invite expire frees a seat back up.
   *
   * The helper performs the count in a single parameterized SQL statement
   * to avoid paging entire tables for billing decisions.
   */
  countBillableMembers(orgId: string, now: Date): Promise<MembershipResult<number>>;
}
